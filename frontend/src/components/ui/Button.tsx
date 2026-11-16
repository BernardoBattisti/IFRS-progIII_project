import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./Spinner";

export type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamanho = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 text-center";

const variantes: Record<Variante, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border border-brand-600 hover:border-brand-700",
  secondary:
    "bg-surface text-brand-700 border border-line-strong hover:bg-brand-50 active:bg-brand-100",
  ghost: "bg-transparent text-brand-700 border border-transparent hover:bg-brand-50",
  danger:
    "bg-danger-600 text-white border border-danger-600 hover:bg-danger-700 hover:border-danger-700",
};

// Altura mínima de 44px no tamanho padrão (alvo de toque confortável no celular).
const tamanhos: Record<Tamanho, string> = {
  md: "min-h-11 px-4 py-2 text-base",
  sm: "min-h-11 px-3 py-1.5 text-sm sm:min-h-9",
};

export function classeBotao(variante: Variante = "primary", tamanho: Tamanho = "md") {
  return cx(base, variantes[variante], tamanhos[tamanho]);
}

type BotaoProps = ComponentProps<"button"> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  icone?: ReactNode;
};

export function Button({
  variante = "primary",
  tamanho = "md",
  carregando = false,
  icone,
  className,
  children,
  disabled,
  type = "button",
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={cx(classeBotao(variante, tamanho), className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? <Spinner className="size-4" /> : icone}
      {children}
    </button>
  );
}

type LinkBotaoProps = ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho };

export function LinkBotao({ variante = "primary", tamanho = "md", className, ...resto }: LinkBotaoProps) {
  return <Link className={cx(classeBotao(variante, tamanho), className)} {...resto} />;
}
