"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { AuthConfig, Usuario } from "@/lib/types";
import { Marca } from "@/components/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Button, classeBotao } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InputField } from "@/components/ui/Field";
import { Carregando } from "@/components/ui/Spinner";

const MENSAGENS_ERRO_LOGIN: Record<string, string> = {
  dominio_nao_permitido:
    "Esta conta Google não pertence a um domínio aceito pelo sistema. Entre com seu e-mail institucional.",
  email_nao_verificado:
    "O e-mail desta conta Google ainda não foi verificado. Verifique o e-mail no Google e tente de novo.",
  conta_divergente:
    "Já existe uma conta com este e-mail ligada a outro login Google. Entre com a mesma conta Google usada antes ou procure a coordenação.",
  falha_google: "Não conseguimos concluir o login com o Google. Tente de novo em alguns instantes.",
};

function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [erroConfig, setErroConfig] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});

  useEffect(() => {
    // Já autenticado? Vai direto para a área certa.
    api<Usuario>("/auth/me")
      .then((u) => router.replace(rotaInicial(u)))
      .catch(() => undefined);
    api<AuthConfig>("/auth/config")
      .then(setConfig)
      .catch((e) => setErroConfig(mensagemDeErro(e)));
  }, [router]);

  async function entrarDev(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const locais: Record<string, string> = {};
    if (!email.trim()) locais.email = "Informe o e-mail.";
    if (!nome.trim()) locais.nome = "Informe o nome.";
    setCampos(locais);
    if (Object.keys(locais).length) return;
    setEnviando(true);
    try {
      const u = await api<Usuario>("/dev/login", { method: "POST", body: { email: email.trim(), nome: nome.trim() } });
      router.replace(rotaInicial(u));
    } catch (err) {
      setErro(mensagemDeErro(err));
      if (err instanceof ApiError && err.campos) setCampos(err.campos);
      setEnviando(false);
    }
  }

  // Login Google recusado: o backend redireciona para "/?erroLogin=<codigo>" e a raiz repassa para cá.
  const erroOAuth = params.get("erroLogin");

  return (
    <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Marca />
        </div>
        <Card className="space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold">Entrar</h1>
            <p className="text-ink-muted">Use sua conta Google institucional para votar ou gerenciar votações.</p>
          </div>

          {erroOAuth && (
            <Alert tom="erro" titulo="Não foi possível entrar" anunciar>
              <p>{MENSAGENS_ERRO_LOGIN[erroOAuth] ?? MENSAGENS_ERRO_LOGIN.falha_google}</p>
            </Alert>
          )}

          {!config && !erroConfig && <Carregando texto="Carregando opções de login…" />}
          {erroConfig && (
            <Alert tom="erro" titulo="Não foi possível carregar o login" anunciar>
              <p>{erroConfig}</p>
            </Alert>
          )}

          {config?.googleHabilitado && (
            // Navegação completa (não client-side): o backend redireciona para o Google.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/api/oauth2/authorization/google" className={classeBotao("secondary") + " w-full text-ink"}>
              <IconeGoogle />
              Entrar com Google
            </a>
          )}

          {config && !config.googleHabilitado && !config.devLogin && (
            <Alert tom="aviso" titulo="Login indisponível">
              <p>O login com Google ainda não foi configurado neste servidor. Avise a coordenação do sistema.</p>
            </Alert>
          )}

          {config?.devLogin && (
            <section
              aria-labelledby="titulo-dev"
              className="space-y-4 rounded-[var(--radius-control)] border-2 border-dashed border-warning-200 bg-warning-50 p-4"
            >
              <div className="space-y-1">
                <h2 id="titulo-dev" className="flex flex-wrap items-center gap-2 font-bold text-warning-700">
                  <span className="rounded bg-warning-700 px-1.5 py-0.5 text-xs uppercase tracking-wide text-white">Dev</span>
                  Login de desenvolvimento
                </h2>
                <p className="text-sm text-ink">
                  Disponível só no ambiente de desenvolvimento. Entra sem Google, com qualquer e-mail e nome.
                </p>
              </div>
              <form onSubmit={entrarDev} className="space-y-3" noValidate>
                <InputField
                  rotulo="E-mail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  erro={campos.email}
                  obrigatorio
                />
                <InputField
                  rotulo="Nome"
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  erro={campos.nome}
                  obrigatorio
                />
                {erro && (
                  <Alert tom="erro" anunciar>
                    <p>{erro}</p>
                  </Alert>
                )}
                <Button type="submit" className="w-full" carregando={enviando}>
                  Entrar em modo de desenvolvimento
                </Button>
              </form>
            </section>
          )}
        </Card>
      </div>
    </main>
  );
}
