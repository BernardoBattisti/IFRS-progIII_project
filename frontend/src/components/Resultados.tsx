"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatarPercentual, plural } from "@/lib/format";
import type { Resultado, Votacao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { Carregando } from "./ui/Spinner";
import { ErroCarregar } from "./ErroCarregar";
import { EmptyState } from "./ui/EmptyState";
import { Secao } from "./ui/Card";
import { Tabela, celula } from "./ui/Tabela";
import styles from "./Resultados.module.css";

/**
 * Resultados em tabela: opção, votos, percentual e uma barra simples.
 * Número e percentual aparecem sempre em texto; a barra é só reforço visual.
 * Faz polling de 5 s enquanto a votação está ABERTA.
 */
export function Resultados({ votacao }: { votacao: Votacao }) {
  const aberta = votacao.estado === "ABERTA";
  const { dados, erro, carregando, recarregar } = useDados(
    () => api<Resultado>(`/votacoes/${votacao.id}/resultados`),
    [votacao.id, votacao.estado],
    aberta ? 5000 : null,
  );

  return (
    <Secao
      id="titulo-resultados"
      titulo={votacao.estado === "ENCERRADA" ? "Resultado final" : "Resultado parcial"}
      acoes={aberta ? <p className={styles.atualiza}>Atualiza automaticamente a cada 5 segundos.</p> : undefined}
    >
      {carregando && !dados && <Carregando texto="Carregando resultados…" />}
      {erro && !dados && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {dados && <TabelaResultado resultado={dados} anonima={votacao.anonima} />}
    </Secao>
  );
}

function TabelaResultado({ resultado, anonima }: { resultado: Resultado; anonima: boolean }) {
  const maior = Math.max(0, ...resultado.opcoes.map((o) => o.votos));
  return (
    <>
      <dl className={styles.totais}>
        <div>
          <dt>Votos registrados</dt>
          <dd>{resultado.totalVotos}</dd>
        </div>
        <div>
          <dt>Participantes</dt>
          <dd>{resultado.totalParticipantes}</dd>
        </div>
      </dl>

      {resultado.totalVotos === 0 && (
        <EmptyState titulo="Nenhum voto ainda">Os resultados aparecem aqui assim que os primeiros votos chegarem.</EmptyState>
      )}

      <Tabela legenda="Votos por opção">
        <thead>
          <tr>
            <th scope="col">Opção</th>
            <th scope="col" className={celula.numero}>
              Votos
            </th>
            <th scope="col" className={celula.numero}>
              Percentual
            </th>
            <th scope="col" className={styles.colBarra}>
              Distribuição
            </th>
          </tr>
        </thead>
        <tbody>
          {resultado.opcoes.map((o) => (
            <tr key={o.opcaoId}>
              <td data-rotulo="Opção" className={celula.semRotulo}>
                <span className={celula.principal}>{o.titulo}</span>
                {maior > 0 && o.votos === maior && <span className={styles.maisVotada}> (mais votada)</span>}
                {!anonima && o.votantes && <Votantes votantes={o.votantes} />}
              </td>
              <td data-rotulo="Votos" className={celula.numero}>
                {o.votos}
              </td>
              <td data-rotulo="Percentual" className={celula.numero}>
                <strong>{formatarPercentual(o.percentual)}</strong>
              </td>
              <td className={`${styles.colBarra} ${celula.semRotulo}`}>
                <div className={styles.trilho} aria-hidden="true">
                  <div className={styles.barra} style={{ width: `${Math.min(100, Math.max(0, o.percentual))}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Tabela>
      {anonima && <p className={styles.nota}>Votação anônima: só os totais são exibidos.</p>}
    </>
  );
}

function Votantes({ votantes }: { votantes: NonNullable<Resultado["opcoes"][number]["votantes"]> }) {
  const [aberto, setAberto] = useState(false);
  if (votantes.length === 0) return null;
  return (
    <details className={styles.votantes} open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary>
        {aberto ? "Ocultar" : "Ver"} quem votou ({votantes.length})
      </summary>
      <ul>
        {votantes.map((v) => (
          <li key={v.matricula + v.nome}>
            <span>
              {v.nome} <span className={styles.matricula}>· {v.matricula}</span>
            </span>
            <span className={styles.qtd}>{plural(v.quantidade, "voto", "votos")}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
