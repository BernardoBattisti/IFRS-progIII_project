import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

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
    <div className={styles.vazio}>
      <p className={styles.titulo}>{titulo}</p>
      {children && <div className={styles.texto}>{children}</div>}
      {acao && <div className={styles.acao}>{acao}</div>}
    </div>
  );
}
