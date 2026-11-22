import type { NextConfig } from "next";

/**
 * O proxy de `/api/*` para o backend NÃO é feito com `rewrites()`:
 * no build `output: "standalone"` as regras de rewrite são gravadas no
 * manifesto durante o `next build`, então `BACKEND_URL` ficaria fixo no
 * valor do momento do build. Em vez disso, `src/app/api/[...path]/route.ts`
 * lê `process.env.BACKEND_URL` a cada requisição (runtime).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
