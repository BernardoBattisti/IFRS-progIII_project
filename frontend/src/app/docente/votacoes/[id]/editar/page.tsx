"use client";

import { useTitulo } from "@/lib/useTitulo";
import { Trilha } from "@/components/ui/Trilha";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Votacao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { ErroCarregar } from "@/components/ErroCarregar";
import { Alert } from "@/components/ui/Alert";
import { VotacaoForm } from "@/components/VotacaoForm";

export default function EditarVotacao() {
  useTitulo("Editar rascunho");
  const { id } = useParams<{ id: string }>();
  const { dados: v, erro, carregando, recarregar } = useDados(() => api<Votacao>(`/votacoes/${id}`), [id]);
  return (
    <>
      <PageHeader
        antes={
          <Trilha
            itens={[
              { rotulo: "Votações", href: "/docente" },
              { rotulo: v?.titulo ?? "Votação", href: `/docente/votacoes/${id}` },
              { rotulo: "Editar rascunho" },
            ]}
          />
        }
        titulo="Editar rascunho"
      />
      {carregando && <Carregando texto="Carregando votação…" />}
      {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
      {v && v.estado !== "RASCUNHO" && (
        <Alert tom="aviso" titulo="Esta votação não pode mais ser editada">
          <p>Só rascunhos podem ser editados. Depois de publicada, as regras e as opções ficam travadas.</p>
        </Alert>
      )}
      {v && v.estado === "RASCUNHO" && <VotacaoForm inicial={v} />}
    </>
  );
}
