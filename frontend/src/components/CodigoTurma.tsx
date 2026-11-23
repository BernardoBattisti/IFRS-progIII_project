"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import styles from "./CodigoTurma.module.css";

export function CodigoTurma({ codigo, nomeTurma, comRotulo = true }: { codigo: string; nomeTurma: string; comRotulo?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setMsg("Código copiado.");
    } catch {
      setMsg("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
    setTimeout(() => setMsg(null), 4000);
  }
  return (
    <div className={styles.codigo}>
      {comRotulo && <span className={styles.rotulo}>Código:</span>}
      <code className={styles.valor}>
        <span aria-hidden="true">{codigo}</span>
        {/* Leitores de tela soletram o código caractere por caractere. */}
        <span className="sr-only">{codigo.split("").join(" ")}</span>
      </code>
      <Button variante="secondary" tamanho="sm" onClick={copiar}>
        Copiar<span className="sr-only"> código da turma {nomeTurma}</span>
      </Button>
      <span role="status" className={styles.msg}>
        {msg}
      </span>
    </div>
  );
}
