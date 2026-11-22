"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, CHAVE_MSG_SESSAO, ehErroDominio, mensagemDeErro } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { Usuario } from "@/lib/types";
import { TelaPublica, classeLinkTexto } from "@/components/TelaPublica";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InputField, SenhaField } from "@/components/ui/Field";

const MSG_DOMINIO_PADRAO = "O domínio do seu e-mail deixou de ser aceito por este sistema.";

type Falha = { titulo: string; texto: string; dica?: string };

function falhaDoErro(e: unknown): Falha {
  if (e instanceof ApiError) {
    if (e.status === 401) return { titulo: "Não foi possível entrar", texto: e.message };
    if (e.status === 403)
      return {
        titulo: "Acesso não permitido",
        texto: e.message,
        dica: ehErroDominio(e)
          ? "Use o e-mail institucional ou procure a coordenação do sistema no seu campus."
          : "Se você acha que isso é um engano, procure a coordenação do sistema no seu campus.",
      };
    if (e.status === 429) return { titulo: "Muitas tentativas seguidas", texto: e.message };
  }
  return { titulo: "Não foi possível entrar", texto: mensagemDeErro(e) };
}

const semAssinatura = () => () => undefined;

/** Mensagem guardada quando a sessão foi encerrada (domínio removido). */
function lerMensagemSessao(motivo: string | null): string | null {
  if (motivo !== "dominio") return null;
  try {
    return window.sessionStorage.getItem(CHAVE_MSG_SESSAO) || MSG_DOMINIO_PADRAO;
  } catch {
    return MSG_DOMINIO_PADRAO;
  }
}

export function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const motivo = params.get("motivo");
  // sessionStorage só existe no navegador: no servidor (e na hidratação) a mensagem é null.
  const msgGuardada = useSyncExternalStore(
    semAssinatura,
    () => lerMensagemSessao(motivo),
    () => null,
  );
  const [msgDominioMe, setMsgDominioMe] = useState<string | null>(null);
  const sessaoEncerrada = msgDominioMe ?? msgGuardada;
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const refEmail = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Já autenticado? Vai direto para a área certa.
    api<Usuario>("/auth/me")
      .then((u) => router.replace(rotaInicial(u)))
      .catch((e: unknown) => {
        // Sessão ainda aberta, mas o domínio deixou de ser aceito.
        if (ehErroDominio(e)) setMsgDominioMe(e.message);
      });
  }, [router]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setFalha(null);
    const locais: Record<string, string> = {};
    if (!email.trim()) locais.email = "Informe seu e-mail.";
    if (!senha) locais.senha = "Informe sua senha.";
    setCampos(locais);
    if (locais.email) return refEmail.current?.focus();
    if (locais.senha) return document.getElementById("login-senha")?.focus();
    setEnviando(true);
    try {
      const u = await api<Usuario>("/auth/login", { method: "POST", body: { email: email.trim(), senha } });
      try {
        window.sessionStorage.removeItem(CHAVE_MSG_SESSAO);
      } catch {
        // ignora
      }
      router.replace(rotaInicial(u));
    } catch (err) {
      setFalha(falhaDoErro(err));
      if (err instanceof ApiError && err.campos) setCampos(err.campos);
      setSenha("");
      setEnviando(false);
    }
  }

  return (
    <TelaPublica
      titulo="Entrar"
      descricao="Use o e-mail e a senha da sua conta para votar ou gerenciar votações."
      rodape={
        <p>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className={classeLinkTexto}>
            Criar conta
          </Link>
        </p>
      }
    >
      {sessaoEncerrada && !falha && (
        <Alert tom="aviso" titulo="Sua sessão foi encerrada" anunciar>
          <p>{sessaoEncerrada}</p>
          <p>Se precisar de acesso, procure a coordenação do sistema no seu campus.</p>
        </Alert>
      )}
      <form onSubmit={entrar} className="space-y-4" noValidate>
        <InputField
          ref={refEmail}
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={campos.email}
          obrigatorio
        />
        <div className="space-y-1">
          <SenhaField
            id="login-senha"
            rotulo="Senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            erro={campos.senha}
            obrigatorio
          />
          <p className="text-right text-sm">
            <Link href="/esqueci-senha" className={classeLinkTexto}>
              Esqueci minha senha
            </Link>
          </p>
        </div>
        {falha && (
          <Alert tom="erro" titulo={falha.titulo} anunciar>
            <p>{falha.texto}</p>
            {falha.dica && <p>{falha.dica}</p>}
          </Alert>
        )}
        <Button type="submit" className="w-full" carregando={enviando}>
          Entrar
        </Button>
      </form>
    </TelaPublica>
  );
}
