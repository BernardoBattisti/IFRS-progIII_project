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
import { VotacaoItem } from "@/components/VotacaoLista";
import { Badge } from "@/components/ui/Badge";

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
        <div className="space-y-8">
          {GRUPOS.map((g) => {
            const lista = dados
              .filter((v) => v.estado === g.estado)
              .sort((a, b) =>
                g.estado === "ENCERRADA" ? Date.parse(b.fim) - Date.parse(a.fim) : Date.parse(a.fim) - Date.parse(b.fim),
              );
            return (
              <section key={g.estado} aria-labelledby={`grupo-${g.estado}`} className="space-y-3">
                <h2 id={`grupo-${g.estado}`} className="text-lg font-bold">
                  {g.titulo} <span className="font-normal text-ink-muted">({lista.length})</span>
                </h2>
                {lista.length === 0 ? (
                  <p className="text-sm text-ink-muted">{g.vazio}</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {lista.map((v) => (
                      <VotacaoItem
                        key={v.id}
                        v={v}
                        href={`/aluno/votacoes/${v.id}`}
                        extra={
                          v.estado === "ABERTA" && v.votosRestantes !== null ? (
                            <>
                              <span aria-hidden="true">·</span>
                              {v.votosRestantes > 0 ? (
                                <Badge tom="sucesso">
                                  {plural(v.votosRestantes, "voto restante", "votos restantes")}
                                </Badge>
                              ) : (
                                <span>Você já usou todos os votos</span>
                              )}
                            </>
                          ) : null
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
