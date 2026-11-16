"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
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
