"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { Usuario } from "@/lib/types";
import { Carregando } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { LinkBotao } from "@/components/ui/Button";

// Ponto de entrada (também é para onde o OAuth redireciona ao final):
// decide a tela a partir de GET /api/auth/me.
export default function Page() {
  return (
    <Suspense>
      <Inicio />
    </Suspense>
  );
}

function Inicio() {
  const router = useRouter();
  const params = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const erroLogin = params.get("erroLogin");

  useEffect(() => {
    // Login Google recusado: o backend volta para "/?erroLogin=<codigo>".
    if (erroLogin) {
      router.replace(`/login?erroLogin=${encodeURIComponent(erroLogin)}`);
      return;
    }
    api<Usuario>("/auth/me")
      .then((u) => router.replace(rotaInicial(u)))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        else setErro(e instanceof ApiError ? e.message : "Não foi possível carregar sua conta.");
      });
  }, [router, erroLogin]);

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-lg flex-1 p-4 pt-16">
      {erro ? (
        <div className="space-y-4">
          <Alert tom="erro" titulo="Não foi possível carregar sua conta" anunciar>
            <p>{erro}</p>
          </Alert>
          <LinkBotao href="/login" variante="secondary">
            Ir para o login
          </LinkBotao>
        </div>
      ) : (
        <Carregando texto="Carregando…" />
      )}
    </main>
  );
}
