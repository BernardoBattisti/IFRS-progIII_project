"use client";

import { useTitulo } from "@/lib/useTitulo";
import { useState, type FormEvent } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import type { Turma } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { plural } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErroCarregar } from "@/components/ErroCarregar";
import { Card } from "@/components/ui/Card";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function TurmasAluno() {
  useTitulo("Minhas turmas");
  const { dados, setDados, erro, carregando, recarregar } = useDados(() => api<Turma[]>("/turmas"), []);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEntrar, setErroEntrar] = useState<string | null>(null);
  const [erroCampo, setErroCampo] = useState<string | undefined>();
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErroEntrar(null);
    setErroCampo(undefined);
    setSucesso(null);
    const c = codigo.trim().toUpperCase();
    if (!c) {
      setErroCampo("Informe o código da turma.");
      return;
    }
    setEnviando(true);
    try {
      const t = await api<Turma>("/turmas/entrar", { method: "POST", body: { codigo: c } });
      setDados((lista) => [...(lista ?? []).filter((x) => x.id !== t.id), t]);
      setSucesso(`Pronto! Você entrou na turma ${t.nome}.`);
      setCodigo("");
    } catch (err) {
      if (err instanceof ApiError && err.campos?.codigo) setErroCampo(err.campos.codigo);
      else setErroEntrar(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader titulo="Minhas turmas" descricao="Entre nas turmas dos seus docentes para ver as votações delas." />

      <Card className="mb-8">
        <h2 className="text-lg font-bold">Entrar em uma turma</h2>
        <form onSubmit={entrar} noValidate className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-64">
            <InputField
              rotulo="Código da turma"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              ajuda="São 8 caracteres. Peça ao seu docente."
              erro={erroCampo}
              maxLength={16}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono tracking-widest uppercase"
            />
          </div>
          <Button type="submit" carregando={enviando} className="sm:mt-7">
            Entrar na turma
          </Button>
        </form>
        <div className="mt-3 space-y-2" aria-live="polite">
          {erroEntrar && (
            <Alert tom="erro" anunciar>
              <p>{erroEntrar}</p>
            </Alert>
          )}
          {sucesso && (
            <Alert tom="sucesso">
              <p>{sucesso}</p>
            </Alert>
          )}
        </div>
      </Card>

      <section aria-labelledby="titulo-lista" className="space-y-3">
        <h2 id="titulo-lista" className="text-lg font-bold">
          Turmas em que você está
        </h2>
        {carregando && <Carregando texto="Carregando turmas…" />}
        {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
        {dados && dados.length === 0 && (
          <EmptyState titulo="Você ainda não está em nenhuma turma">
            Use o código que seu docente passou para entrar na primeira.
          </EmptyState>
        )}
        {dados && dados.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {dados.map((t) => (
              <li key={t.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
                <h3 className="break-words font-semibold">{t.nome}</h3>
                <p className="text-sm text-ink-muted">Docente: {t.docenteNome}</p>
                {t.descricao && <p className="mt-2 break-words text-sm">{t.descricao}</p>}
                <p className="mt-2 text-sm text-ink-muted">{plural(t.totalAlunos, "aluno", "alunos")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
