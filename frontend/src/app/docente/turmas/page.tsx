"use client";

import { useTitulo } from "@/lib/useTitulo";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Turma } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { plural } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErroCarregar } from "@/components/ErroCarregar";
import { Card } from "@/components/ui/Card";
import { Button, classeBotao } from "@/components/ui/Button";
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
        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-bold">Nova turma</h2>
          <TurmaForm
            aoSalvar={(t) => {
              setDados((l) => [...(l ?? []), t]);
              setCriando(false);
              setCriada(`Turma ${t.nome} criada. Compartilhe o código ${t.codigo ?? ""} com os alunos.`);
            }}
            aoCancelar={() => setCriando(false)}
          />
        </Card>
      )}
      {criada && (
        <Alert tom="sucesso" anunciar className="mb-6">
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
        <ul className="grid gap-3 sm:grid-cols-2">
          {dados.map((t) => (
            <li key={t.id} className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
              <div>
                <h2 className="break-words text-lg font-semibold">{t.nome}</h2>
                <p className="text-sm text-ink-muted">{plural(t.totalAlunos, "aluno", "alunos")}</p>
                {t.descricao && <p className="mt-1 break-words text-sm">{t.descricao}</p>}
              </div>
              {t.codigo && <CodigoTurma codigo={t.codigo} nomeTurma={t.nome} />}
              <Link href={`/docente/turmas/${t.id}`} className={classeBotao("secondary", "sm")}>
                Gerenciar<span className="sr-only"> turma {t.nome}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
