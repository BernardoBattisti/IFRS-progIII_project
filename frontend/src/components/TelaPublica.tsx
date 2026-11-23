import type { ReactNode } from "react";
import { Faixa, Rodape, classesTopo } from "./Topo";
import styles from "./TelaPublica.module.css";

/** Moldura das telas públicas (login, cadastro, recuperação de senha). */
export function TelaPublica({
  titulo,
  descricao,
  children,
  rodape,
  largura = "estreita",
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: "estreita" | "larga";
}) {
  return (
    <>
      <header>
        <Faixa />
        <div className={classesTopo.barra} aria-hidden="true">
          <div className={styles.barraVazia} />
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className={classesTopo.conteudo}>
        <div className={largura === "larga" ? styles.larga : styles.estreita}>
          <div className={styles.cabecalho}>
            <h1 id="titulo-tela" tabIndex={-1}>
              {titulo}
            </h1>
            {descricao && <p className={styles.descricao}>{descricao}</p>}
          </div>
          <div className={styles.caixa}>{children}</div>
          {rodape && <div className={styles.rodape}>{rodape}</div>}
        </div>
      </main>
      <Rodape />
    </>
  );
}

/** Link de texto no padrão (sublinhado, alvo de toque confortável no celular). */
export const classeLinkTexto = styles.link;

/** Leva o foco ao título da tela pública (após trocar de etapa sem mudar de rota). */
export function focarTituloTela() {
  requestAnimationFrame(() => document.getElementById("titulo-tela")?.focus());
}
