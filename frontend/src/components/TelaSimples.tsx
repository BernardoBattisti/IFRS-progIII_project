"use client";

import { useState, type ReactNode } from "react";
import { useSessao } from "./Sessao";
import { BotaoSair, Faixa, Rodape, classesTopo } from "./Topo";
import styles from "./TelaPublica.module.css";

/** Moldura das telas fora das áreas (conta pendente/rejeitada). */
export function TelaSimples({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { usuario, sair } = useSessao();
  const [saindo, setSaindo] = useState(false);
  return (
    <>
      <header>
        <Faixa>
          <p>
            Conectado como <strong>{usuario.email}</strong>
          </p>
          <BotaoSair
            saindo={saindo}
            aoSair={async () => {
              setSaindo(true);
              await sair();
            }}
          />
        </Faixa>
        <div className={classesTopo.barra} aria-hidden="true">
          <div className={styles.barraVazia} />
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className={classesTopo.conteudo}>
        <div className={styles.larga}>
          <div className={styles.cabecalho}>
            <h1>{titulo}</h1>
          </div>
          <div className={styles.caixa}>{children}</div>
        </div>
      </main>
      <Rodape />
    </>
  );
}
