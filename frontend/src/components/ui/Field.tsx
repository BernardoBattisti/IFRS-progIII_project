"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { cx } from "./cx";

export const classeCampo =
  "block w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-subtle disabled:bg-[#f2f4f7] disabled:text-ink-muted aria-[invalid=true]:border-danger-600 aria-[invalid=true]:border-2 min-h-11";

type Base = {
  rotulo: ReactNode;
  ajuda?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
};

function Moldura({
  id,
  rotulo,
  ajuda,
  erro,
  obrigatorio,
  children,
}: Base & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {rotulo}
        {obrigatorio && (
          <>
            {" "}
            <span className="font-normal text-ink-muted">(obrigatório)</span>
          </>
        )}
      </label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} className="text-sm text-ink-muted">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="flex items-start gap-1 text-sm font-medium text-danger-600">
          <span aria-hidden="true">✕</span>
          {erro}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, ajuda: unknown, erro: unknown) {
  return [ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null].filter(Boolean).join(" ") || undefined;
}

export function InputField({
  rotulo,
  ajuda,
  erro,
  obrigatorio,
  className,
  id: idExterno,
  ...resto
}: Base & ComponentProps<"input">) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  return (
    <Moldura id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} obrigatorio={obrigatorio}>
      <input
        id={id}
        className={cx(classeCampo, className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={describedBy(id, ajuda, erro)}
        required={obrigatorio}
        {...resto}
      />
    </Moldura>
  );
}

export function TextareaField({
  rotulo,
  ajuda,
  erro,
  obrigatorio,
  className,
  id: idExterno,
  ...resto
}: Base & ComponentProps<"textarea">) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  return (
    <Moldura id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} obrigatorio={obrigatorio}>
      <textarea
        id={id}
        rows={3}
        className={cx(classeCampo, "min-h-20", className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={describedBy(id, ajuda, erro)}
        required={obrigatorio}
        {...resto}
      />
    </Moldura>
  );
}

export function SelectField({
  rotulo,
  ajuda,
  erro,
  obrigatorio,
  className,
  id: idExterno,
  children,
  ...resto
}: Base & ComponentProps<"select">) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  return (
    <Moldura id={id} rotulo={rotulo} ajuda={ajuda} erro={erro} obrigatorio={obrigatorio}>
      <select
        id={id}
        className={cx(classeCampo, className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={describedBy(id, ajuda, erro)}
        required={obrigatorio}
        {...resto}
      >
        {children}
      </select>
    </Moldura>
  );
}

/**
 * Campo de senha com botão "Mostrar/Ocultar". Com `minimo`, mostra abaixo do
 * campo quantos caracteres faltam (texto ligado por aria-describedby, sem
 * anunciar a cada tecla).
 */
export function SenhaField({
  rotulo,
  ajuda,
  erro,
  obrigatorio,
  minimo,
  nomeAlternar = "senha",
  className,
  id: idExterno,
  value,
  ...resto
}: Base & {
  minimo?: number;
  value: string;
  /** Completa o nome acessível do botão ("Mostrar senha atual"), para distinguir campos na mesma tela. */
  nomeAlternar?: string;
} & Omit<ComponentProps<"input">, "type" | "value">) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const [visivel, setVisivel] = useState(false);
  const total = [...value].length;
  const faltam = minimo ? Math.max(0, minimo - total) : 0;
  const contador = minimo ? (
    <span className={faltam === 0 && total > 0 ? "font-medium text-success-700" : undefined}>
      {total === 0
        ? `Use pelo menos ${minimo} caracteres.`
        : faltam > 0
          ? `${total} de ${minimo} caracteres — ${faltam === 1 ? "falta 1" : `faltam ${faltam}`}.`
          : (
            <>
              <span aria-hidden="true">✓ </span>
              {total} caracteres (mínimo {minimo}).
            </>
          )}
    </span>
  ) : null;
  const textoAjuda = contador || ajuda ? (
    <>
      {contador}
      {contador && ajuda ? " " : null}
      {ajuda}
    </>
  ) : undefined;
  return (
    <Moldura id={id} rotulo={rotulo} ajuda={textoAjuda} erro={erro} obrigatorio={obrigatorio}>
      <div className="flex gap-2">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          value={value}
          className={cx(classeCampo, "min-w-0 flex-1", className)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={describedBy(id, textoAjuda, erro)}
          required={obrigatorio}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...resto}
        />
        <button
          type="button"
          aria-controls={id}
          onClick={() => setVisivel((v) => !v)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          {visivel ? "Ocultar" : "Mostrar"}
          <span className="sr-only"> {nomeAlternar}</span>
        </button>
      </div>
    </Moldura>
  );
}
