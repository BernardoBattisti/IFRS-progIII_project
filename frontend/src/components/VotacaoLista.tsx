import type { ReactNode } from "react";
import type { Votacao } from "@/lib/types";
import { formatarDataHora, plural } from "@/lib/format";
import { EstadoBadge } from "./ui/Badge";
import { LinkBotao, type Variante } from "./ui/Button";
import { Tabela, celula } from "./ui/Tabela";
import styles from "./VotacaoLista.module.css";

export function periodo(v: Votacao) {
  return `${formatarDataHora(v.inicio)} até ${formatarDataHora(v.fim)}`;
}

type Acao = { rotulo: string; variante?: Variante };

/**
 * Tabela de votações: título, situação, início, fim, detalhes e ação por linha.
 * `extra` acrescenta uma coluna (ex.: votos restantes do aluno).
 */
export function TabelaVotacoes({
  legenda,
  lista,
  hrefDe,
  acaoDe,
  extra,
}: {
  legenda: string;
  lista: Votacao[];
  hrefDe: (v: Votacao) => string;
  acaoDe: (v: Votacao) => Acao;
  extra?: { titulo: string; valor: (v: Votacao) => ReactNode };
}) {
  return (
    <Tabela legenda={legenda}>
      <thead>
        <tr>
          <th scope="col">Votação</th>
          <th scope="col" className={styles.colSituacao}>
            Situação
          </th>
          <th scope="col" className={styles.colData}>
            Início
          </th>
          <th scope="col" className={styles.colData}>
            Fim
          </th>
          {extra && (
            <th scope="col" className={styles.colExtra}>
              {extra.titulo}
            </th>
          )}
          <th scope="col" className={styles.colAcao}>
            <span className="sr-only">Ação</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lista.map((v) => {
          const a = acaoDe(v);
          return (
            <tr key={v.id}>
              <td data-rotulo="Votação" className={celula.semRotulo}>
                <span className={celula.principal}>{v.titulo}</span>
                <span className={styles.detalhe}>
                  {plural(v.opcoes.length, "opção", "opções")} · {v.anonima ? "Anônima" : "Identificada"}
                </span>
              </td>
              <td data-rotulo="Situação">
                <EstadoBadge estado={v.estado} />
              </td>
              <td data-rotulo="Início" className={styles.data}>
                {formatarDataHora(v.inicio)}
              </td>
              <td data-rotulo="Fim" className={styles.data}>
                {formatarDataHora(v.fim)}
              </td>
              {extra && <td data-rotulo={extra.titulo}>{extra.valor(v)}</td>}
              <td className={`${celula.acoes} ${celula.semRotulo}`}>
                <LinkBotao href={hrefDe(v)} variante={a.variante ?? "secondary"} tamanho="sm">
                  {a.rotulo}
                  <span className="sr-only">: {v.titulo}</span>
                </LinkBotao>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Tabela>
  );
}
