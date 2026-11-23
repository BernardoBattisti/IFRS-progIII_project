import Link from "next/link";
import styles from "./Trilha.module.css";

export type ItemTrilha = { rotulo: string; href?: string };

/** Trilha de navegação ("Votações » Tema da feira"). O último item é a página atual. */
export function Trilha({ itens }: { itens: ItemTrilha[] }) {
  return (
    <nav aria-label="Trilha de navegação" className={styles.trilha}>
      <ol>
        {itens.map((i, n) => {
          const atual = n === itens.length - 1;
          return (
            <li key={`${n}-${i.rotulo}`}>
              {atual || !i.href ? (
                <span aria-current={atual ? "page" : undefined}>{i.rotulo}</span>
              ) : (
                <Link href={i.href}>{i.rotulo}</Link>
              )}
              {!atual && (
                <span aria-hidden="true" className={styles.sep}>
                  »
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
