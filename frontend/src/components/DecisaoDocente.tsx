"use client";

import { useState } from "react";
import { api, mensagemDeErro } from "@/lib/api";
import type { Usuario } from "@/lib/types";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/Dialog";

/** Botões Aprovar/Rejeitar para um docente PENDENTE_APROVACAO. */
export function DecisaoDocente({ u, aoDecidir }: { u: Usuario; aoDecidir: (u: Usuario, msg: string) => void }) {
  const [dialogo, setDialogo] = useState<"aprovar" | "rejeitar" | null>(null);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function decidir(a: "aprovar" | "rejeitar") {
    setExecutando(true);
    setErro(null);
    try {
      const r = await api<Usuario | undefined>(`/admin/usuarios/${u.id}/${a}`, { method: "POST" });
      const atualizado: Usuario = r ?? { ...u, status: a === "aprovar" ? "ATIVO" : "REJEITADO" };
      setDialogo(null);
      aoDecidir(
        atualizado,
        a === "aprovar" ? `Acesso de ${u.nome} aprovado. Essa pessoa já pode criar turmas e votações.` : `O acesso de ${u.nome} foi rejeitado.`,
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setExecutando(false);
    }
  }

  // O admin fixo nunca recebe ações; só docentes aguardando aprovação.
  if (u.papel !== "DOCENTE" || u.status !== "PENDENTE_APROVACAO") return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button tamanho="sm" onClick={() => { setErro(null); setDialogo("aprovar"); }}>
        Aprovar<span className="sr-only"> {u.nome}</span>
      </Button>
      <Button variante="secondary" tamanho="sm" onClick={() => { setErro(null); setDialogo("rejeitar"); }}>
        Rejeitar<span className="sr-only"> {u.nome}</span>
      </Button>
      <ConfirmDialog
        aberto={dialogo === "aprovar"}
        aoFechar={() => setDialogo(null)}
        aoConfirmar={() => decidir("aprovar")}
        carregando={executando}
        erro={erro}
        titulo={`Aprovar ${u.nome} como docente?`}
        rotuloConfirmar="Aprovar docente"
      >
        <p>Com a aprovação, essa pessoa poderá criar turmas e votações.</p>
      </ConfirmDialog>
      <ConfirmDialog
        aberto={dialogo === "rejeitar"}
        aoFechar={() => setDialogo(null)}
        aoConfirmar={() => decidir("rejeitar")}
        carregando={executando}
        erro={erro}
        variante="danger"
        titulo={`Rejeitar o acesso de ${u.nome}?`}
        rotuloConfirmar="Rejeitar acesso"
        rotuloCancelar="Cancelar"
      >
        <p>A conta fica bloqueada e não poderá usar o sistema. Esta tela não oferece forma de desfazer a rejeição.</p>
      </ConfirmDialog>
    </div>
  );
}
