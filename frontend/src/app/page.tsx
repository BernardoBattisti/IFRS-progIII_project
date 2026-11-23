"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { Usuario } from "@/lib/types";
import { Carregando } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { LinkBotao } from "@/components/ui/Button";
import styles from "./page.module.css";

// Ponto de entrada: decide a tela a partir de GET /api/auth/me.
export default function Page() {
  return (
    <Suspense>
      <Inicio />
    </Suspense>
  );
}

function Inicio() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api<Usuario>("/auth/me")
      .then((u) => router.replace(rotaInicial(u)))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        else setErro(e instanceof ApiError ? e.message : "Não foi possível carregar sua conta.");
      });
  }, [router]);

  return (
    <main id="conteudo" tabIndex={-1} className={styles.inicio}>
      {erro ? (
        <div className={styles.pilha}>
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
