"use client";

import { useTitulo } from "@/lib/useTitulo";
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
import { Trilha } from "@/components/ui/Trilha";
import { Secao } from "@/components/ui/Card";
import { classesEscolha as esc } from "@/components/ui/Field";
import styles from "./page.module.css";

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
      {!v && <Trilha itens={[{ rotulo: "Votações", href: "/aluno" }, { rotulo: "Votação" }]} />}
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
        antes={<Trilha itens={[{ rotulo: "Votações", href: "/aluno" }, { rotulo: v.titulo }]} />}
        titulo={v.titulo}
        descricao={
          <div className={styles.meta}>
            <EstadoBadge estado={v.estado} />
            <span>Criada por {v.docente.nome}</span>
          </div>
        }
      />
      <div className={styles.pilha}>
        {v.descricao && <p className={styles.descricao}>{v.descricao}</p>}

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
            <p className={styles.semResultado}>
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
      className={styles.imagem}
    />
  );
}

function ListaOpcoes({ opcoes, v }: { opcoes: Opcao[]; v: Votacao }) {
  const meus = new Map((v.meusVotos ?? []).map((m) => [m.opcaoId, m.quantidade]));
  return (
    <Secao id="titulo-opcoes" titulo="Opções">
      <ol className={styles.opcoes}>
        {opcoes.map((o) => (
          <li key={o.id} className={styles.opcao}>
            <div className={styles.opcaoTexto}>
              <p className={styles.opcaoTitulo}>{o.titulo}</p>
              {o.descricao && <p className={styles.opcaoDescricao}>{o.descricao}</p>}
              {meus.get(o.id) ? (
                <p className={styles.jaVotou}>
                  <span aria-hidden="true">✓ </span>Você deu {plural(meus.get(o.id)!, "voto", "votos")} nesta opção
                </p>
              ) : null}
            </div>
            <ImagemOpcao o={o} />
          </li>
        ))}
      </ol>
    </Secao>
  );
}

function MeusVotos({ v, opcoes }: { v: Votacao; opcoes: Opcao[] }) {
  const usados = v.votosUsados ?? 0;
  if (usados === 0) return null;
  if (v.anonima || v.meusVotos === null) {
    return (
      <p className={styles.nota}>
        Você usou {plural(usados, "voto", "votos")}. Como a votação é anônima, não é possível mostrar em quais opções.
      </p>
    );
  }
  if (v.meusVotos.length === 0) return null;
  const titulo = (id: number) => opcoes.find((o) => o.id === id)?.titulo ?? "Opção";
  return (
    <Secao id="titulo-meus" titulo="Meus votos">
      <ul className={styles.resumo}>
        {v.meusVotos.map((m) => (
          <li key={m.opcaoId}>
            <span>{titulo(m.opcaoId)}</span>
            <span className={styles.qtd}>{plural(m.quantidade, "voto", "votos")}</span>
          </li>
        ))}
      </ul>
    </Secao>
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
    <Secao
      id="titulo-votar"
      titulo="Escolha suas opções"
      descricao={
        <p>
          {v.permiteRepetirOpcao
            ? "Distribua seus votos como quiser: você pode dar mais de um voto na mesma opção."
            : "Marque as opções em que quer votar: no máximo 1 voto por opção."}{" "}
          Você pode enviar agora só parte dos votos e usar o restante depois, enquanto a votação estiver aberta.
        </p>
      }
    >
      <ContadorVotos usados={usados} total={v.votosPorAluno} selecionados={total} />

      <ul className={styles.cedula}>
        {opcoes.map((o) => {
          const qtd = selecao[o.id] ?? 0;
          if (!v.permiteRepetirOpcao) {
            const jaVotou = jaVotadas.has(o.id);
            const bloqueada = jaVotou || (qtd === 0 && sobra <= 0);
            return (
              <li key={o.id}>
                <label className={cx(esc.item, styles.linhaCedula, qtd > 0 && esc.marcado, bloqueada && esc.bloqueado)}>
                  <input
                    type="checkbox"
                    className={esc.controle}
                    checked={qtd > 0}
                    disabled={bloqueada}
                    onChange={(e) => definir(o.id, e.target.checked ? 1 : 0)}
                    aria-describedby={o.descricao || jaVotou ? `opcao-${o.id}-info` : undefined}
                  />
                  <span className={styles.opcaoTexto}>
                    <span className={styles.opcaoTitulo}>{o.titulo}</span>
                    <span id={`opcao-${o.id}-info`} className={styles.opcaoDescricao}>
                      {o.descricao && <span className={styles.bloco}>{o.descricao}</span>}
                      {jaVotou && (
                        <span className={styles.jaVotou}>
                          <span aria-hidden="true">✓ </span>Você já votou nesta opção
                        </span>
                      )}
                    </span>
                  </span>
                  <ImagemOpcao o={o} />
                </label>
              </li>
            );
          }
          const max = qtd + sobra;
          const enviados = v.meusVotos?.find((m) => m.opcaoId === o.id);
          return (
            <li key={o.id} className={cx(esc.item, styles.linhaCedula, styles.linhaContador, qtd > 0 && esc.marcado)}>
              <div className={styles.opcaoTexto}>
                <p id={`opcao-${o.id}-titulo`} className={styles.opcaoTitulo}>
                  {o.titulo}
                </p>
                {o.descricao && <p className={styles.opcaoDescricao}>{o.descricao}</p>}
                {enviados && (
                  <p className={styles.jaVotou}>
                    <span aria-hidden="true">✓ </span>Já enviados: {plural(enviados.quantidade, "voto", "votos")}
                  </p>
                )}
              </div>
              <ImagemOpcao o={o} />
              <div role="group" aria-labelledby={`opcao-${o.id}-titulo`} className={styles.contador}>
                <Button
                  variante="secondary"
                  className={styles.passo}
                  aria-label={`Tirar um voto de ${o.titulo}`}
                  disabled={qtd === 0}
                  onClick={() => definir(o.id, qtd - 1)}
                >
                  −
                </Button>
                <span className={styles.valor} aria-live="polite">
                  <strong>{qtd}</strong> {qtd === 1 ? "voto" : "votos"}
                </span>
                <Button
                  variante="secondary"
                  className={styles.passo}
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

      <div className={styles.envio}>
        <p aria-live="polite">
          <strong>{plural(total, "voto selecionado", "votos selecionados")}</strong>
          <span className={styles.cinza}> de {restantes} disponíveis</span>
        </p>
        <Button
          disabled={total === 0}
          onClick={() => {
            setErro(null);
            setConfirmando(true);
          }}
          className={styles.botaoEnvio}
        >
          Revisar e enviar
        </Button>
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
        <table className={styles.confirmacao}>
          <caption className="sr-only">Votos a enviar</caption>
          <thead>
            <tr>
              <th scope="col">Opção</th>
              <th scope="col">Votos</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((o) => (
              <tr key={o.id}>
                <td>{o.titulo}</td>
                <td>{plural(selecao[o.id], "voto", "votos")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong className={styles.escuro}>Votos enviados são finais:</strong> não dá para alterar nem retirar depois.
        </p>
        <p>
          {v.anonima
            ? "A votação é anônima: ninguém verá em quais opções você votou."
            : "A votação é identificada: quem puder ver o resultado verá seu nome e suas escolhas."}
        </p>
        {sobra > 0 && <p>Depois deste envio, você ainda terá {plural(sobra, "voto", "votos")}.</p>}
      </ConfirmDialog>
    </Secao>
  );
}

function ContadorVotos({ usados, total, selecionados }: { usados: number; total: number; selecionados: number }) {
  const restantes = Math.max(0, total - usados);
  return (
    <div className={styles.saldo}>
      <p>
        <strong>Você tem {plural(restantes, "voto restante", "votos restantes")}</strong>{" "}
        <span className={styles.cinza}>
          (já usou {usados} de {total})
        </span>
      </p>
      <div className={styles.casas} aria-hidden="true">
        {Array.from({ length: Math.min(total, 40) }).map((_, i) => (
          <span
            key={i}
            className={cx(styles.casa, i < usados ? styles.usada : i < usados + selecionados ? styles.selecionada : undefined)}
          />
        ))}
      </div>
    </div>
  );
}
