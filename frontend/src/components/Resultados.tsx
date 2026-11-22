"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatarPercentual, plural } from "@/lib/format";
import type { Resultado, Votacao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { Carregando } from "./ui/Spinner";
import { ErroCarregar } from "./ErroCarregar";
import { EmptyState } from "./ui/EmptyState";

/**
 * Resultados em barras horizontais (HTML/CSS). Rótulo, contagem e percentual
 * aparecem sempre em texto; a barra é só reforço visual.
 * Faz polling de 5 s enquanto a votação está ABERTA.
 */
export function Resultados({ votacao }: { votacao: Votacao }) {
  const aberta = votacao.estado === "ABERTA";
  const { dados, erro, carregando, recarregar } = useDados(
    () => api<Resultado>(`/votacoes/${votacao.id}/resultados`),
    [votacao.id, votacao.estado],
    aberta ? 5000 : null,
  );

  return (
    <section aria-labelledby="titulo-resultados" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-resultados" className="text-xl font-bold">
          {votacao.estado === "ENCERRADA" ? "Resultado final" : "Resultado parcial"}
        </h2>
        {aberta && (
          <p className="text-sm text-ink-muted">Atualiza automaticamente a cada 5 segundos.</p>
        )}
      </div>
      {carregando && !dados && <Carregando texto="Carregando resultados…" />}
      {erro && !dados && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {dados && <Barras resultado={dados} anonima={votacao.anonima} />}
    </section>
  );
}

function Barras({ resultado, anonima }: { resultado: Resultado; anonima: boolean }) {
  const maior = Math.max(0, ...resultado.opcoes.map((o) => o.votos));
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-control)] border border-line bg-surface p-3">
          <dt className="text-sm text-ink-muted">Votos registrados</dt>
          <dd className="text-2xl font-bold tabular-nums">{resultado.totalVotos}</dd>
        </div>
        <div className="rounded-[var(--radius-control)] border border-line bg-surface p-3">
          <dt className="text-sm text-ink-muted">Participantes</dt>
          <dd className="text-2xl font-bold tabular-nums">{resultado.totalParticipantes}</dd>
        </div>
      </dl>

      {resultado.totalVotos === 0 && (
        <EmptyState titulo="Nenhum voto ainda">Os resultados aparecem aqui assim que os primeiros votos chegarem.</EmptyState>
      )}

      <ol className="space-y-3">
        {resultado.opcoes.map((o) => (
          <li key={o.opcaoId} className="rounded-[var(--radius-control)] border border-line bg-surface p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 break-words font-semibold">
                {o.titulo}
                {maior > 0 && o.votos === maior && (
                  <span className="ml-2 align-middle text-xs font-semibold text-brand-700">· Mais votada</span>
                )}
              </span>
              <span className="tabular-nums text-ink">
                <strong>{formatarPercentual(o.percentual)}</strong>
                <span className="text-ink-muted"> · {plural(o.votos, "voto", "votos")}</span>
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-track" aria-hidden="true">
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, o.percentual))}%` }}
              />
            </div>
            {!anonima && o.votantes && <Votantes votantes={o.votantes} />}
          </li>
        ))}
      </ol>
      {anonima && (
        <p className="text-sm text-ink-muted">Votação anônima: só os totais são exibidos.</p>
      )}
    </div>
  );
}

function Votantes({ votantes }: { votantes: NonNullable<Resultado["opcoes"][number]["votantes"]> }) {
  const [aberto, setAberto] = useState(false);
  if (votantes.length === 0) return null;
  return (
    <details className="mt-2" open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-brand-700">
        {aberto ? "Ocultar" : "Ver"} quem votou ({votantes.length})
      </summary>
      <ul className="mt-2 divide-y divide-line text-sm">
        {votantes.map((v) => (
          <li key={v.matricula + v.nome} className="flex flex-wrap justify-between gap-x-3 py-1.5">
            <span className="min-w-0 break-words">
              {v.nome} <span className="text-ink-muted">· {v.matricula}</span>
            </span>
            <span className="tabular-nums text-ink-muted">{plural(v.quantidade, "voto", "votos")}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
