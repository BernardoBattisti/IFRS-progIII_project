import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export function PageHeader({
  titulo,
  descricao,
  acoes,
  antes,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  /** Normalmente a <Trilha>. */
  antes?: ReactNode;
}) {
  return (
    <div className={styles.cabecalho}>
      {antes}
      <div className={styles.linha}>
        <div className={styles.textos}>
          <h1 className={styles.titulo}>{titulo}</h1>
          {descricao && <div className={styles.descricao}>{descricao}</div>}
        </div>
        {acoes && <div className={styles.acoes}>{acoes}</div>}
      </div>
    </div>
  );
}
