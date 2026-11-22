// Proxy reverso de /api/* para o backend Spring Boot.
//
// Por que não `rewrites()` no next.config? No build `output: "standalone"` as
// regras de rewrite são resolvidas no `next build` e gravadas no manifesto;
// BACKEND_URL ficaria fixo no valor do momento do build. Aqui a variável é
// lida a cada requisição, então a mesma imagem Docker funciona em qualquer
// ambiente (ex.: BACKEND_URL=http://backend:8080 no docker compose).
//
// O navegador só conversa com o Next (mesma origem): o cookie HttpOnly de
// sessão definido pelo backend é repassado sem alteração e não há CORS.

import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Cabeçalhos que não devem ser repassados entre conexões (RFC 9110 §7.6.1),
// além de host/content-length, que o fetch recalcula.
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function backendUrl(): string {
  return (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "");
}

async function proxy(req: NextRequest): Promise<Response> {
  const base = backendUrl();
  const entrada = new URL(req.url);
  const destino = `${base}${entrada.pathname}${entrada.search}`;

  const headers = new Headers();
  req.headers.forEach((valor, nome) => {
    if (!HOP_BY_HOP.has(nome.toLowerCase())) headers.set(nome, valor);
  });
  // Informa ao backend o endereço público (host e protocolo originais).
  const hostPublico = req.headers.get("host");
  if (hostPublico) headers.set("x-forwarded-host", hostPublico);
  headers.set("x-forwarded-proto", entrada.protocol.replace(":", ""));
  // Pede resposta sem compressão para repassar o corpo como veio.
  headers.delete("accept-encoding");

  const temCorpo = req.method !== "GET" && req.method !== "HEAD";
  let resposta: Response;
  try {
    resposta = await fetch(destino, {
      method: req.method,
      headers,
      // Corpos são pequenos (JSON ou imagem de até 5 MB): bufferizar é simples e robusto.
      body: temCorpo ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json(
      {
        status: 502,
        erro: "BACKEND_INDISPONIVEL",
        mensagem: "O servidor está indisponível no momento. Tente de novo em alguns instantes.",
      },
      { status: 502 },
    );
  }

  const saida = new Headers();
  resposta.headers.forEach((valor, nome) => {
    const n = nome.toLowerCase();
    if (HOP_BY_HOP.has(n) || n === "content-encoding" || n === "set-cookie") return;
    saida.set(nome, valor);
  });
  for (const cookie of resposta.headers.getSetCookie()) saida.append("set-cookie", cookie);

  // Redirects internos do backend (absolutos para BACKEND_URL) viram relativos.
  const location = resposta.headers.get("location");
  if (location && location.startsWith(base)) {
    saida.set("location", location.slice(base.length) || "/");
  }

  const semCorpo = [101, 204, 205, 304].includes(resposta.status) || req.method === "HEAD";
  return new Response(semCorpo ? null : resposta.body, {
    status: resposta.status,
    statusText: resposta.statusText,
    headers: saida,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
