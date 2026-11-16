"use client";

import { useTitulo } from "@/lib/useTitulo";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Papel, StatusConta, Usuario } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErroCarregar } from "@/components/ErroCarregar";
import { SelectField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Badge, ROTULO_STATUS, StatusBadge } from "@/components/ui/Badge";
import { DecisaoDocente } from "@/components/DecisaoDocente";

const PAPEIS: Record<Papel, string> = { ALUNO: "Aluno", DOCENTE: "Docente", ADMIN: "Administrador" };

export default function Usuarios() {
  useTitulo("Usuários");
  const [status, setStatus] = useState<StatusConta | "">("");
  const [papel, setPapel] = useState<Papel | "">("");
  const [aviso, setAviso] = useState<string | null>(null);
  const { dados, setDados, erro, carregando, recarregar } = useDados(() => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (papel) q.set("papel", papel);
    const s = q.toString();
    return api<Usuario[]>(`/admin/usuarios${s ? `?${s}` : ""}`);
  }, [status, papel]);

  return (
    <>
      <PageHeader titulo="Usuários" descricao="Todas as contas do sistema." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:w-2/3">
        <SelectField rotulo="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusConta | "")}>
          <option value="">Todos os status</option>
          {(Object.keys(ROTULO_STATUS) as StatusConta[]).map((s) => (
            <option key={s} value={s}>
              {ROTULO_STATUS[s]}
            </option>
          ))}
        </SelectField>
        <SelectField rotulo="Papel" value={papel} onChange={(e) => setPapel(e.target.value as Papel | "")}>
          <option value="">Todos os papéis</option>
          {(Object.keys(PAPEIS) as Papel[]).map((p) => (
            <option key={p} value={p}>
              {PAPEIS[p]}
            </option>
          ))}
        </SelectField>
      </div>
      {aviso && (
        <Alert tom="sucesso" anunciar className="mb-4">
          <p>{aviso}</p>
        </Alert>
      )}
      {carregando && <Carregando texto="Carregando usuários…" />}
      {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {!carregando && dados && dados.length === 0 && (
        <EmptyState titulo="Nenhum usuário encontrado">Tente outro filtro de status ou papel.</EmptyState>
      )}
      {!carregando && dados && dados.length > 0 && (
        <>
          <p className="mb-2 text-sm text-ink-muted" role="status">
            {dados.length} {dados.length === 1 ? "usuário" : "usuários"}
          </p>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {dados.map((u) => (
              <li key={u.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{u.nome}</p>
                  <p className="break-all text-sm text-ink-muted">{u.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <Badge>{u.papel ? PAPEIS[u.papel] : "Sem papel"}</Badge>
                    <StatusBadge status={u.status} />
                    {u.matricula && <span className="text-ink-muted">Matrícula {u.matricula}</span>}
                  </div>
                </div>
                {u.papel === "DOCENTE" && u.status === "PENDENTE_APROVACAO" && (
                  <DecisaoDocente
                    u={u}
                    aoDecidir={(novo, msg) => {
                      setDados((l) => (l ?? []).map((x) => (x.id === novo.id ? novo : x)));
                      setAviso(msg);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
