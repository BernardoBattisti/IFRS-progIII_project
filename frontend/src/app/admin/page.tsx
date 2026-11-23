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
import { Tabela, celula } from "@/components/ui/Tabela";
import styles from "./page.module.css";

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
        <Alert tom="sucesso" anunciar className={styles.aviso}>
          <p>{aviso}</p>
        </Alert>
      )}
      {carregando && <Carregando texto="Carregando pedidos…" />}
      {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {dados && dados.length === 0 && (
        <EmptyState titulo="Nenhum pedido pendente">Quando um docente criar uma conta, o pedido de acesso aparece aqui.</EmptyState>
      )}
      {dados && dados.length > 0 && (
        <Tabela legenda="Docentes aguardando aprovação">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">E-mail</th>
              <th scope="col">Matrícula</th>
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
                <td className={`${celula.acoes} ${celula.semRotulo}`}>
                  <DecisaoDocente
                    u={u}
                    aoDecidir={(_, msg) => {
                      setDados((l) => (l ?? []).filter((x) => x.id !== u.id));
                      setAviso(msg);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </>
  );
}
