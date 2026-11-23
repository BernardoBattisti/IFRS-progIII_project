"use client";

import { useTitulo } from "@/lib/useTitulo";
import { api } from "@/lib/api";
import type { EstadoVotacao, Votacao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { plural } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkBotao } from "@/components/ui/Button";
import { ErroCarregar } from "@/components/ErroCarregar";
import { TabelaVotacoes } from "@/components/VotacaoLista";
import styles from "./page.module.css";

const GRUPOS: { estado: EstadoVotacao; titulo: string; vazio: string }[] = [
  { estado: "ABERTA", titulo: "Abertas", vazio: "Nenhuma votação aberta agora." },
  { estado: "AGENDADA", titulo: "Agendadas", vazio: "Nenhuma votação agendada." },
  { estado: "ENCERRADA", titulo: "Encerradas", vazio: "Nenhuma votação encerrada ainda." },
];

export default function VotacoesAluno() {
  useTitulo("Votações");
  const { dados, erro, carregando, recarregar } = useDados(() => api<Votacao[]>("/votacoes"), []);

  return (
    <>
      <PageHeader titulo="Votações" descricao="Votações das suas turmas e as abertas a todos os alunos." />
      {carregando && <Carregando texto="Carregando votações…" />}
      {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {dados && dados.length === 0 && (
        <EmptyState
          titulo="Nenhuma votação para você ainda"
          acao={
            <LinkBotao href="/aluno/turmas" variante="secondary">
              Entrar em uma turma
            </LinkBotao>
          }
        >
          Quando um docente publicar uma votação para você ou para suas turmas, ela aparece aqui. Se você
          recebeu um código de turma, use-o para entrar.
        </EmptyState>
      )}
      {dados && dados.length > 0 && (
        <div className={styles.grupos}>
          {GRUPOS.map((g) => {
            const lista = dados
              .filter((v) => v.estado === g.estado)
              .sort((a, b) =>
                g.estado === "ENCERRADA" ? Date.parse(b.fim) - Date.parse(a.fim) : Date.parse(a.fim) - Date.parse(b.fim),
              );
            return (
              <section key={g.estado} aria-labelledby={`grupo-${g.estado}`}>
                <h2 id={`grupo-${g.estado}`} className={styles.tituloGrupo}>
                  {g.titulo} <span className={styles.qtd}>({lista.length})</span>
                </h2>
                {lista.length === 0 ? (
                  <p className={styles.vazio}>{g.vazio}</p>
                ) : (
                  <TabelaVotacoes
                    legenda={`Votações ${g.titulo.toLowerCase()}`}
                    lista={lista}
                    hrefDe={(v) => `/aluno/votacoes/${v.id}`}
                    acaoDe={(v) =>
                      v.estado === "ABERTA" && (v.votosRestantes ?? 0) > 0
                        ? { rotulo: "Votar", variante: "primary" }
                        : v.podeVerResultado
                          ? { rotulo: "Ver resultado" }
                          : { rotulo: "Ver detalhes" }
                    }
                    extra={
                      g.estado === "ABERTA"
                        ? {
                            titulo: "Seus votos",
                            valor: (v) =>
                              v.votosRestantes === null
                                ? "—"
                                : v.votosRestantes > 0
                                  ? plural(v.votosRestantes, "voto restante", "votos restantes")
                                  : "Você já usou todos os votos",
                          }
                        : undefined
                    }
                  />
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
