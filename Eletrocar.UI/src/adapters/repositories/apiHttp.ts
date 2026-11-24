/**
 * Utilitários HTTP compartilhados pelos adapters "MockOrHttp": sessão, token e mensagens de erro da API.
 */

/** Parte do repositório de autenticação de que os adapters precisam. */
export interface SessaoApi {
  isModoApi(): boolean;
  obterAccessToken(): string | null;
}

/** Converte a resposta de erro da API (`{erro}` do domínio ou `{detail}` do FastAPI) em mensagem legível. */
export async function mensagemDeErro(res: Response, acao: string): Promise<string> {
  if (res.status === 403) return `Seu perfil não tem permissão para ${acao}.`;
  try {
    const corpo = (await res.json()) as { erro?: string; detail?: unknown };
    if (corpo.erro) return corpo.erro;
    if (Array.isArray(corpo.detail)) {
      return corpo.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ");
    }
    if (typeof corpo.detail === "string") return corpo.detail;
  } catch {
    // corpo sem JSON: usa a mensagem genérica abaixo
  }
  return `Falha ao ${acao} (HTTP ${res.status}).`;
}

/** Faz a chamada autenticada e devolve o JSON; lança Error com a mensagem da API em caso de falha. */
export async function requisitarApi<T>(
  sessao: SessaoApi | undefined,
  url: string,
  acao: string,
  init: RequestInit = {}
): Promise<T> {
  const token = sessao?.obterAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(await mensagemDeErro(res, acao));
  return (await res.json()) as T;
}
