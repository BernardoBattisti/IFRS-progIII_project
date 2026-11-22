import type { ReactNode } from "react";
import { cx } from "./cx";

type Tom = "info" | "sucesso" | "aviso" | "erro";

const estilos: Record<Tom, string> = {
  info: "bg-info-50 border-info-200 text-info-700",
  sucesso: "bg-success-50 border-brand-200 text-success-700",
  aviso: "bg-warning-50 border-warning-200 text-warning-700",
  erro: "bg-danger-50 border-danger-200 text-danger-600",
};

const icones: Record<Tom, ReactNode> = {
  info: <path d="M12 8h.01M11 12h1v5h1" />,
  sucesso: <path d="m8 12.5 2.5 2.5L16 9.5" />,
  aviso: <path d="M12 8v5m0 3h.01" />,
  erro: <path d="m9 9 6 6m0-6-6 6" />,
};

/**
 * Mensagem em bloco. O tom é comunicado por cor + ícone + título (não só cor).
 * `anunciar` usa role="alert" (erros após uma ação) ou role="status".
 */
export function Alert({
  tom = "info",
  titulo,
  children,
  anunciar = false,
  className,
}: {
  tom?: Tom;
  titulo?: string;
  children?: ReactNode;
  anunciar?: boolean;
  className?: string;
}) {
  return (
    <div
      role={anunciar ? (tom === "erro" ? "alert" : "status") : undefined}
      className={cx("flex gap-3 rounded-[var(--radius-control)] border p-3 text-sm", estilos[tom], className)}
    >
      <svg
        viewBox="0 0 24 24"
        className="mt-0.5 size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        {icones[tom]}
      </svg>
      <div className="min-w-0 space-y-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className="text-ink [&_a]:underline">{children}</div>}
      </div>
    </div>
  );
}
