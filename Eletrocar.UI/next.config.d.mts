import type { NextConfig } from "next";

/** Devolve a URL base da API (ex.: "https://eletrocar-api.onrender.com") ou null se o valor for inválido. */
export function normalizarUrlApi(valor: unknown): string | null;

/** Primeiro endereço válido entre ELETROCAR_API_URL e API_URL; com ELETROCAR_EXIGIR_API_URL=1, exige um. */
export function resolverUrlApi(env?: Record<string, string | undefined>): string;

declare const nextConfig: NextConfig;
export default nextConfig;
