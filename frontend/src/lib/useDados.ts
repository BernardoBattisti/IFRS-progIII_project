"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { mensagemDeErro, ApiError } from "./api";

type Estado<T> = {
  chave: string | null;
  dados: T | null;
  erro: string | null;
  status: number | null;
};

/**
 * Carrega dados de uma função assíncrona sempre que `deps` mudam.
 * `intervaloMs` (opcional) faz polling silencioso enquanto a aba está visível;
 * no polling, erros transitórios não apagam os dados já exibidos.
 */
export function useDados<T>(carregar: () => Promise<T>, deps: unknown[], intervaloMs?: number | null) {
  const chave = JSON.stringify(deps);
  const [estado, setEstado] = useState<Estado<T>>({ chave: null, dados: null, erro: null, status: null });
  const [rodada, setRodada] = useState(0);
  const fnRef = useRef(carregar);
  useEffect(() => {
    fnRef.current = carregar;
  });

  // Carga inicial (e a cada mudança de deps ou "tentar de novo").
  useEffect(() => {
    let ativo = true;
    fnRef
      .current()
      .then((dados) => ativo && setEstado({ chave, dados, erro: null, status: null }))
      .catch(
        (e: unknown) =>
          ativo &&
          setEstado({
            chave,
            dados: null,
            erro: mensagemDeErro(e),
            status: e instanceof ApiError ? e.status : null,
          }),
      );
    return () => {
      ativo = false;
    };
  }, [chave, rodada]);

  // Polling silencioso.
  useEffect(() => {
    if (!intervaloMs) return;
    let ativo = true;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fnRef
        .current()
        .then((dados) => ativo && setEstado((s) => (s.chave === chave ? { ...s, dados, erro: null, status: null } : s)))
        .catch(() => undefined);
    }, intervaloMs);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [intervaloMs, chave]);

  const atual = estado.chave === chave;
  const setDados = useCallback(
    (acao: SetStateAction<T | null>) =>
      setEstado((s) => ({
        ...s,
        dados: typeof acao === "function" ? (acao as (p: T | null) => T | null)(s.dados) : acao,
      })),
    [],
  );
  const recarregar = useCallback(() => {
    setEstado((s) => ({ ...s, chave: null }));
    setRodada((r) => r + 1);
  }, []);

  return {
    dados: atual ? estado.dados : null,
    erro: atual ? estado.erro : null,
    status: atual ? estado.status : null,
    carregando: !atual,
    setDados,
    recarregar,
  };
}
