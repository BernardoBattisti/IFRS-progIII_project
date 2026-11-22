import type { Metadata } from "next";
import { Suspense } from "react";
import { RedefinirSenha } from "./RedefinirSenha";

export const metadata: Metadata = { title: "Criar nova senha" };

export default function Page() {
  return (
    <Suspense>
      <RedefinirSenha />
    </Suspense>
  );
}
