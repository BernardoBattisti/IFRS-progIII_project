import type { ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Alert.module.css";

type Tom = "info" | "sucesso" | "aviso" | "erro";

const estilos: Record<Tom, string> = {
  info: styles.info,
  sucesso: styles.sucesso,
  aviso: styles.aviso,
  erro: styles.erro,
};

/**
 * Mensagem em bloco. O tom é comunicado por cor + barra lateral + título em texto.
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
    <div role={anunciar ? (tom === "erro" ? "alert" : "status") : undefined} className={cx(styles.caixa, estilos[tom], className)}>
      {titulo && <p className={styles.titulo}>{titulo}</p>}
      {children && <div className={styles.corpo}>{children}</div>}
    </div>
  );
}
