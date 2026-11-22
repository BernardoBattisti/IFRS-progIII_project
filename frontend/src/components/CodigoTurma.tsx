"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

export function CodigoTurma({ codigo, nomeTurma }: { codigo: string; nomeTurma: string }) {
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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-muted">Código:</span>
      <code className="select-all rounded-[var(--radius-control)] border border-line bg-canvas px-2 py-1 font-mono text-lg font-bold tracking-[0.2em] text-ink">
        <span aria-hidden="true">{codigo}</span>
        {/* Leitores de tela soletram o código caractere por caractere. */}
        <span className="sr-only">{codigo.split("").join(" ")}</span>
      </code>
      <Button variante="ghost" tamanho="sm" onClick={copiar}>
        Copiar<span className="sr-only"> código da turma {nomeTurma}</span>
      </Button>
      <span role="status" className="text-sm text-brand-700">
        {msg}
      </span>
    </div>
  );
}
