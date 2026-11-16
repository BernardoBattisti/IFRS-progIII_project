import type { Metadata } from "next";
import { Protegido } from "@/components/Sessao";
import { Cadastro } from "./Cadastro";

export const metadata: Metadata = { title: "Concluir cadastro" };

export default function Page() {
  return (
    <Protegido status="CADASTRO_INCOMPLETO">
      <Cadastro />
    </Protegido>
  );
}
