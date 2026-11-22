import type { ReactNode } from "react";
import { Marca } from "./AppShell";
import { Card } from "./ui/Card";

/** Moldura das telas públicas (login, cadastro, recuperação de senha). */
export function TelaPublica({
  titulo,
  descricao,
  children,
  rodape,
  largura = "max-w-md",
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: "max-w-md" | "max-w-lg";
}) {
  return (
    <main id="conteudo" tabIndex={-1} className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
      <div className={`w-full ${largura} space-y-6`}>
        <div className="flex justify-center">
          <Marca />
        </div>
        <Card className="space-y-6">
          <div className="space-y-1 text-center">
            <h1 id="titulo-tela" tabIndex={-1} className="text-2xl font-bold">
              {titulo}
            </h1>
            {descricao && <p className="text-ink-muted">{descricao}</p>}
          </div>
          {children}
        </Card>
        {rodape && <div className="text-center text-sm text-ink-muted">{rodape}</div>}
      </div>
    </main>
  );
}

/** Link de texto no padrão da marca (sublinhado, alvo de toque confortável). */
export const classeLinkTexto =
  "inline-flex min-h-11 items-center rounded-md font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800 sm:min-h-0";

/** Leva o foco ao título da tela pública (após trocar de etapa sem mudar de rota). */
export function focarTituloTela() {
  requestAnimationFrame(() => document.getElementById("titulo-tela")?.focus());
}
