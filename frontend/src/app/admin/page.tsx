"use client";

import { useTitulo } from "@/lib/useTitulo";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Usuario } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErroCarregar } from "@/components/ErroCarregar";
import { Alert } from "@/components/ui/Alert";
import { DecisaoDocente } from "@/components/DecisaoDocente";

export default function FilaAprovacao() {
  useTitulo("Aprovações");
  const { dados, setDados, erro, carregando, recarregar } = useDados(
    () => api<Usuario[]>("/admin/usuarios?status=PENDENTE_APROVACAO&papel=DOCENTE"),
    [],
  );
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        titulo="Docentes aguardando aprovação"
        descricao="Confira se a pessoa é mesmo docente antes de aprovar: docentes aprovados podem criar votações."
      />
      {aviso && (
        <Alert tom="sucesso" anunciar className="mb-4">
          <p>{aviso}</p>
        </Alert>
      )}
      {carregando && <Carregando texto="Carregando pedidos…" />}
      {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {dados && dados.length === 0 && (
        <EmptyState titulo="Nenhum pedido pendente">Quando um docente criar uma conta, o pedido de acesso aparece aqui.</EmptyState>
      )}
      {dados && dados.length > 0 && (
        <ul className="space-y-3">
          {dados.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]"
            >
              <div className="min-w-0">
                <p className="break-words font-semibold">{u.nome}</p>
                <p className="break-all text-sm text-ink-muted">{u.email}</p>
                <p className="text-sm text-ink-muted">Matrícula {u.matricula ?? "—"}</p>
              </div>
              <DecisaoDocente
                u={u}
                aoDecidir={(_, msg) => {
                  setDados((l) => (l ?? []).filter((x) => x.id !== u.id));
                  setAviso(msg);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
