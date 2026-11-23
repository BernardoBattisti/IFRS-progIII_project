"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { Papel } from "@/lib/types";
import { Protegido, useSessao } from "./Sessao";
import { BotaoSair, Faixa, Rodape, classesTopo as styles } from "./Topo";

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

export const ROTULO_PAPEL: Record<Papel, string> = { ALUNO: "Aluno", DOCENTE: "Docente", ADMIN: "Administrador" };

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
    <header>
      <Faixa href={itens[0].href}>
        <p>
          Usuário: <strong>{usuario.nome}</strong> ({ROTULO_PAPEL[papel]})
        </p>
        {conta && (
          <Link href={conta} aria-current={pathname === conta ? "page" : undefined}>
            Minha conta
          </Link>
        )}
        <BotaoSair
          saindo={saindo}
          aoSair={async () => {
            setSaindo(true);
            await sair();
          }}
        />
      </Faixa>
      <nav aria-label="Principal" className={styles.barra}>
        <div className={styles.interno}>
          <ul className={styles.menu}>
            {itens.map((i) => (
              <li key={i.href}>
                <Link href={i.href} aria-current={ativo === i.href ? "page" : undefined}>
                  {i.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}

export function AppShell({ papel, children }: { papel: Papel; children: ReactNode }) {
  return (
    <Protegido papel={papel}>
      <Cabecalho papel={papel} />
      <main id="conteudo" tabIndex={-1} className={styles.conteudo}>
        {children}
      </main>
      <Rodape />
    </Protegido>
  );
}
