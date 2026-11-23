import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Topo.module.css";
import { Spinner } from "./ui/Spinner";

/** Faixa sólida do cabeçalho com o nome do sistema (todas as telas). */
export function Faixa({ href, children }: { href?: string; children?: ReactNode }) {
  const nome = (
    <>
      <span className={styles.sistema}>Sistema de Votações</span>
      <span className={styles.instituicao}>Instituto Federal do Rio Grande do Sul</span>
    </>
  );
  return (
    <div className={styles.faixa}>
      <div className={styles.interno}>
        {href ? (
          <Link href={href} className={styles.marca}>
            {nome}
            <span className="sr-only"> — página inicial</span>
          </Link>
        ) : (
          <p className={styles.marca}>{nome}</p>
        )}
        {children && <div className={styles.usuario}>{children}</div>}
      </div>
    </div>
  );
}

/** Botão "Sair" no estilo da faixa escura. */
export function BotaoSair({ saindo, aoSair }: { saindo: boolean; aoSair: () => void }) {
  return (
    <button type="button" className={styles.sair} onClick={aoSair} disabled={saindo} aria-busy={saindo || undefined}>
      {saindo && <Spinner pequeno />}
      Sair
    </button>
  );
}

export function Rodape() {
  return (
    <footer className={styles.rodape}>
      <div className={styles.interno}>
        <p>Sistema de Votações · IFRS</p>
      </div>
    </footer>
  );
}

export const classesTopo = styles;
