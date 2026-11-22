import type { Metadata } from "next";
import { EsqueciSenha } from "./EsqueciSenha";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function Page() {
  return <EsqueciSenha />;
}
