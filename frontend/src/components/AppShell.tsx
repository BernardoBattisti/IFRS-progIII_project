"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { Papel } from "@/lib/types";
import { Protegido, useSessao } from "./Sessao";
import { Button, LinkBotao } from "./ui/Button";
import { cx } from "./ui/cx";

const NAV: Record<Papel, { href: string; rotulo: string; exato?: boolean }[]> = {
  ALUNO: [
    { href: "/aluno", rotulo: "Votações" },
    { href: "/aluno/turmas", rotulo: "Turmas" },
  ],
  DOCENTE: [
    { href: "/docente", rotulo: "Votações" },
    { href: "/docente/turmas", rotulo: "Turmas" },
  ],
  ADMIN: [
    { href: "/admin", rotulo: "Aprovações", exato: true },
    { href: "/admin/usuarios", rotulo: "Usuários" },
    { href: "/admin/dominios", rotulo: "Domínios" },
  ],
};

// "Minha conta" (troca de senha) não existe para o admin fixo (seção 2.3).
const CONTA: Partial<Record<Papel, string>> = { ALUNO: "/aluno/conta", DOCENTE: "/docente/conta" };

const ROTULO_PAPEL: Record<Papel, string> = { ALUNO: "Aluno", DOCENTE: "Docente", ADMIN: "Administrador" };

export function Marca() {
  return (
    <span className="flex items-center gap-2 font-bold text-ink">
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-md bg-brand-600 text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m8 12 3 3 5-6" />
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
        </svg>
      </span>
      <span className="leading-tight">
        Votações <span className="font-normal text-ink-muted">IFRS</span>
      </span>
    </span>
  );
}

function Cabecalho({ papel }: { papel: Papel }) {
  const { usuario, sair } = useSessao();
  const pathname = usePathname();
  const [saindo, setSaindo] = useState(false);
  const itens = NAV[papel];
  const conta = CONTA[papel];
  // O item ativo é o de prefixo mais longo que casa com a rota atual.
  const ativo = itens
    .filter((i) => (i.exato ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="border-b border-line bg-surface">
      <div className="h-1 bg-brand-500" aria-hidden="true">
        <div className="h-full w-16 bg-accent-red" />
      </div>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href={itens[0].href} className="inline-flex min-h-11 items-center rounded-md" aria-label="Votações IFRS — página inicial">
          <Marca />
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <p className="hidden text-right text-sm sm:block">
            <span className="block font-semibold text-ink">{usuario.nome}</span>
            <span className="block text-ink-muted">{ROTULO_PAPEL[papel]}</span>
          </p>
          {conta && (
            <LinkBotao
              href={conta}
              variante={pathname === conta ? "secondary" : "ghost"}
              tamanho="sm"
              aria-current={pathname === conta ? "page" : undefined}
            >
              Minha conta
            </LinkBotao>
          )}
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
      </div>
      <nav aria-label="Principal" className="mx-auto max-w-5xl px-4">
        <ul className="flex gap-0.5 sm:gap-1">
          {itens.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={ativo === i.href ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 items-center border-b-[3px] px-2 font-semibold sm:px-3",
                  ativo === i.href
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-ink-muted hover:text-ink hover:border-line",
                )}
              >
                {i.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function AppShell({ papel, children }: { papel: Papel; children: ReactNode }) {
  return (
    <Protegido papel={papel}>
      <Cabecalho papel={papel} />
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </Protegido>
  );
}
