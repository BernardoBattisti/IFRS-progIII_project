"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, ehErroDominio, mensagemDeErro } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import { SENHA_MIN, type Usuario } from "@/lib/types";
import { validarNovaSenha } from "@/lib/senha";
import { TelaPublica, classeLinkTexto } from "@/components/TelaPublica";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InputField, SenhaField, classesEscolha as esc } from "@/components/ui/Field";
import { cx } from "@/components/ui/cx";
import styles from "@/components/FormPublico.module.css";

type Escolha = "ALUNO" | "DOCENTE";
type Campo = "nome" | "email" | "senha" | "confirmacao" | "matricula" | "papel";

const OPCOES: { valor: Escolha; titulo: string; texto: string }[] = [
  { valor: "ALUNO", titulo: "Aluno", texto: "Participe das votações das suas turmas. O acesso é liberado na hora." },
  {
    valor: "DOCENTE",
    titulo: "Docente",
    texto: "Crie turmas e votações. Antes, um administrador precisa aprovar seu acesso.",
  },
];

// Ordem dos campos na tela: o foco vai para o primeiro com erro.
const ORDEM: Campo[] = ["nome", "email", "senha", "confirmacao", "matricula", "papel"];

export function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [matricula, setMatricula] = useState("");
  const [papel, setPapel] = useState<Escolha | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<{ titulo: string; texto: string; dica?: string } | null>(null);
  const [campos, setCampos] = useState<Partial<Record<Campo, string>>>({});
  // O erro de um campo some quando a pessoa volta a editá-lo.
  const limpar = (c: Campo) => setCampos((x) => (x[c] ? { ...x, [c]: undefined } : x));

  useEffect(() => {
    // Já autenticado? Vai direto para a área certa.
    api<Usuario>("/auth/me")
      .then((u) => router.replace(rotaInicial(u)))
      .catch(() => undefined);
  }, [router]);

  function focar(c: Partial<Record<Campo, string>>) {
    const primeiro = ORDEM.find((k) => c[k]);
    if (!primeiro) return;
    const el =
      primeiro === "papel"
        ? document.querySelector<HTMLInputElement>('input[name="papel"]')
        : document.getElementById(`cadastro-${primeiro}`);
    el?.focus();
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setFalha(null);
    const c: Partial<Record<Campo, string>> = {};
    if (!nome.trim()) c.nome = "Informe seu nome.";
    if (!email.trim()) c.email = "Informe seu e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) c.email = "Informe um e-mail válido, como nome@ifrs.edu.br.";
    Object.assign(c, validarNovaSenha(senha, confirmacao));
    if (!matricula.trim()) c.matricula = "Informe sua matrícula.";
    if (!papel) c.papel = "Escolha se você é aluno ou docente.";
    setCampos(c);
    if (Object.keys(c).length) return focar(c);

    setEnviando(true);
    try {
      const u = await api<Usuario>("/auth/cadastro", {
        method: "POST",
        body: { nome: nome.trim(), email: email.trim(), senha, matricula: matricula.trim(), papel },
      });
      router.replace(rotaInicial(u));
    } catch (err) {
      setEnviando(false);
      const doServidor: Partial<Record<Campo, string>> = {};
      if (err instanceof ApiError && err.campos) Object.assign(doServidor, err.campos);
      if (err instanceof ApiError && err.status === 409) {
        // O contrato não diz qual campo conflitou: deduzimos pela mensagem.
        if (/e-?mail/i.test(err.message)) doServidor.email = err.message;
        if (/matr[íi]cula/i.test(err.message)) doServidor.matricula = err.message;
      }
      setCampos(doServidor);
      focar(doServidor);
      if (ehErroDominio(err)) {
        setFalha({
          titulo: "E-mail não aceito",
          texto: err.message,
          dica: "Crie a conta com seu e-mail institucional. Se não souber qual usar, procure a coordenação do sistema no seu campus.",
        });
      } else if (err instanceof ApiError && err.status === 429) {
        setFalha({ titulo: "Muitas tentativas seguidas", texto: err.message });
      } else {
        setFalha({ titulo: "Não foi possível criar a conta", texto: mensagemDeErro(err) });
      }
    }
  }

  return (
    <TelaPublica
      titulo="Criar conta"
      descricao="Preencha seus dados para votar ou criar votações."
      largura="larga"
      rodape={
        <p>
          Já tem conta?{" "}
          <Link href="/login" className={classeLinkTexto}>
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={enviar} className={styles.form} noValidate>
        <InputField
          id="cadastro-nome"
          rotulo="Nome completo"
          autoComplete="name"
          value={nome}
          onChange={(e) => { setNome(e.target.value); limpar("nome"); }}
          erro={campos.nome}
          obrigatorio
        />
        <InputField
          id="cadastro-email"
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => { setEmail(e.target.value); limpar("email"); }}
          erro={campos.email}
          ajuda="Use seu e-mail institucional. Ele será usado para entrar e para recuperar a senha."
          obrigatorio
        />
        <SenhaField
          id="cadastro-senha"
          rotulo="Senha"
          autoComplete="new-password"
          minimo={SENHA_MIN}
          value={senha}
          onChange={(e) => { setSenha(e.target.value); limpar("senha"); }}
          erro={campos.senha}
          obrigatorio
        />
        <SenhaField
          id="cadastro-confirmacao"
          rotulo="Confirme a senha"
          nomeAlternar="confirmação da senha"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => { setConfirmacao(e.target.value); limpar("confirmacao"); }}
          erro={campos.confirmacao}
          obrigatorio
        />
        <InputField
          id="cadastro-matricula"
          rotulo="Matrícula"
          value={matricula}
          onChange={(e) => { setMatricula(e.target.value); limpar("matricula"); }}
          erro={campos.matricula}
          ajuda="A mesma matrícula usada no sistema acadêmico do campus."
          autoComplete="off"
          obrigatorio
        />

        <fieldset className={esc.grupo} aria-describedby={campos.papel ? "erro-papel" : undefined}>
          <legend className={esc.legenda}>
            Você é <span className={esc.obrigatorio}>(obrigatório)</span>
          </legend>
          <div className={styles.papeis}>
          {OPCOES.map((o) => (
            <label
              key={o.valor}
              className={cx(esc.item, papel === o.valor ? esc.marcado : campos.papel ? esc.invalido : undefined)}
            >
              <input
                type="radio"
                name="papel"
                value={o.valor}
                checked={papel === o.valor}
                onChange={() => { setPapel(o.valor); limpar("papel"); }}
                className={esc.controle}
              />
              <span>
                <span className={esc.titulo}>{o.titulo}</span>
                <span className={esc.texto}>{o.texto}</span>
              </span>
            </label>
          ))}
          </div>
          {campos.papel && (
            <p id="erro-papel" className={esc.erro}>
              <span aria-hidden="true">✕ </span>
              {campos.papel}
            </p>
          )}
        </fieldset>

        {papel === "DOCENTE" && (
          <Alert tom="info" titulo="Seu acesso como docente passa por aprovação">
            <p>
              Você entra logo após criar a conta, mas só poderá criar turmas e votações depois que um administrador
              aprovar seu acesso.
            </p>
          </Alert>
        )}

        {falha && (
          <Alert tom="erro" titulo={falha.titulo} anunciar>
            <p>{falha.texto}</p>
            {falha.dica && <p>{falha.dica}</p>}
          </Alert>
        )}

        <Button type="submit" bloco carregando={enviando}>
          Criar conta
        </Button>
      </form>
    </TelaPublica>
  );
}
