import type { Metadata } from "next";
import { Cadastro } from "./Cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function Page() {
  return <Cadastro />;
}
