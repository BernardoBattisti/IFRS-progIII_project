"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import type { Turma } from "@/lib/types";
import { InputField, TextareaField } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import styles from "./TurmaForm.module.css";

export function TurmaForm({
  inicial,
  aoSalvar,
  aoCancelar,
}: {
  inicial?: Turma;
  aoSalvar: (t: Turma) => void;
  aoCancelar?: () => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) {
      setCampos({ nome: "Informe o nome da turma." });
      return;
    }
    setCampos({});
    setSalvando(true);
    try {
      const t = await api<Turma>(inicial ? `/turmas/${inicial.id}` : "/turmas", {
        method: inicial ? "PUT" : "POST",
        body: { nome: nome.trim(), descricao: descricao.trim() || null },
      });
      aoSalvar(t);
      if (!inicial) {
        setNome("");
        setDescricao("");
      }
    } catch (err) {
      if (err instanceof ApiError && err.campos) setCampos(err.campos);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} noValidate className={styles.form}>
      <InputField
        rotulo="Nome da turma"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={campos.nome}
        placeholder="Ex.: Informática 2º ano"
        maxLength={120}
        obrigatorio
      />
      <TextareaField
        rotulo="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        erro={campos.descricao}
        ajuda="Opcional."
        rows={2}
      />
      {erro && (
        <Alert tom="erro" anunciar>
          <p>{erro}</p>
        </Alert>
      )}
      <div className={styles.botoes}>
        <Button type="submit" carregando={salvando}>
          {inicial ? "Salvar alterações" : "Criar turma"}
        </Button>
        {aoCancelar && (
          <Button variante="secondary" onClick={aoCancelar} disabled={salvando}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
