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
  429: "Muitas tentativas. Aguarde um minuto e tente de novo.",
};

// Rotas públicas de autenticação: um 403 de domínio aqui é exibido na própria tela.
const ROTAS_PUBLICAS = ["/auth/login", "/auth/cadastro", "/auth/esqueci-senha", "/auth/redefinir-senha"];

/** Chave do sessionStorage com a mensagem mostrada no login após a sessão ser encerrada. */
export const CHAVE_MSG_SESSAO = "votacoes:sessao-encerrada";

/** 403 por domínio de e-mail não aceito (seção 2.2): o backend usa `erro: "DOMINIO_NAO_ACEITO"`. */
export function ehErroDominio(e: unknown): e is ApiError {
  return e instanceof ApiError && e.status === 403 && e.erro === "DOMINIO_NAO_ACEITO";
}

let encerrando = false;

/**
 * Sessão aberta cujo domínio deixou de ser aceito: encerra a sessão e leva ao
 * login com a mensagem do backend. Devolve true se a navegação foi iniciada.
 */
function encerrarPorDominio(mensagem: string): boolean {
  if (typeof window === "undefined" || window.location.pathname === "/login") return false;
  if (encerrando) return true;
  encerrando = true;
  try {
    window.sessionStorage.setItem(CHAVE_MSG_SESSAO, mensagem);
  } catch {
    // Sem sessionStorage, o login mostra um texto padrão.
  }
  fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    .catch(() => undefined)
    .finally(() => window.location.replace("/login?motivo=dominio"));
  return true;
}

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
    const erro = new ApiError({
      status: resposta.status,
      erro: d.erro,
      mensagem:
        typeof d.mensagem === "string" && d.mensagem ? d.mensagem : mensagemPadrao(resposta.status),
      campos: d.campos && typeof d.campos === "object" ? d.campos : undefined,
    });
    if (ehErroDominio(erro) && !ROTAS_PUBLICAS.includes(caminho.split("?")[0])) {
      // Indo para o login: a promessa fica pendente para a tela não piscar um erro.
      if (encerrarPorDominio(erro.message)) return new Promise<T>(() => undefined);
    }
    throw erro;
  }
  return dados as T;
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Algo deu errado. Tente de novo.";
}
