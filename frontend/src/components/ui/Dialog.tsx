"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, type Variante } from "./Button";
import styles from "./Dialog.module.css";

/**
 * Diálogo modal baseado no <dialog> nativo: showModal() já prende o foco,
 * torna o resto da página inerte e fecha com Esc. O foco volta ao elemento
 * que abriu o diálogo ao fechar.
 */
export function Dialog({
  aberto,
  aoFechar,
  titulo,
  children,
  rodape,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children?: ReactNode;
  rodape?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloId = useId();
  const anterior = useRef<Element | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) {
      anterior.current = document.activeElement;
      el.showModal();
    } else if (!aberto && el.open) {
      el.close();
    }
  }, [aberto]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const aoCancelar = (e: Event) => {
      e.preventDefault();
      aoFechar();
    };
    const aoClose = () => {
      const a = anterior.current;
      if (a instanceof HTMLElement) a.focus();
    };
    el.addEventListener("cancel", aoCancelar);
    el.addEventListener("close", aoClose);
    return () => {
      el.removeEventListener("cancel", aoCancelar);
      el.removeEventListener("close", aoClose);
    };
  }, [aoFechar]);

  return (
    <dialog ref={ref} aria-labelledby={tituloId} className={styles.dialogo}>
      {aberto && (
        <>
          <h2 id={tituloId} className={styles.titulo}>
            {titulo}
          </h2>
          <div className={styles.corpo}>{children}</div>
          {rodape && <div className={styles.rodape}>{rodape}</div>}
        </>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  children,
  rotuloConfirmar,
  rotuloCancelar = "Cancelar",
  variante = "primary",
  carregando = false,
  erro,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
  titulo: string;
  children?: ReactNode;
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  variante?: Variante;
  carregando?: boolean;
  erro?: string | null;
}) {
  return (
    <Dialog
      aberto={aberto}
      aoFechar={() => !carregando && aoFechar()}
      titulo={titulo}
      rodape={
        <>
          <Button variante="secondary" onClick={aoFechar} disabled={carregando} autoFocus>
            {rotuloCancelar}
          </Button>
          <Button variante={variante} onClick={aoConfirmar} carregando={carregando}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      {children}
      {erro && (
        <p role="alert" className={styles.erro}>
          {erro}
        </p>
      )}
    </Dialog>
  );
}
