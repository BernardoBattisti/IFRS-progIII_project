"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, mensagemDeErro } from "@/lib/api";
import { rotaInicial } from "@/lib/rotas";
import type { Usuario } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import styles from "@/components/FormPublico.module.css";

export function BotaoVerificar() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className={styles.grupo}>
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
      <p role="status" className={styles.texto}>
        {msg}
      </p>
    </div>
  );
}
