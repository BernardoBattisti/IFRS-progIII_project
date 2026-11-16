import type { ReactNode } from "react";

export function EmptyState({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface px-4 py-10 text-center">
      <p className="text-base font-semibold text-ink">{titulo}</p>
      {children && <div className="mx-auto mt-1 max-w-prose text-sm text-ink-muted">{children}</div>}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}
