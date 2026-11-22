"use client";

import { useTitulo } from "@/lib/useTitulo";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { VotacaoForm } from "@/components/VotacaoForm";

export default function NovaVotacao() {
  useTitulo("Nova votação");
  return (
    <>
      <PageHeader
        antes={
          <Link href="/docente" className="inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline">
            <span aria-hidden="true">←&nbsp;</span>Voltar para votações
          </Link>
        }
        titulo="Nova votação"
        descricao="Preencha os dados e salve como rascunho. Você publica depois."
      />
      <VotacaoForm />
    </>
  );
}
