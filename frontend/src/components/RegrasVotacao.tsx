import type { Votacao, Visibilidade } from "@/lib/types";
import { formatarDataHora } from "@/lib/format";

export const ROTULO_VISIBILIDADE: Record<Visibilidade, string> = {
  SEMPRE: "Durante toda a votação",
  APOS_ENCERRAR: "Só depois de encerrada",
  NUNCA: "Não divulgado aos alunos",
};

export function RegrasVotacao({ v, paraDocente = false }: { v: Votacao; paraDocente?: boolean }) {
  const itens: [string, string][] = [
    ["Início", formatarDataHora(v.inicio)],
    ["Fim", formatarDataHora(v.fim)],
    ["Votos por aluno", String(v.votosPorAluno)],
    ["Repetir opção", v.permiteRepetirOpcao ? "Permitido (vários votos na mesma opção)" : "Não (no máximo 1 voto por opção)"],
    ["Tipo", v.anonima ? "Anônima" : "Identificada (mostra quem votou)"],
    ["Resultado para alunos", ROTULO_VISIBILIDADE[v.visibilidadeResultado]],
  ];
  if (paraDocente) {
    itens.push([
      "Quem pode votar",
      v.turmas.length === 0 ? "Todos os alunos ativos" : v.turmas.map((t) => t.nome).join(", "),
    ]);
  }
  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm grid-cols-2">
      {itens.map(([k, val]) => (
        <div key={k} className="min-w-0">
          <dt className="text-ink-muted">{k}</dt>
          <dd className="break-words font-semibold text-ink">{val}</dd>
        </div>
      ))}
    </dl>
  );
}
