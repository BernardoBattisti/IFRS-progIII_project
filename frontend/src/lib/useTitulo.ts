"use client";

import { useEffect } from "react";

/** Título da aba (WCAG 2.4.2) para páginas client-side. */
export function useTitulo(titulo: string | null | undefined) {
  useEffect(() => {
    if (titulo) document.title = `${titulo} · Votações IFRS`;
  }, [titulo]);
}
