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
import { VotacaoItem } from "@/components/VotacaoLista";
import { cx } from "@/components/ui/cx";

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
          <div role="group" aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
            {FILTROS.map((f) => {
              const n = f.valor === "TODAS" ? dados.length : dados.filter((v) => v.estado === f.valor).length;
              return (
                <button
                  key={f.valor}
                  type="button"
                  aria-pressed={filtro === f.valor}
                  onClick={() => setFiltro(f.valor)}
                  className={cx(
                    "min-h-11 rounded-full border px-3 text-sm font-semibold sm:min-h-9",
                    filtro === f.valor
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line-strong bg-surface text-ink hover:bg-brand-50",
                  )}
                >
                  {f.rotulo} ({n})
                </button>
              );
            })}
          </div>
          {lista.length === 0 ? (
            <p className="text-ink-muted">Nenhuma votação neste estado.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {lista.map((v) => (
                <VotacaoItem key={v.id} v={v} href={`/docente/votacoes/${v.id}`} nivel="h2" />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
