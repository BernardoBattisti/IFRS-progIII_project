import Link from "next/link";
import type { Votacao } from "@/lib/types";
import { formatarDataHora, plural } from "@/lib/format";
import { EstadoBadge } from "./ui/Badge";

export function periodo(v: Votacao) {
  return `${formatarDataHora(v.inicio)} até ${formatarDataHora(v.fim)}`;
}

export function VotacaoItem({
  v,
  href,
  extra,
  nivel = "h3",
}: {
  v: Votacao;
  href: string;
  extra?: React.ReactNode;
  nivel?: "h2" | "h3";
}) {
  const Titulo = nivel;
  return (
    <li>
      <Link
        href={href}
        className="block rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-brand-500"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Titulo className="min-w-0 break-words text-lg font-semibold text-ink">{v.titulo}</Titulo>
          <EstadoBadge estado={v.estado} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {v.estado === "AGENDADA" ? "Abre em " + formatarDataHora(v.inicio) : null}
          {v.estado === "ABERTA" ? "Encerra em " + formatarDataHora(v.fim) : null}
          {v.estado === "ENCERRADA" ? "Encerrou em " + formatarDataHora(v.fim) : null}
          {v.estado === "RASCUNHO" ? periodo(v) : null}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span>{plural(v.opcoes.length, "opção", "opções")}</span>
          <span aria-hidden="true">·</span>
          <span>{v.anonima ? "Anônima" : "Identificada"}</span>
          {extra}
        </p>
      </Link>
    </li>
  );
}
