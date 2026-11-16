"use client";

import type { ReactNode } from "react";
import { Marca } from "./AppShell";
import { useSessao } from "./Sessao";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { useState } from "react";

/** Moldura das telas fora das áreas (cadastro, conta pendente/rejeitada). */
export function TelaSimples({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { usuario, sair } = useSessao();
  const [saindo, setSaindo] = useState(false);
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="h-1 bg-brand-500" aria-hidden="true">
          <div className="h-full w-16 bg-accent-red" />
        </div>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Marca />
          <Button
            variante="secondary"
            tamanho="sm"
            carregando={saindo}
            onClick={async () => {
              setSaindo(true);
              await sair();
            }}
          >
            Sair
          </Button>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <Card className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{titulo}</h1>
            <p className="text-sm text-ink-muted">
              Conectado como <span className="font-semibold text-ink break-all">{usuario.email}</span>
            </p>
          </div>
          {children}
        </Card>
      </main>
    </>
  );
}
