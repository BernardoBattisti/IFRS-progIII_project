"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, mensagemDeErro } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { Usuario } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function BotaoVerificar() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variante="secondary"
        carregando={carregando}
        onClick={async () => {
          setCarregando(true);
          setMsg(null);
          try {
            const u = await api<Usuario>("/auth/me");
            if (u.status === "PENDENTE_APROVACAO") {
              setMsg("Seu acesso ainda não foi aprovado.");
              setCarregando(false);
            } else router.replace(rotaInicial(u));
          } catch (e) {
            setMsg(mensagemDeErro(e));
            setCarregando(false);
          }
        }}
      >
        Verificar aprovação
      </Button>
      <p role="status" className="text-sm text-ink-muted">
        {msg}
      </p>
    </div>
  );
}
