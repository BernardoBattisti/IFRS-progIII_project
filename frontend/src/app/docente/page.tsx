"use client";

import { useTitulo } from "@/lib/useTitulo";
import { useState } from "react";
import { api } from "@/lib/api";
import type { EstadoVotacao, Votacao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkBotao } from "@/components/ui/Button";
import { ErroCarregar } from "@/components/ErroCarregar";
import { TabelaVotacoes } from "@/components/VotacaoLista";
import styles from "./page.module.css";

const FILTROS: { valor: EstadoVotacao | "TODAS"; rotulo: string }[] = [
  { valor: "TODAS", rotulo: "Todas" },
  { valor: "RASCUNHO", rotulo: "Rascunhos" },
  { valor: "AGENDADA", rotulo: "Agendadas" },
  { valor: "ABERTA", rotulo: "Abertas" },
  { valor: "ENCERRADA", rotulo: "Encerradas" },
];

const ORDEM: Record<EstadoVotacao, number> = { ABERTA: 0, AGENDADA: 1, RASCUNHO: 2, ENCERRADA: 3 };

export default function VotacoesDocente() {
  useTitulo("Minhas votações");
  const { dados, erro, carregando, recarregar } = useDados(() => api<Votacao[]>("/votacoes"), []);
  const [filtro, setFiltro] = useState<EstadoVotacao | "TODAS">("TODAS");

  const lista = (dados ?? [])
    .filter((v) => filtro === "TODAS" || v.estado === filtro)
    .sort((a, b) => ORDEM[a.estado] - ORDEM[b.estado] || Date.parse(b.inicio) - Date.parse(a.inicio));

  return (
    <>
      <PageHeader
        titulo="Minhas votações"
        descricao="Crie, publique e acompanhe os resultados das suas votações."
        acoes={<LinkBotao href="/docente/votacoes/nova">+ Nova votação</LinkBotao>}
      />
      {carregando && <Carregando texto="Carregando votações…" />}
      {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {dados && dados.length === 0 && (
        <EmptyState
          titulo="Você ainda não criou votações"
          acao={<LinkBotao href="/docente/votacoes/nova">Criar primeira votação</LinkBotao>}
        >
          Monte a votação como rascunho, revise com calma e publique quando estiver pronta.
        </EmptyState>
      )}
      {dados && dados.length > 0 && (
        <>
          <div role="group" aria-label="Filtrar por estado" className={styles.filtros}>
            <span className={styles.rotuloFiltro} aria-hidden="true">
              Mostrar:
            </span>
            {FILTROS.map((f) => {
              const n = f.valor === "TODAS" ? dados.length : dados.filter((v) => v.estado === f.valor).length;
              return (
                <button
                  key={f.valor}
                  type="button"
                  aria-pressed={filtro === f.valor}
                  onClick={() => setFiltro(f.valor)}
                  className={styles.filtro}
                >
                  {f.rotulo} ({n})
                </button>
              );
            })}
          </div>
          {lista.length === 0 ? (
            <p className={styles.vazio}>Nenhuma votação neste estado.</p>
          ) : (
            <TabelaVotacoes
              legenda="Minhas votações"
              lista={lista}
              hrefDe={(v) => `/docente/votacoes/${v.id}`}
              acaoDe={() => ({ rotulo: "Gerenciar" })}
              extra={{
                titulo: "Quem vota",
                valor: (v) => (v.turmas.length === 0 ? "Todos os alunos ativos" : v.turmas.map((t) => t.nome).join(", ")),
              }}
            />
          )}
        </>
      )}
    </>
  );
}
