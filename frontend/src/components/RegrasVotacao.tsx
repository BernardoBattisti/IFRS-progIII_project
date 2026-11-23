import type { Votacao, Visibilidade } from "@/lib/types";
import { formatarDataHora } from "@/lib/format";
import styles from "./RegrasVotacao.module.css";

export const ROTULO_VISIBILIDADE: Record<Visibilidade, string> = {
  SEMPRE: "Durante toda a votação",
  APOS_ENCERRAR: "Só depois de encerrada",
  NUNCA: "Não divulgado aos alunos",
};

export function RegrasVotacao({ v, paraDocente = false }: { v: Votacao; paraDocente?: boolean }) {
  const itens: [string, string][] = [
    ["Início", formatarDataHora(v.inicio)],
    ["Fim", formatarDataHora(v.fim)],
    ["Votos por aluno", String(v.votosPorAluno)],
    ["Repetir opção", v.permiteRepetirOpcao ? "Permitido (vários votos na mesma opção)" : "Não (no máximo 1 voto por opção)"],
    ["Tipo", v.anonima ? "Anônima" : "Identificada (mostra quem votou)"],
    ["Resultado para alunos", ROTULO_VISIBILIDADE[v.visibilidadeResultado]],
  ];
  if (paraDocente) {
    itens.push([
      "Quem pode votar",
      v.turmas.length === 0 ? "Todos os alunos ativos" : v.turmas.map((t) => t.nome).join(", "),
    ]);
  }
  return (
    <table className={styles.regras}>
      <caption className="sr-only">Regras da votação</caption>
      <tbody>
        {itens.map(([k, val]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
