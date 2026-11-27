/**
 * Leitura e exibição de números no formato brasileiro.
 *
 * Quem digita no balcão escreve "1.250,90", "1250,90", "R$ 1.000" ou até "1250.90".
 * Antes, cada tela convertia do seu jeito e "1.200,00" virava 1,20 — este é o único ponto de conversão.
 */

/** Converte o texto digitado em número; devolve NaN se estiver vazio ou não for um valor. */
export function lerValorBR(texto: string | null | undefined): number {
  if (texto == null) return NaN;
  let limpo = String(texto).replace(/R\$/gi, "").replace(/\s/g, "").trim();
  if (!limpo) return NaN;

  const negativo = limpo.startsWith("-");
  if (negativo) limpo = limpo.slice(1);

  if (limpo.includes(",")) {
    // Vírgula é o separador decimal; pontos são de milhar ("1.250,90").
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // Só pontos em grupos de três ("1.000", "12.500"): separador de milhar.
    limpo = limpo.replace(/\./g, "");
  }
  // Caso contrário o ponto é decimal ("1250.90", "0.5").

  if (!/^\d+(\.\d+)?$/.test(limpo)) return NaN;
  const valor = Number(limpo);
  return negativo ? -valor : valor;
}

/** "R$ 1.250,90" */
export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Valor para preencher um campo de texto: "1250,90". */
export function valorParaCampo(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

/** "35,9%" */
export function formatarPercentual(valor: number, casas = 1): string {
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}
