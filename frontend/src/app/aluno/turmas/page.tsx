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
import { Secao } from "@/components/ui/Card";
import { Tabela, celula } from "@/components/ui/Tabela";
import styles from "./page.module.css";
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

      <div className={styles.pilha}>
        <Secao id="titulo-entrar" titulo="Entrar em uma turma" variante="form">
          <form onSubmit={entrar} noValidate className={styles.form}>
            <div className={styles.campo}>
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
                className={styles.codigo}
              />
            </div>
            <Button type="submit" carregando={enviando} className={styles.enviar}>
              Entrar na turma
            </Button>
          </form>
          <div aria-live="polite" className={styles.mensagens}>
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
        </Secao>

        <section aria-labelledby="titulo-lista">
          <h2 id="titulo-lista" className={styles.titulo}>
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
            <Tabela legenda="Turmas em que você está">
              <thead>
                <tr>
                  <th scope="col">Turma</th>
                  <th scope="col">Docente</th>
                  <th scope="col">Descrição</th>
                  <th scope="col" className={celula.numero}>
                    Alunos
                  </th>
                </tr>
              </thead>
              <tbody>
                {dados.map((t) => (
                  <tr key={t.id}>
                    <td data-rotulo="Turma" className={`${celula.principal} ${celula.semRotulo}`}>
                      {t.nome}
                    </td>
                    <td data-rotulo="Docente">{t.docenteNome}</td>
                    <td data-rotulo="Descrição">{t.descricao || "—"}</td>
                    <td data-rotulo="Alunos" className={celula.numero}>
                      {plural(t.totalAlunos, "aluno", "alunos")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </section>
      </div>
    </>
  );
}
