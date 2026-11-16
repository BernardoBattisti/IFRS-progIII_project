// Cliente HTTP mínimo. Toda chamada vai para /api/* na MESMA origem (o Next
// repassa ao backend), então o cookie HttpOnly de sessão segue automaticamente.
// Nenhum token é lido ou guardado em JavaScript.

export type ErroApi = {
  status: number;
  erro?: string;
  mensagem: string;
  campos?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly erro?: string;
  readonly campos?: Record<string, string>;

  constructor(dados: ErroApi) {
    super(dados.mensagem);
    this.name = "ApiError";
    this.status = dados.status;
    this.erro = dados.erro;
    this.campos = dados.campos;
  }
}

const MENSAGENS_PADRAO: Record<number, string> = {
  400: "Alguns dados não estão corretos. Revise os campos destacados.",
  401: "Sua sessão terminou. Entre novamente para continuar.",
  403: "Você não tem permissão para fazer isso.",
  404: "Não encontramos o que você procurou. Pode ter sido removido.",
  409: "Essa ação entrou em conflito com o estado atual. Atualize a página e tente de novo.",
  413: "O arquivo é grande demais.",
  422: "Não foi possível concluir por causa de uma regra do sistema.",
};

function mensagemPadrao(status: number) {
  if (MENSAGENS_PADRAO[status]) return MENSAGENS_PADRAO[status];
  if (status >= 500) return "O servidor teve um problema. Tente de novo em alguns instantes.";
  return "Algo deu errado. Tente de novo.";
}

type Opcoes = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T = unknown>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { body, headers, ...resto } = opcoes;
  const ehFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...resto,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !ehFormData ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body:
        body === undefined ? undefined : ehFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({
      status: 0,
      mensagem: "Sem conexão com o servidor. Verifique sua internet e tente de novo.",
    });
  }

  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  let dados: unknown = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    const d = (dados ?? {}) as Partial<ErroApi>;
    throw new ApiError({
      status: resposta.status,
      erro: d.erro,
      mensagem:
        typeof d.mensagem === "string" && d.mensagem ? d.mensagem : mensagemPadrao(resposta.status),
      campos: d.campos && typeof d.campos === "object" ? d.campos : undefined,
    });
  }
  return dados as T;
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Algo deu errado. Tente de novo.";
}
