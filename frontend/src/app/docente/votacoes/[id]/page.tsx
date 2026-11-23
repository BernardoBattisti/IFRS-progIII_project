"use client";

import { useTitulo } from "@/lib/useTitulo";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { formatarDataHora, isoParaLocal, localParaIso } from "@/lib/format";
import type { Votacao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { ErroCarregar } from "@/components/ErroCarregar";
import { EstadoBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkBotao } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Field";
import { Resultados } from "@/components/Resultados";
import { RegrasVotacao } from "@/components/RegrasVotacao";
import { Secao } from "@/components/ui/Card";
import { Tabela, celula } from "@/components/ui/Tabela";
import { Trilha } from "@/components/ui/Trilha";
import styles from "./page.module.css";

export default function Page() {
  return (
    <Suspense fallback={<Carregando />}>
      <VotacaoDocente />
    </Suspense>
  );
}

type Acao = "publicar" | "despublicar" | "encerrar" | "excluir" | "prorrogar" | null;

function VotacaoDocente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [intervalo, setIntervalo] = useState<number | null>(null);
  const { dados: v, setDados, erro, status, carregando, recarregar } = useDados(
    () => api<Votacao>(`/votacoes/${id}`),
    [id],
    intervalo,
  );
  useTitulo(v?.titulo ?? "Votação");
  // Polling: 5 s enquanto aberta; 30 s enquanto agendada (para perceber a abertura).
  const desejado = v?.estado === "ABERTA" ? 5000 : v?.estado === "AGENDADA" ? 30000 : null;
  if (desejado !== intervalo) setIntervalo(desejado);

  const [acao, setAcao] = useState<Acao>(null);
  const [executando, setExecutando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(params.get("salvo") ? "Rascunho salvo." : null);
  const [novoFim, setNovoFim] = useState("");
  const [erroFim, setErroFim] = useState<string | undefined>();

  const opcoes = useMemo(() => (v ? [...v.opcoes].sort((a, b) => a.ordem - b.ordem) : []), [v]);

  function abrir(a: Acao) {
    setErroAcao(null);
    setErroFim(undefined);
    if (a === "prorrogar" && v) setNovoFim(isoParaLocal(v.fim));
    setAcao(a);
  }

  async function executar(a: Exclude<Acao, null>) {
    if (!v) return;
    setExecutando(true);
    setErroAcao(null);
    try {
      if (a === "excluir") {
        await api(`/votacoes/${v.id}`, { method: "DELETE" });
        router.replace("/docente");
        return;
      }
      let corpo: unknown;
      if (a === "prorrogar") {
        const iso = localParaIso(novoFim);
        if (!iso || new Date(iso) <= new Date(v.fim)) {
          setErroFim("Escolha um horário depois do fim atual.");
          setExecutando(false);
          return;
        }
        corpo = { fim: iso };
      }
      const nova = await api<Votacao>(`/votacoes/${v.id}/${a}`, { method: "POST", body: corpo });
      setDados(nova);
      setAcao(null);
      setAviso(
        {
          publicar:
            nova.estado === "ABERTA" ? "Votação publicada e aberta para votos." : `Votação publicada. Ela abre em ${formatarDataHora(nova.inicio)}.`,
          despublicar: "A votação voltou a ser rascunho e não aparece mais para os alunos.",
          encerrar: "Votação encerrada. O resultado agora é final.",
          prorrogar: `Prazo prorrogado até ${formatarDataHora(nova.fim)}.`,
        }[a],
      );
    } catch (e) {
      if (a === "prorrogar" && e instanceof ApiError && e.campos?.fim) setErroFim(e.campos.fim);
      else
        setErroAcao(
          e instanceof ApiError && e.campos ? `${e.message} ${Object.values(e.campos).join(" ")}` : mensagemDeErro(e),
        );
    } finally {
      setExecutando(false);
    }
  }

  const voltar = <Trilha itens={[{ rotulo: "Votações", href: "/docente" }, { rotulo: v?.titulo ?? "Votação" }]} />;

  if (!v) {
    return (
      <>
        {voltar}
        {carregando && <Carregando texto="Carregando votação…" />}
        {erro && <ErroCarregar mensagem={erro} aoTentar={status === 404 || status === 403 ? undefined : recarregar} />}
      </>
    );
  }

  const abreJa = new Date(v.inicio) <= new Date();

  return (
    <>
      <PageHeader
        antes={voltar}
        titulo={v.titulo}
        descricao={
          <div className={styles.meta}>
            <EstadoBadge estado={v.estado} />
            {v.estado === "AGENDADA" && <span>Abre em {formatarDataHora(v.inicio)}</span>}
            {v.estado === "ABERTA" && <span>Encerra em {formatarDataHora(v.fim)}</span>}
            {v.estado === "ENCERRADA" && <span>Encerrou em {formatarDataHora(v.fim)}</span>}
          </div>
        }
        acoes={
          <>
            {v.estado === "RASCUNHO" && (
              <>
                <LinkBotao href={`/docente/votacoes/${v.id}/editar`} variante="secondary">
                  Editar
                </LinkBotao>
                <Button onClick={() => abrir("publicar")}>Publicar</Button>
              </>
            )}
            {v.estado === "AGENDADA" && (
              <Button variante="secondary" onClick={() => abrir("despublicar")}>
                Despublicar
              </Button>
            )}
            {v.estado === "ABERTA" && (
              <>
                <Button variante="secondary" onClick={() => abrir("prorrogar")}>
                  Prorrogar prazo
                </Button>
                <Button variante="danger" onClick={() => abrir("encerrar")}>
                  Encerrar agora
                </Button>
              </>
            )}
          </>
        }
      />

      <div className={styles.pilha}>
        {aviso && (
          <Alert tom="sucesso" anunciar>
            <p>{aviso}</p>
          </Alert>
        )}
        {v.estado === "RASCUNHO" && (
          <Alert tom="info" titulo="Rascunho: invisível para os alunos">
            <p>Revise as regras e as opções. Ao publicar, todos os dados são validados.</p>
          </Alert>
        )}
        {v.estado === "ABERTA" && (
          <Alert tom="info">
            <p>Com a votação aberta, regras e opções ficam travadas. Você pode só prorrogar o prazo ou encerrar.</p>
          </Alert>
        )}

        {v.descricao && <p className={styles.descricao}>{v.descricao}</p>}

        <RegrasVotacao v={v} paraDocente />

        <Secao id="titulo-opcoes" titulo={`Opções (${opcoes.length})`}>
          {opcoes.length === 0 ? (
            <p className={styles.vazio}>Nenhuma opção cadastrada. Edite o rascunho para adicionar pelo menos 2.</p>
          ) : (
            <Tabela legenda="Opções da votação">
              <thead>
                <tr>
                  <th scope="col" className={`${celula.numero} ${styles.colNumero}`}>
                    Nº
                  </th>
                  <th scope="col">Opção</th>
                  <th scope="col">Descrição</th>
                  <th scope="col">Imagem</th>
                </tr>
              </thead>
              <tbody>
                {opcoes.map((o, i) => (
                  <tr key={o.id}>
                    <td data-rotulo="Nº" className={celula.numero}>
                      {i + 1}
                    </td>
                    <td data-rotulo="Opção" className={celula.principal}>
                      {o.titulo || <em className={styles.vazio}>Sem título</em>}
                    </td>
                    <td data-rotulo="Descrição">{o.descricao || "—"}</td>
                    <td data-rotulo="Imagem">
                      {o.imagemUrl ? <img src={o.imagemUrl} alt="" className={styles.miniatura} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </Secao>

        {v.estado !== "RASCUNHO" && v.podeVerResultado && <Resultados votacao={v} />}

        {v.estado === "RASCUNHO" && (
          <Secao
            id="titulo-perigo"
            titulo="Excluir rascunho"
            variante="perigo"
            descricao="Remove o rascunho e todas as opções. Não dá para desfazer."
          >
            <Button variante="danger" tamanho="sm" onClick={() => abrir("excluir")}>
              Excluir rascunho
            </Button>
          </Secao>
        )}
      </div>

      <ConfirmDialog
        aberto={acao === "publicar"}
        aoFechar={() => setAcao(null)}
        aoConfirmar={() => executar("publicar")}
        carregando={executando}
        erro={erroAcao}
        titulo="Publicar votação?"
        rotuloConfirmar="Publicar"
        rotuloCancelar="Continuar editando"
      >
        <p>
          {abreJa
            ? "O início já passou: a votação abre imediatamente para os alunos."
            : `A votação fica agendada e abre para os alunos em ${formatarDataHora(v.inicio)}. Até lá, você ainda pode despublicar.`}
        </p>
        <p>Depois que a votação abrir, as regras e as opções não podem mais ser alteradas.</p>
      </ConfirmDialog>

      <ConfirmDialog
        aberto={acao === "despublicar"}
        aoFechar={() => setAcao(null)}
        aoConfirmar={() => executar("despublicar")}
        carregando={executando}
        erro={erroAcao}
        titulo="Despublicar votação?"
        rotuloConfirmar="Despublicar"
        rotuloCancelar="Manter agendada"
      >
        <p>A votação volta a ser rascunho e deixa de aparecer para os alunos. Você poderá editar e publicar de novo.</p>
      </ConfirmDialog>

      <ConfirmDialog
        aberto={acao === "encerrar"}
        aoFechar={() => setAcao(null)}
        aoConfirmar={() => executar("encerrar")}
        carregando={executando}
        erro={erroAcao}
        variante="danger"
        titulo="Encerrar a votação agora?"
        rotuloConfirmar="Encerrar votação"
        rotuloCancelar="Manter aberta"
      >
        <p>
          Os alunos não poderão mais votar e o resultado atual passa a ser o final.{" "}
          <strong className={styles.escuro}>Não dá para reabrir.</strong>
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        aberto={acao === "excluir"}
        aoFechar={() => setAcao(null)}
        aoConfirmar={() => executar("excluir")}
        carregando={executando}
        erro={erroAcao}
        variante="danger"
        titulo={`Excluir o rascunho “${v.titulo}”?`}
        rotuloConfirmar="Excluir rascunho"
        rotuloCancelar="Manter rascunho"
      >
        <p>O rascunho e todas as opções serão removidos. Não dá para desfazer.</p>
      </ConfirmDialog>

      <Dialog
        aberto={acao === "prorrogar"}
        aoFechar={() => !executando && setAcao(null)}
        titulo="Prorrogar prazo"
        rodape={
          <>
            <Button variante="secondary" onClick={() => setAcao(null)} disabled={executando}>
              Cancelar
            </Button>
            <Button onClick={() => executar("prorrogar")} carregando={executando}>
              Prorrogar
            </Button>
          </>
        }
      >
        <p>Fim atual: {formatarDataHora(v.fim)}. O novo fim precisa ser depois dele.</p>
        <InputField
          rotulo="Novo fim"
          type="datetime-local"
          value={novoFim}
          min={isoParaLocal(v.fim)}
          onChange={(e) => setNovoFim(e.target.value)}
          erro={erroFim}
          obrigatorio
          autoFocus
        />
        {erroAcao && (
          <Alert tom="erro" anunciar>
            <p>{erroAcao}</p>
          </Alert>
        )}
      </Dialog>
    </>
  );
}
