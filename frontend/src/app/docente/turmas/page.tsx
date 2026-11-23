"use client";

import { useTitulo } from "@/lib/useTitulo";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Turma } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { plural } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErroCarregar } from "@/components/ErroCarregar";
import { Secao } from "@/components/ui/Card";
import { Tabela, celula } from "@/components/ui/Tabela";
import styles from "./page.module.css";
import { Button, LinkBotao } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { TurmaForm } from "@/components/TurmaForm";
import { CodigoTurma } from "@/components/CodigoTurma";

export default function TurmasDocente() {
  useTitulo("Turmas");
  const { dados, setDados, erro, carregando, recarregar } = useDados(() => api<Turma[]>("/turmas"), []);
  const [criando, setCriando] = useState(false);
  const [criada, setCriada] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        titulo="Turmas"
        descricao="Compartilhe o código da turma com os alunos para que eles entrem."
        acoes={
          !criando && (
            <Button
              onClick={() => {
                setCriando(true);
                setCriada(null);
              }}
            >
              + Nova turma
            </Button>
          )
        }
      />

      {criando && (
        <Secao id="titulo-nova" titulo="Nova turma" variante="form" className={styles.bloco}>
          <TurmaForm
            aoSalvar={(t) => {
              setDados((l) => [...(l ?? []), t]);
              setCriando(false);
              setCriada(`Turma ${t.nome} criada. Compartilhe o código ${t.codigo ?? ""} com os alunos.`);
            }}
            aoCancelar={() => setCriando(false)}
          />
        </Secao>
      )}
      {criada && (
        <Alert tom="sucesso" anunciar className={styles.bloco}>
          <p>{criada}</p>
        </Alert>
      )}

      {carregando && <Carregando texto="Carregando turmas…" />}
      {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {dados && dados.length === 0 && !criando && (
        <EmptyState titulo="Nenhuma turma ainda" acao={<Button onClick={() => setCriando(true)}>Criar primeira turma</Button>}>
          Turmas limitam quem pode votar. Sem turmas, suas votações ficam abertas a todos os alunos ativos.
        </EmptyState>
      )}
      {dados && dados.length > 0 && (
        <Tabela legenda="Minhas turmas">
          <thead>
            <tr>
              <th scope="col">Turma</th>
              <th scope="col" className={celula.numero}>
                Alunos
              </th>
              <th scope="col">Código de entrada</th>
              <th scope="col">
                <span className="sr-only">Ação</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {dados.map((t) => (
              <tr key={t.id}>
                <td data-rotulo="Turma" className={celula.semRotulo}>
                  <span className={celula.principal}>{t.nome}</span>
                  {t.descricao && <span className={styles.descricao}>{t.descricao}</span>}
                </td>
                <td data-rotulo="Alunos" className={celula.numero}>
                  {plural(t.totalAlunos, "aluno", "alunos")}
                </td>
                <td data-rotulo="Código de entrada">
                  {t.codigo ? <CodigoTurma codigo={t.codigo} nomeTurma={t.nome} comRotulo={false} /> : "—"}
                </td>
                <td className={`${celula.acoes} ${celula.semRotulo}`}>
                  <LinkBotao href={`/docente/turmas/${t.id}`} variante="secondary" tamanho="sm">
                    Gerenciar<span className="sr-only"> turma {t.nome}</span>
                  </LinkBotao>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
