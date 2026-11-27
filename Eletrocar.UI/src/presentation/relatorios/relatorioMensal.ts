/**
 * Relatório financeiro do mês (gastos e lucros) em HTML A4, pronto para imprimir ou "Salvar como PDF".
 * Usa os dados que a tela Financeiro & DRE já carregou: a DRE do período e o detalhamento
 * (vendas, ordens de serviço e despesas pagas).
 */
import type {
  DadosDREPeriodo,
  DetalhamentoDRE,
} from "../../application/ports/repositories/IRelatorioDRERepository";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";

export interface DadosRelatorioMensal {
  dre: DadosDREPeriodo;
  detalhamento: DetalhamentoDRE | null;
  geradoEm: Date;
  geradoPor?: string | null;
}

const FORMA: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
  BOLETO: "Boleto",
  FATURADO: "Faturado",
};

const CATEGORIA: Record<string, string> = {
  DESPESA_FIXA: "Despesa fixa",
  DESPESA_VARIAVEL: "Despesa variável",
  COMPRA_MERCADORIA: "Compra de mercadoria",
  OUTROS: "Outros",
};

/** Escapa texto vindo do banco antes de entrar no HTML do relatório. */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const r = (d: Dinheiro) => escaparHtml(d.formatar());
const data = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");
const dataHora = (d: Date) =>
  d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const forma = (f: string | null) => escaparHtml(f ? FORMA[f] ?? f : "—");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Nome do arquivo sugerido ao salvar em PDF (vem do <title>). */
export function tituloRelatorio(dre: DadosDREPeriodo): string {
  const periodo = dre.competenciaLabel.replace(/\s*\/\s*/g, "-").replace(/\s+/g, "-");
  return `Relatorio-Eletrocar-${periodo}`;
}

export function montarRelatorioMensalHtml({ dre, detalhamento, geradoEm, geradoPor }: DadosRelatorioMensal): string {
  const gastos = dre.custosDiretosTotal.somar(dre.despesasTotais);
  const prejuizo = dre.lucroLiquido.centavos < 0;
  const vendas = detalhamento?.vendas ?? [];
  const ordens = detalhamento?.ordensServico ?? [];
  const despesas = detalhamento?.despesas ?? [];
  const semLancamentos = detalhamento?.origemDados === "DEMO" || !detalhamento;

  const linhaDre = (rotulo: string, valor: Dinheiro, classe = "") =>
    `<tr class="${classe}"><td>${escaparHtml(rotulo)}</td><td class="num">${r(valor)}</td></tr>`;

  const tabelaDespesas = despesas.length
    ? `<table>
<thead><tr><th>Pagamento</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th class="num">Valor</th></tr></thead>
<tbody>${despesas
        .map(
          (d) => `<tr><td class="nw">${data(d.dataPagamento)}</td><td>${escaparHtml(d.descricao)}${
            d.entraNoDRE ? "" : ' <span class="obs">(fora da DRE: vira CMV ao vender)</span>'
          }</td><td>${escaparHtml(CATEGORIA[d.categoria] ?? d.categoria)}</td><td>${forma(d.formaPagamento)}</td><td class="num">${r(d.valor)}</td></tr>`
        )
        .join("")}</tbody>
<tfoot><tr><td colspan="4">Total de despesas na DRE</td><td class="num">${r(detalhamento!.totalDespesas)}</td></tr></tfoot>
</table>`
    : `<p class="vazio">Nenhuma conta paga no período.</p>`;

  const tabelaVendas = vendas.length
    ? `<table>
<thead><tr><th>Data</th><th>Venda</th><th>Vendedor</th><th>Pagamento</th><th class="num">Lucro bruto</th><th class="num">Total</th></tr></thead>
<tbody>${vendas
        .map(
          (v) => `<tr><td class="nw">${escaparHtml(dataHora(v.data))}</td><td class="nw">${escaparHtml(v.numero)}</td><td>${escaparHtml(v.operador ?? "—")}</td><td>${forma(v.formaPagamento)}</td><td class="num">${r(v.lucroBruto)}</td><td class="num">${r(v.total)}</td></tr>`
        )
        .join("")}</tbody>
<tfoot><tr><td colspan="5">Total vendido no balcão</td><td class="num">${r(detalhamento!.totalVendas)}</td></tr></tfoot>
</table>`
    : `<p class="vazio">Nenhuma venda concluída no período.</p>`;

  const tabelaOrdens = ordens.length
    ? `<table>
<thead><tr><th>Entrega</th><th>OS</th><th>Pagamento</th><th class="num">Peças</th><th class="num">Serviços</th><th class="num">Total</th></tr></thead>
<tbody>${ordens
        .map(
          (o) => `<tr><td class="nw">${escaparHtml(dataHora(o.data))}</td><td class="nw">${escaparHtml(o.numero)}</td><td>${forma(o.formaPagamento)}</td><td class="num">${r(o.valorPecas)}</td><td class="num">${r(o.valorServicos)}</td><td class="num">${r(o.total)}</td></tr>`
        )
        .join("")}</tbody>
<tfoot><tr><td colspan="5">Total das ordens de serviço</td><td class="num">${r(detalhamento!.totalOrdensServico)}</td></tr></tfoot>
</table>`
    : `<p class="vazio">Nenhuma ordem de serviço entregue no período.</p>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escaparHtml(tituloRelatorio(dre))}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #1C1E23; font-size: 11pt; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #C62233; padding-bottom: 10px; margin-bottom: 18px; }
  .marca { font-weight: 800; font-size: 20pt; letter-spacing: 1px; }
  .marca span { color: #C62233; }
  h1 { font-size: 15pt; margin: 4px 0 0; }
  .meta { text-align: right; font-size: 9pt; color: #4A4F59; line-height: 1.5; }
  h2 { font-size: 12.5pt; margin: 22px 0 8px; color: #16181D; border-left: 4px solid #C62233; padding-left: 8px; break-after: avoid; }
  .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .cartao { border: 1px solid #E2DED7; border-radius: 8px; padding: 10px 12px; }
  .cartao .rot { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .5px; color: #4A4F59; }
  .cartao .val { font-size: 15pt; font-weight: 700; margin-top: 4px; }
  .pos { color: #146C43; } .neg { color: #B42318; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; background: #F5F3EF; font-weight: 700; padding: 6px 8px; border-bottom: 1px solid #D5D0C8; }
  td { padding: 5px 8px; border-bottom: 1px solid #ECE9E3; vertical-align: top; }
  tr { break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; }
  .nw { white-space: nowrap; }
  tfoot td { font-weight: 700; border-top: 2px solid #1C1E23; border-bottom: none; }
  .dre td:first-child { padding-left: 18px; }
  .dre .grupo td { font-weight: 700; padding-left: 8px; background: #FAF9F6; }
  .dre .total td { font-weight: 800; border-top: 2px solid #1C1E23; padding-left: 8px; }
  .obs { color: #4A4F59; font-size: 8.5pt; }
  .vazio { color: #4A4F59; font-style: italic; margin: 4px 0; }
  .aviso { background: #FFF6E5; border: 1px solid #F0C36D; border-radius: 6px; padding: 8px 10px; font-size: 9pt; margin-bottom: 12px; }
  footer { margin-top: 26px; font-size: 8.5pt; color: #4A4F59; border-top: 1px solid #E2DED7; padding-top: 8px; }
</style>
</head>
<body>
<header>
  <div>
    <div class="marca">ELETRO<span>CAR</span></div>
    <h1>Relatório financeiro · ${escaparHtml(dre.competenciaLabel)}</h1>
  </div>
  <div class="meta">
    Auto Elétrica Eletrocar<br>
    Gerado em ${escaparHtml(dataHora(geradoEm))}${geradoPor ? ` por ${escaparHtml(geradoPor)}` : ""}
  </div>
</header>

${
  semLancamentos
    ? `<div class="aviso">${
        dre.origemDados === "DEMO"
          ? "Dados da base demonstrativa: os totais são de exemplo e não há lançamentos individuais."
          : "Os lançamentos individuais não puderam ser carregados; o relatório traz apenas os totais."
      }</div>`
    : ""
}

<h2>Resumo do mês</h2>
<div class="resumo">
  <div class="cartao"><div class="rot">Receita bruta</div><div class="val">${r(dre.receitaBrutaTotal)}</div></div>
  <div class="cartao"><div class="rot">Gastos (custos + despesas)</div><div class="val">${r(gastos)}</div></div>
  <div class="cartao"><div class="rot">${prejuizo ? "Prejuízo líquido" : "Lucro líquido"}</div><div class="val ${prejuizo ? "neg" : "pos"}">${r(dre.lucroLiquido)}</div></div>
  <div class="cartao"><div class="rot">Margem líquida</div><div class="val ${prejuizo ? "neg" : "pos"}">${pct(dre.margemLiquidaPercentual)}</div></div>
</div>
<p class="obs" style="margin-top:6px">${dre.quantidadeVendas} venda(s) no balcão e ${dre.quantidadeOS} ordem(ns) de serviço entregue(s).</p>

<h2>Demonstrativo de resultado (DRE)</h2>
<table class="dre">
  <tbody>
    ${linhaDre("Receita de vendas de peças", dre.receitaVendasProdutos)}
    ${linhaDre("Receita de serviços (OS)", dre.receitaServicosOS)}
    ${linhaDre("Receita bruta", dre.receitaBrutaTotal, "grupo")}
    ${linhaDre("(−) Deduções e descontos", dre.deducoesDescontos)}
    ${linhaDre("(=) Receita líquida", dre.receitaLiquida, "grupo")}
    ${linhaDre("(−) Custo das peças vendidas (CMV)", dre.cmvPecas)}
    ${linhaDre("(−) Mão de obra direta", dre.custoMaoObra)}
    ${linhaDre(`(=) Lucro bruto · margem ${pct(dre.margemBrutaPercentual)}`, dre.lucroBruto, "grupo")}
    ${linhaDre("(−) Despesas fixas", dre.despesasFixas)}
    ${linhaDre("(−) Despesas variáveis", dre.despesasVariaveis)}
    ${linhaDre(prejuizo ? "(=) Prejuízo líquido do período" : "(=) Lucro líquido do período", dre.lucroLiquido, "total")}
  </tbody>
</table>

<h2>Gastos do mês (contas pagas)</h2>
${tabelaDespesas}

<h2>Vendas no balcão</h2>
${tabelaVendas}

<h2>Ordens de serviço entregues</h2>
${tabelaOrdens}

<footer>
  Valores do período ${escaparHtml(detalhamento?.periodo ?? dre.competenciaLabel)}. Gastos = custo das peças vendidas + mão de obra + despesas pagas.
  Compras de mercadoria não entram como despesa: o custo aparece no CMV quando a peça é vendida.
</footer>
</body>
</html>`;
}

/**
 * Abre a impressão do relatório (o navegador oferece "Salvar como PDF") sem abrir outra aba:
 * o documento é carregado num iframe invisível, que é removido depois.
 */
export function imprimirDocumento(html: string, doc: Document = document): void {
  const iframe = doc.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "Relatório";
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  let removido = false;
  const remover = () => {
    if (!removido) {
      removido = true;
      iframe.remove();
    }
  };
  iframe.onload = () => {
    const janela = iframe.contentWindow;
    if (!janela) return remover();
    janela.addEventListener("afterprint", () => setTimeout(remover, 100));
    setTimeout(remover, 10 * 60_000); // garantia: não deixa o iframe para trás
    janela.focus();
    janela.print();
  };
  iframe.srcdoc = html;
  doc.body.appendChild(iframe);
}
