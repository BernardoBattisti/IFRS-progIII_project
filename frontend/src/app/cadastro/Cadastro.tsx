"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { Usuario } from "@/lib/types";
import { TelaSimples } from "@/components/TelaSimples";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { cx } from "@/components/ui/cx";

type Escolha = "ALUNO" | "DOCENTE";

const OPCOES: { valor: Escolha; titulo: string; texto: string }[] = [
  { valor: "ALUNO", titulo: "Sou aluno", texto: "Participe das votações das suas turmas. Acesso liberado na hora." },
  {
    valor: "DOCENTE",
    titulo: "Sou docente",
    texto: "Crie turmas e votações. Seu acesso precisa ser aprovado por um administrador.",
  },
];

export function Cadastro() {
  const router = useRouter();
  const [papel, setPapel] = useState<Escolha | null>(null);
  const [matricula, setMatricula] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novosCampos: Record<string, string> = {};
    if (!papel) novosCampos.papel = "Escolha se você é aluno ou docente.";
    if (!matricula.trim()) novosCampos.matricula = "Informe sua matrícula.";
    setCampos(novosCampos);
    if (Object.keys(novosCampos).length) return;
    setEnviando(true);
    setErro(null);
    try {
      const u = await api<Usuario>("/auth/cadastro", {
        method: "POST",
        body: { papel, matricula: matricula.trim() },
      });
      router.replace(rotaInicial(u));
    } catch (err) {
      setErro(mensagemDeErro(err));
      if (err instanceof ApiError && err.campos) setCampos(err.campos);
      setEnviando(false);
    }
  }

  return (
    <TelaSimples titulo="Conclua seu cadastro">
      <p className="text-ink-muted">Este é seu primeiro acesso. Conte quem você é para liberarmos as telas certas.</p>
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <fieldset
          className="space-y-2"
          aria-describedby={campos.papel ? "erro-papel" : undefined}
        >
          <legend className="mb-2 text-sm font-semibold">
            Você é… <span className="font-normal text-ink-muted">(obrigatório)</span>
          </legend>
          {OPCOES.map((o) => (
            <label
              key={o.valor}
              className={cx(
                "flex cursor-pointer gap-3 rounded-[var(--radius-control)] border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-700 has-[:focus-visible]:outline-offset-2",
                papel === o.valor ? "border-2 border-brand-600 bg-brand-50" : "border-line-strong bg-surface",
              )}
            >
              <input
                type="radio"
                name="papel"
                value={o.valor}
                checked={papel === o.valor}
                onChange={() => setPapel(o.valor)}
                className="mt-1 size-5 accent-brand-600 focus-visible:outline-none"
              />
              <span>
                <span className="block font-semibold text-ink">{o.titulo}</span>
                <span className="block text-sm text-ink-muted">{o.texto}</span>
              </span>
            </label>
          ))}
          {campos.papel && (
            <p id="erro-papel" className="text-sm font-medium text-danger-600">
              <span aria-hidden="true">✕ </span>{campos.papel}
            </p>
          )}
        </fieldset>

        <InputField
          rotulo="Matrícula"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          erro={campos.matricula}
          ajuda="A mesma matrícula usada no sistema acadêmico do campus."
          autoComplete="off"
          obrigatorio
        />

        {papel === "DOCENTE" && (
          <Alert tom="info">
            <p>Depois de enviar, você só poderá criar turmas e votações quando um administrador aprovar seu acesso.</p>
          </Alert>
        )}

        {erro && (
          <Alert tom="erro" anunciar>
            <p>{erro}</p>
          </Alert>
        )}

        <Button type="submit" className="w-full sm:w-auto" carregando={enviando}>
          Concluir cadastro
        </Button>
      </form>
    </TelaSimples>
  );
}
