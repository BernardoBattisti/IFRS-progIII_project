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
import { ROTULO_STATUS, StatusBadge } from "@/components/ui/Badge";
import { DecisaoDocente } from "@/components/DecisaoDocente";
import { Tabela, celula } from "@/components/ui/Tabela";
import styles from "./page.module.css";

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
      <form className={styles.filtros} onSubmit={(e) => e.preventDefault()} aria-label="Filtrar usuários">
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
      </form>
      {aviso && (
        <Alert tom="sucesso" anunciar className={styles.aviso}>
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
          <p className={styles.contagem} role="status">
            {dados.length} {dados.length === 1 ? "usuário" : "usuários"}
          </p>
          <Tabela legenda="Usuários do sistema">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Matrícula</th>
                <th scope="col">Papel</th>
                <th scope="col">Situação</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((u) => (
                <tr key={u.id}>
                  <td data-rotulo="Nome" className={`${celula.principal} ${celula.semRotulo}`}>
                    {u.nome}
                  </td>
                  <td data-rotulo="E-mail" className={styles.email}>
                    {u.email}
                  </td>
                  <td data-rotulo="Matrícula">{u.matricula ?? "—"}</td>
                  <td data-rotulo="Papel">{PAPEIS[u.papel]}</td>
                  <td data-rotulo="Situação">
                    <StatusBadge status={u.status} />
                  </td>
                  <td data-rotulo="Ações" className={celula.acoes}>
                    {/* O admin fixo nunca recebe ações (seção 2.3). */}
                    {u.papel === "DOCENTE" && u.status === "PENDENTE_APROVACAO" ? (
                      <DecisaoDocente
                        u={u}
                        aoDecidir={(novo, msg) => {
                          setDados((l) => (l ?? []).map((x) => (x.id === novo.id ? novo : x)));
                          setAviso(msg);
                        }}
                      />
                    ) : u.papel === "ADMIN" ? (
                      <span className={celula.auxiliar}>Conta fixa do sistema</span>
                    ) : (
                      <span className={celula.auxiliar}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </>
      )}
    </>
  );
}
