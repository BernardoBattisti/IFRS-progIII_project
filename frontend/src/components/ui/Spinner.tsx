import { cx } from "./cx";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("animate-spin", className ?? "size-5")}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 justify-center text-ink-muted">
      <Spinner className="size-5 text-brand-600" />
      <span>{texto}</span>
    </div>
  );
}
