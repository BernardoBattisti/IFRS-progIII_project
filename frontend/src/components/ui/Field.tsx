"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Field.module.css";

export const classeCampo = styles.campo;

/** Classes das linhas de escolha (rádio/caixa de marcação com rótulo grande). */
export const classesEscolha = {
  grupo: styles.grupo,
  legenda: styles.legenda,
  lista: styles.listaEscolhas,
  item: styles.escolha,
  marcado: styles.marcado,
  invalido: styles.invalido,
  bloqueado: styles.bloqueado,
  controle: styles.controle,
  titulo: styles.escolhaTitulo,
  texto: styles.escolhaTexto,
  erro: styles.erro,
  obrigatorio: styles.obrigatorio,
};

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
    <div className={styles.moldura}>
      <label htmlFor={id} className={styles.rotulo}>
        {rotulo}
        {obrigatorio && (
          <>
            {" "}
            <span className={styles.obrigatorio}>(obrigatório)</span>
          </>
        )}
      </label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} className={styles.ajuda}>
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className={styles.erro}>
          <span aria-hidden="true">✕ </span>
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
        className={cx(classeCampo, styles.area, className)}
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
    <span className={faltam === 0 && total > 0 ? styles.ok : undefined}>
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
      <div className={styles.senha}>
        <input
          id={id}
          type={visivel ? "text" : "password"}
          value={value}
          className={cx(classeCampo, styles.senhaCampo, className)}
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
          className={styles.alternar}
        >
          {visivel ? "Ocultar" : "Mostrar"}
          <span className="sr-only"> {nomeAlternar}</span>
        </button>
      </div>
    </Moldura>
  );
}
