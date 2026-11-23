"use client";

import { useTitulo } from "@/lib/useTitulo";
import { Trilha } from "@/components/ui/Trilha";
import { PageHeader } from "@/components/ui/PageHeader";
import { VotacaoForm } from "@/components/VotacaoForm";

export default function NovaVotacao() {
  useTitulo("Nova votação");
  return (
    <>
      <PageHeader
        antes={<Trilha itens={[{ rotulo: "Votações", href: "/docente" }, { rotulo: "Nova votação" }]} />}
        titulo="Nova votação"
        descricao="Preencha os dados e salve como rascunho. Você publica depois."
      />
      <VotacaoForm />
    </>
  );
}
