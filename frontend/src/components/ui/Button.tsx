import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./Spinner";
import styles from "./Button.module.css";

export type Variante = "primary" | "secondary" | "ghost" | "danger" | "danger-secondary";
type Tamanho = "md" | "sm";

const variantes: Record<Variante, string> = {
  primary: styles.primario,
  secondary: styles.secundario,
  ghost: styles.discreto,
  danger: styles.perigo,
  "danger-secondary": styles.perigoSecundario,
};

/** Classe do botão (para links e outros elementos com cara de botão). */
export function classeBotao(variante: Variante = "primary", tamanho: Tamanho = "md", bloco = false) {
  return cx(styles.botao, variantes[variante], tamanho === "sm" && styles.pequeno, bloco && styles.bloco);
}

type BotaoProps = ComponentProps<"button"> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  icone?: ReactNode;
  /** Ocupa a largura toda (no celular e no desktop). */
  bloco?: boolean;
};

export function Button({
  variante = "primary",
  tamanho = "md",
  carregando = false,
  icone,
  bloco = false,
  className,
  children,
  disabled,
  type = "button",
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={cx(classeBotao(variante, tamanho, bloco), className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? <Spinner pequeno /> : icone}
      {children}
    </button>
  );
}

type LinkBotaoProps = ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho; bloco?: boolean };

export function LinkBotao({ variante = "primary", tamanho = "md", bloco = false, className, ...resto }: LinkBotaoProps) {
  return <Link className={cx(classeBotao(variante, tamanho, bloco), className)} {...resto} />;
}
