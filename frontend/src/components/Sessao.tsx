"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { Papel, Usuario } from "@/lib/types";
import { Carregando } from "./ui/Spinner";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";

type Ctx = { usuario: Usuario; sair: () => Promise<void> };
const SessaoContext = createContext<Ctx | null>(null);

export function useSessao(): Ctx {
  const c = useContext(SessaoContext);
  if (!c) throw new Error("useSessao fora de <Protegido>");
  return c;
}

export async function sairDaConta() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    // Mesmo com falha, seguimos para o login.
  }
}

/**
 * Carrega o usuário (GET /api/auth/me) e garante que ele está na área certa.
 * 401 → /login. Papel/status diferente do esperado → rota adequada.
 *
 * `papel`: papel exigido (conta ATIVO). `status`: status exigido (telas de
 * cadastro/espera, que não exigem papel).
 */
export function Protegido({
  papel,
  status,
  children,
}: {
  papel?: Papel;
  status?: Usuario["status"];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    api<Usuario>("/auth/me")
      .then((u) => {
        if (!ativo) return;
        const ok = papel ? u.status === "ATIVO" && u.papel === papel : status ? u.status === status : true;
        if (!ok) {
          router.replace(rotaInicial(u));
          return;
        }
        setUsuario(u);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setErro(e instanceof ApiError ? e.message : "Não foi possível carregar sua conta.");
      });
    return () => {
      ativo = false;
    };
  }, [papel, status, router, pathname, tentativa]);

  const sair = useCallback(async () => {
    await sairDaConta();
    router.replace("/login");
  }, [router]);

  if (erro) {
    return (
      <main className="mx-auto max-w-lg p-4 pt-16">
        <Alert tom="erro" titulo="Não foi possível carregar sua conta" anunciar>
          <p>{erro}</p>
        </Alert>
        <Button
          className="mt-4"
          variante="secondary"
          onClick={() => {
            setErro(null);
            setTentativa((t) => t + 1);
          }}
        >
          Tentar de novo
        </Button>
      </main>
    );
  }
  if (!usuario) return <Carregando texto="Carregando sua conta…" />;
  return <SessaoContext.Provider value={{ usuario, sair }}>{children}</SessaoContext.Provider>;
}
