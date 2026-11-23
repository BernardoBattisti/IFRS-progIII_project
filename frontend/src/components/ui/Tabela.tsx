import type { ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Tabela.module.css";

/**
 * Tabela com bordas. Abaixo de 640px cada linha vira um bloco empilhado e cada
 * <td> mostra o próprio rótulo, vindo de `data-rotulo` (use em todas as células).
 */
export function Tabela({
  legenda,
  legendaVisivel = false,
  children,
  className,
}: {
  legenda: string;
  legendaVisivel?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <table className={cx(styles.tabela, className)}>
      <caption className={legendaVisivel ? styles.legenda : "sr-only"}>{legenda}</caption>
      {children}
    </table>
  );
}

/** Classes auxiliares para células. */
export const celula = {
  /** Coluna de ações (botões alinhados). */
  acoes: styles.acoes,
  /** Números alinhados à direita (desktop). */
  numero: styles.numero,
  /** Primeira coluna em destaque (título do item). */
  principal: styles.principal,
  /** Texto auxiliar em cinza, menor. */
  auxiliar: styles.auxiliar,
  /** Célula que, no celular, não mostra o rótulo (ex.: ações). */
  semRotulo: styles.semRotulo,
};
