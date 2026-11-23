import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Card.module.css";

type Variante = "padrao" | "form" | "perigo";

/** Caixa simples com borda (sem sombra). `form` = fundo cinza dos formulários. */
export function Card({ className, variante = "padrao", ...resto }: ComponentProps<"div"> & { variante?: Variante }) {
  return <div className={cx(styles.caixa, variante === "form" && styles.form, className)} {...resto} />;
}

/**
 * Seção com título em faixa. O `h2` recebe `id` para `aria-labelledby`.
 */
export function Secao({
  id,
  titulo,
  descricao,
  acoes,
  variante = "padrao",
  children,
  className,
  tituloRef,
}: {
  id: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  variante?: Variante;
  children?: ReactNode;
  className?: string;
  tituloRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cx(styles.secao, variante === "form" && styles.form, variante === "perigo" && styles.perigo, className)}
    >
      <div className={styles.faixa}>
        <h2 id={id} ref={tituloRef} tabIndex={tituloRef ? -1 : undefined} className={styles.titulo}>
          {titulo}
        </h2>
        {acoes && <div className={styles.acoes}>{acoes}</div>}
      </div>
      <div className={styles.corpo}>
        {descricao && <div className={styles.descricao}>{descricao}</div>}
        {children}
      </div>
    </section>
  );
}
