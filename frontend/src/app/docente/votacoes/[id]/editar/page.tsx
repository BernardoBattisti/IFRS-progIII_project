"use client";

import { useTitulo } from "@/lib/useTitulo";
import Link from "next/link";
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
          <Link
            href={`/docente/votacoes/${id}`}
            className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline"
          >
            <span aria-hidden="true">←&nbsp;</span>Voltar para a votação
          </Link>
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
