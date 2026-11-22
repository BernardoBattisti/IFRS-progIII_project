import type { ReactNode } from "react";

export function PageHeader({
  titulo,
  descricao,
  acoes,
  antes,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  antes?: ReactNode;
}) {
  return (
    <div className="mb-6 space-y-2">
      {antes}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink break-words sm:text-3xl">{titulo}</h1>
          {descricao && <div className="text-ink-muted">{descricao}</div>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </div>
  );
}
