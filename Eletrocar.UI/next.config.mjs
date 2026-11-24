/**
 * A UI chama sempre "/api/v1/..." no próprio domínio e o Next.js repassa à API (Render/Docker).
 * O endereço da API vem de ELETROCAR_API_URL (Vercel) ou API_URL (pipeline do GitHub Actions)
 * e é normalizado, porque valores colados em painéis costumam vir com aspas, espaços,
 * sem "https://" ou já terminando em "/api/v1".
 */
const API_LOCAL = "http://127.0.0.1:8000";

/** Devolve a URL base da API (ex.: "https://eletrocar-api.onrender.com") ou null se o valor for inválido. */
export function normalizarUrlApi(valor) {
  if (typeof valor !== "string") return null;
  let url = valor.trim().replace(/^["']+|["']+$/g, "").trim();
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !/^https?:\/\//i.test(url)) return null; // ftp://, ws://...
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, "").replace(/\/api\/v1$/i, "").replace(/\/+$/, "");
  try {
    const { protocol, hostname } = new URL(url);
    if (!hostname || !/^https?:$/.test(protocol) || /\s/.test(url)) return null;
    return url;
  } catch {
    return null;
  }
}

/** Primeiro endereço válido entre as variáveis; no deploy de produção, exige um. */
export function resolverUrlApi(env = process.env) {
  const url = [env.ELETROCAR_API_URL, env.API_URL].map(normalizarUrlApi).find(Boolean);
  if (url) return url;
  if (env.ELETROCAR_EXIGIR_API_URL === "1") {
    throw new Error(
      "Endereço da API não configurado: defina ELETROCAR_API_URL (Vercel) ou a variável API_URL do GitHub " +
        "com a URL pública do Render, ex.: https://eletrocar-api.onrender.com"
    );
  }
  return API_LOCAL;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  async rewrites() {
    const apiBase = resolverUrlApi();
    console.log(`[eletrocar] /api/v1/* -> ${new URL(apiBase).host}`);
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
