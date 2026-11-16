"use client";

import { useTitulo } from "@/lib/useTitulo";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api, mensagemDeErro } from "@/lib/api";
import { formatarDataHora, plural } from "@/lib/format";
import type { Opcao, Votacao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { ErroCarregar } from "@/components/ErroCarregar";
import { EstadoBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Resultados } from "@/components/Resultados";
import { RegrasVotacao } from "@/components/RegrasVotacao";
import { cx } from "@/components/ui/cx";

type Selecao = Record<number, number>;

export default function VotacaoAluno() {
  const { id } = useParams<{ id: string }>();
  const { dados: v, setDados, erro, status, carregando, recarregar } = useDados(
    () => api<Votacao>(`/votacoes/${id}`),
    [id],
    // Mantém estado/votos restantes atualizados (ex.: abertura ou encerramento pelo docente).
    30000,
  );
  useTitulo(v?.titulo ?? "Votação");

  return (
    <>
      <Link href="/aluno" className="mb-4 inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline">
        <span aria-hidden="true">←&nbsp;</span>Voltar para votações
      </Link>
      {carregando && !v && <Carregando texto="Carregando votação…" />}
      {erro && !v && (
        <ErroCarregar mensagem={erro} aoTentar={status === 404 || status === 403 ? undefined : recarregar} />
      )}
      {v && <Conteudo v={v} aoAtualizar={setDados} />}
    </>
  );
}

function Conteudo({ v, aoAtualizar }: { v: Votacao; aoAtualizar: (v: Votacao) => void }) {
  const restantes = v.votosRestantes ?? 0;
  const usados = v.votosUsados ?? 0;
  const opcoes = useMemo(() => [...v.opcoes].sort((a, b) => a.ordem - b.ordem), [v.opcoes]);
  const [enviado, setEnviado] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        titulo={v.titulo}
        descricao={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <EstadoBadge estado={v.estado} />
            <span>Criada por {v.docente.nome}</span>
          </div>
        }
      />
      <div className="space-y-6">
        {v.descricao && <p className="max-w-prose whitespace-pre-line break-words">{v.descricao}</p>}

        <RegrasVotacao v={v} />

        <AvisoAnonimato anonima={v.anonima} />

        {v.estado === "AGENDADA" && (
          <Alert tom="info" titulo={`A votação abre em ${formatarDataHora(v.inicio)}`}>
            <p>Você poderá votar a partir desse horário. Até lá, confira as opções abaixo.</p>
          </Alert>
        )}
        {v.estado === "ENCERRADA" && (
          <Alert tom="info" titulo={`Votação encerrada em ${formatarDataHora(v.fim)}`}>
            <p>
              {usados > 0
                ? `Você participou com ${plural(usados, "voto", "votos")}.`
                : "Você não votou nesta votação."}
            </p>
          </Alert>
        )}

        {enviado && (
          <Alert tom="sucesso" titulo="Votos enviados" anunciar>
            <p>{enviado}</p>
          </Alert>
        )}

        {v.estado === "ABERTA" && restantes === 0 && !enviado && (
          <Alert tom="sucesso" titulo="Você já usou todos os seus votos">
            <p>Obrigado por participar! Votos enviados são finais.</p>
          </Alert>
        )}

        {v.estado === "ABERTA" && restantes > 0 ? (
          <FormularioVoto
            v={v}
            opcoes={opcoes}
            aoEnviar={(nova, qtd) => {
              aoAtualizar(nova);
              const r = nova.votosRestantes ?? 0;
              setEnviado(
                `${plural(qtd, "voto registrado", "votos registrados")}. ` +
                  (r > 0 ? `Você ainda tem ${plural(r, "voto", "votos")} para usar até ${formatarDataHora(nova.fim)}.` : "Você usou todos os seus votos."),
              );
            }}
          />
        ) : (
          <ListaOpcoes opcoes={opcoes} v={v} />
        )}

        <MeusVotos v={v} opcoes={opcoes} />

        {v.podeVerResultado ? (
          <Resultados votacao={v} />
        ) : (
          v.estado !== "AGENDADA" && (
            <p className="rounded-[var(--radius-control)] border border-line bg-surface p-3 text-sm text-ink-muted">
              {v.visibilidadeResultado === "NUNCA"
                ? "O docente optou por não divulgar o resultado desta votação aos alunos."
                : "O resultado aparece aqui quando a votação encerrar."}
            </p>
          )
        )}
      </div>
    </>
  );
}

function AvisoAnonimato({ anonima }: { anonima: boolean }) {
  return anonima ? (
    <Alert tom="info" titulo="Votação anônima">
      <p>
        Ninguém, nem o docente, verá em quais opções você votou. Por isso, depois de enviar, você também não
        conseguirá consultar suas escolhas — só quantos votos já usou.
      </p>
    </Alert>
  ) : (
    <Alert tom="aviso" titulo="Votação identificada: seu voto não é secreto">
      <p>
        Quem puder ver o resultado verá seu <strong>nome</strong>, sua <strong>matrícula</strong> e em quais opções
        você votou.
      </p>
    </Alert>
  );
}

function ImagemOpcao({ o }: { o: Opcao }) {
  if (!o.imagemUrl) return null;
  // O contrato não tem texto alternativo para a imagem; o título da opção está ao lado.
  return (
    <img
      src={o.imagemUrl}
      alt=""
      loading="lazy"
      className="aspect-video w-full rounded-[var(--radius-control)] border border-line bg-track object-cover"
    />
  );
}

function ListaOpcoes({ opcoes, v }: { opcoes: Opcao[]; v: Votacao }) {
  const meus = new Map((v.meusVotos ?? []).map((m) => [m.opcaoId, m.quantidade]));
  return (
    <section aria-labelledby="titulo-opcoes" className="space-y-3">
      <h2 id="titulo-opcoes" className="text-xl font-bold">
        Opções
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {opcoes.map((o) => (
          <li key={o.id} className="space-y-2 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <ImagemOpcao o={o} />
            <p className="break-words font-semibold">{o.titulo}</p>
            {o.descricao && <p className="break-words text-sm text-ink-muted">{o.descricao}</p>}
            {meus.get(o.id) ? (
              <p className="text-sm font-semibold text-brand-700">
                <span aria-hidden="true">✓ </span>Você deu {plural(meus.get(o.id)!, "voto", "votos")} nesta opção
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MeusVotos({ v, opcoes }: { v: Votacao; opcoes: Opcao[] }) {
  const usados = v.votosUsados ?? 0;
  if (usados === 0) return null;
  if (v.anonima || v.meusVotos === null) {
    return (
      <p className="text-sm text-ink-muted">
        Você usou {plural(usados, "voto", "votos")}. Como a votação é anônima, não é possível mostrar em quais opções.
      </p>
    );
  }
  if (v.meusVotos.length === 0) return null;
  const titulo = (id: number) => opcoes.find((o) => o.id === id)?.titulo ?? "Opção";
  return (
    <section aria-labelledby="titulo-meus" className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <h2 id="titulo-meus" className="font-bold">
        Meus votos
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {v.meusVotos.map((m) => (
          <li key={m.opcaoId} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">{titulo(m.opcaoId)}</span>
            <span className="tabular-nums text-ink-muted">{plural(m.quantidade, "voto", "votos")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FormularioVoto({
  v,
  opcoes,
  aoEnviar,
}: {
  v: Votacao;
  opcoes: Opcao[];
  aoEnviar: (v: Votacao, quantidade: number) => void;
}) {
  const restantes = v.votosRestantes ?? 0;
  const usados = v.votosUsados ?? 0;
  const [selecao, setSelecao] = useState<Selecao>({});
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Opções em que o aluno já votou (só conhecidas em votação identificada).
  const jaVotadas = new Set((v.meusVotos ?? []).map((m) => m.opcaoId));
  const total = Object.values(selecao).reduce((a, b) => a + b, 0);
  const sobra = restantes - total;
  const itens = opcoes.filter((o) => (selecao[o.id] ?? 0) > 0);

  function definir(opcaoId: number, qtd: number) {
    setSelecao((s) => {
      const n = { ...s };
      if (qtd <= 0) delete n[opcaoId];
      else n[opcaoId] = qtd;
      return n;
    });
  }

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      const nova = await api<Votacao>(`/votacoes/${v.id}/votos`, {
        method: "POST",
        body: { votos: itens.map((o) => ({ opcaoId: o.id, quantidade: selecao[o.id] })) },
      });
      setConfirmando(false);
      setSelecao({});
      aoEnviar(nova, total);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-votar" className="space-y-4">
      <div className="space-y-1">
        <h2 id="titulo-votar" className="text-xl font-bold">
          Escolha suas opções
        </h2>
        <p className="text-ink-muted">
          {v.permiteRepetirOpcao
            ? "Distribua seus votos como quiser: você pode dar mais de um voto na mesma opção."
            : "Marque as opções em que quer votar: no máximo 1 voto por opção."}{" "}
          Você pode enviar agora só parte dos votos e usar o restante depois, enquanto a votação estiver aberta.
        </p>
      </div>

      <ContadorVotos usados={usados} total={v.votosPorAluno} selecionados={total} />

      <ul className="grid gap-3 sm:grid-cols-2">
        {opcoes.map((o) => {
          const qtd = selecao[o.id] ?? 0;
          if (!v.permiteRepetirOpcao) {
            const jaVotou = jaVotadas.has(o.id);
            const bloqueada = jaVotou || (qtd === 0 && sobra <= 0);
            return (
              <li key={o.id}>
                <label
                  className={cx(
                    "flex h-full flex-col gap-2 rounded-[var(--radius-card)] border bg-surface p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-700",
                    qtd > 0 ? "border-2 border-brand-600 bg-brand-50" : "border-line-strong",
                    bloqueada ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-brand-600",
                  )}
                >
                  <ImagemOpcao o={o} />
                  <span className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 shrink-0 accent-brand-600 focus-visible:outline-none"
                      checked={qtd > 0}
                      disabled={bloqueada}
                      onChange={(e) => definir(o.id, e.target.checked ? 1 : 0)}
                      aria-describedby={o.descricao || jaVotou ? `opcao-${o.id}-info` : undefined}
                    />
                    <span className="min-w-0">
                      <span className="block break-words font-semibold">{o.titulo}</span>
                      <span id={`opcao-${o.id}-info`} className="block text-sm text-ink-muted">
                        {o.descricao && <span className="block break-words">{o.descricao}</span>}
                        {jaVotou && <span className="block font-semibold text-brand-700"><span aria-hidden="true">✓ </span>Você já votou nesta opção</span>}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            );
          }
          const max = qtd + sobra;
          return (
            <li
              key={o.id}
              className={cx(
                "flex h-full flex-col gap-3 rounded-[var(--radius-card)] border bg-surface p-4",
                qtd > 0 ? "border-2 border-brand-600 bg-brand-50" : "border-line-strong",
              )}
            >
              <ImagemOpcao o={o} />
              <div className="min-w-0">
                <p id={`opcao-${o.id}-titulo`} className="break-words font-semibold">
                  {o.titulo}
                </p>
                {o.descricao && <p className="break-words text-sm text-ink-muted">{o.descricao}</p>}
                {v.meusVotos?.find((m) => m.opcaoId === o.id) && (
                  <p className="text-sm font-semibold text-brand-700">
                    <span aria-hidden="true">✓ </span>Já enviados: {plural(v.meusVotos.find((m) => m.opcaoId === o.id)!.quantidade, "voto", "votos")}
                  </p>
                )}
              </div>
              <div
                role="group"
                aria-labelledby={`opcao-${o.id}-titulo`}
                className="mt-auto flex items-center gap-3"
              >
                <Button
                  variante="secondary"
                  className="w-11 px-0 text-xl"
                  aria-label={`Tirar um voto de ${o.titulo}`}
                  disabled={qtd === 0}
                  onClick={() => definir(o.id, qtd - 1)}
                >
                  −
                </Button>
                <span className="min-w-20 text-center tabular-nums" aria-live="polite">
                  <strong className="text-lg">{qtd}</strong> {qtd === 1 ? "voto" : "votos"}
                </span>
                <Button
                  variante="secondary"
                  className="w-11 px-0 text-xl"
                  aria-label={`Adicionar um voto em ${o.titulo}`}
                  disabled={qtd >= max}
                  onClick={() => definir(o.id, qtd + 1)}
                >
                  +
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-[var(--radius-card)] sm:border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" aria-live="polite">
            <strong>{plural(total, "voto selecionado", "votos selecionados")}</strong>
            <span className="text-ink-muted"> de {restantes} disponíveis</span>
          </p>
          <Button
            disabled={total === 0}
            onClick={() => {
              setErro(null);
              setConfirmando(true);
            }}
            className="w-full sm:w-auto"
          >
            Revisar e enviar
          </Button>
        </div>
      </div>

      <ConfirmDialog
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        aoConfirmar={enviar}
        carregando={enviando}
        erro={erro}
        titulo={`Enviar ${plural(total, "voto", "votos")}?`}
        rotuloConfirmar="Confirmar e enviar"
        rotuloCancelar="Voltar e revisar"
      >
        <ul className="space-y-1 rounded-[var(--radius-control)] border border-line p-3 text-ink">
          {itens.map((o) => (
            <li key={o.id} className="flex justify-between gap-3">
              <span className="min-w-0 break-words">{o.titulo}</span>
              <span className="tabular-nums">{plural(selecao[o.id], "voto", "votos")}</span>
            </li>
          ))}
        </ul>
        <p>
          <strong className="text-ink">Votos enviados são finais:</strong> não dá para alterar nem retirar depois.
        </p>
        <p>
          {v.anonima
            ? "A votação é anônima: ninguém verá em quais opções você votou."
            : "A votação é identificada: quem puder ver o resultado verá seu nome e suas escolhas."}
        </p>
        {sobra > 0 && <p>Depois deste envio, você ainda terá {plural(sobra, "voto", "votos")}.</p>}
      </ConfirmDialog>
    </section>
  );
}

function ContadorVotos({ usados, total, selecionados }: { usados: number; total: number; selecionados: number }) {
  const restantes = Math.max(0, total - usados);
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <p className="font-semibold">
        Você tem {plural(restantes, "voto restante", "votos restantes")}{" "}
        <span className="font-normal text-ink-muted">
          (já usou {usados} de {total})
        </span>
      </p>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: Math.min(total, 40) }).map((_, i) => (
          <span
            key={i}
            className={cx(
              "h-2.5 flex-1 rounded-full",
              i < usados ? "bg-ink-muted" : i < usados + selecionados ? "bg-brand-600" : "bg-track",
            )}
          />
        ))}
      </div>
    </div>
  );
}
