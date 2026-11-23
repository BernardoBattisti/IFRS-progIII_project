import { cx } from "./cx";
import styles from "./Spinner.module.css";

export function Spinner({ pequeno = false, className }: { pequeno?: boolean; className?: string }) {
  return (
    <svg
      className={cx(styles.spinner, pequeno && styles.pequeno, className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div role="status" className={styles.carregando}>
      <Spinner />
      <span>{texto}</span>
    </div>
  );
}
