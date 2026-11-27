import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import type { DadosDREPeriodo } from "../../application/ports/repositories/IRelatorioDRERepository";
import { mapearDetalhamentoApi } from "../../adapters/repositories/MockOrHttpDRERepository";
import {
  escaparHtml,
  imprimirDocumento,
  montarRelatorioMensalHtml,
  tituloRelatorio,
} from "../../presentation/relatorios/relatorioMensal";

vi.mock("../../presentation/relatorios/relatorioMensal", async (original) => {
  const real = await original<typeof import("../../presentation/relatorios/relatorioMensal")>();
  return { ...real, imprimirDocumento: vi.fn(real.imprimirDocumento) };
});

const R = (n: number) => new Dinheiro(n, true);

function dre(lucro: number): DadosDREPeriodo {
  return {
    competenciaLabel: "Outubro / 2026",
    ano: 2026,
    mes: 10,
    origemDados: "API",
    receitaVendasProdutos: R(1096),
    receitaServicosOS: R(450),
    receitaBrutaTotal: R(1546),
    deducoesDescontos: R(0),
    receitaLiquida: R(1546),
    cmvPecas: R(600),
    custoMaoObra: R(180),
    custosDiretosTotal: R(780),
    lucroBruto: R(766),
    margemBrutaPercentual: 49.5,
    despesasFixas: R(3500),
    despesasVariaveis: R(0),
    despesasTotais: R(3500),
    lucroLiquido: R(lucro),
    margemLiquidaPercentual: (lucro / 1546) * 100,
    quantidadeVendas: 1,
    quantidadeOS: 1,
  };
}

const detalhamento = mapearDetalhamentoApi({
  periodo: "01/10/2026 a 31/10/2026",
  total_vendas: "1096.00",
  total_ordens_servico: "450.00",
  total_despesas: "3500.00",
  vendas: [
    {
      id: "v1", numero: "VB-2026-0006", data: "2026-10-09T12:45:00", operador: "Juliana <b>Caixa</b>",
      forma_pagamento: "PIX", subtotal: "1096.00", desconto: "0.00", total: "1096.00", custo: "600.00", lucro_bruto: "496.00",
      itens: [],
    },
  ],
  ordens_servico: [
    {
      id: "o1", numero: "OS-2026-0002", data: "2026-10-09T16:00:00", forma_pagamento: "DINHEIRO",
      valor_pecas: "300.00", valor_servicos: "150.00", desconto: "0.00", total: "450.00", custo_pecas: "180.00",
      itens: [], servicos: [],
    },
  ],
  despesas: [
    { id: "d1", descricao: "Aluguel <script>alert(1)</script>", categoria: "DESPESA_FIXA", valor: "3500.00", data_pagamento: "2026-10-05", forma_pagamento: "PIX", entra_no_dre: true },
    { id: "d2", descricao: "Compra Bosch", categoria: "COMPRA_MERCADORIA", valor: "900.00", data_pagamento: "2026-10-08", forma_pagamento: "BOLETO", entra_no_dre: false },
  ],
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(imprimirDocumento).mockClear();
});

describe("Relatório financeiro do mês", () => {
  it("traz resumo, DRE, gastos, vendas e OS do período", () => {
    const html = montarRelatorioMensalHtml({
      dre: dre(-2734),
      detalhamento,
      geradoEm: new Date(2026, 10, 24, 18, 30),
      geradoPor: "Administrador",
    });
    const doc = new DOMParser().parseFromString(html, "text/html");
    const texto = doc.body.textContent ?? "";

    expect(doc.title).toBe("Relatorio-Eletrocar-Outubro-2026");
    expect(texto).toContain("Relatório financeiro · Outubro / 2026");
    expect(texto).toContain("por Administrador");
    expect(texto).toMatch(/Receita bruta\s*R\$\s*1\.546,00/);
    expect(texto).toMatch(/Gastos \(custos \+ despesas\)\s*R\$\s*4\.280,00/); // 780 + 3500
    expect(texto).toContain("Prejuízo líquido do período");
    expect(texto).toContain("VB-2026-0006");
    expect(texto).toContain("OS-2026-0002");
    expect(texto).toContain("fora da DRE");
    expect(texto).toMatch(/Total de despesas na DRE\s*R\$\s*3\.500,00/);
  });

  it("escapa textos vindos do banco (não executa HTML injetado)", () => {
    const html = montarRelatorioMensalHtml({ dre: dre(100), detalhamento, geradoEm: new Date() });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll("script")).toHaveLength(0);
    expect(doc.body.textContent).toContain("Aluguel <script>alert(1)</script>");
    expect(doc.querySelectorAll("td b")).toHaveLength(0);
    expect(escaparHtml(`"a" & 'b'`)).toBe("&quot;a&quot; &amp; &#39;b&#39;");
  });

  it("mês com lucro e base demonstrativa sem lançamentos", () => {
    const base = { ...dre(800), origemDados: "DEMO" as const };
    const html = montarRelatorioMensalHtml({
      dre: base,
      detalhamento: { ...detalhamento, origemDados: "DEMO", vendas: [], ordensServico: [], despesas: [] },
      geradoEm: new Date(),
    });
    const texto = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
    expect(texto).toContain("Lucro líquido do período");
    expect(texto).toContain("base demonstrativa");
    expect(texto).toContain("Nenhuma venda concluída no período.");
    expect(tituloRelatorio({ ...base, competenciaLabel: "Consolidado Anual · 2026" })).toBe(
      "Relatorio-Eletrocar-Consolidado-Anual-·-2026"
    );
  });

  it("imprime por um iframe invisível e o remove depois", () => {
    vi.useFakeTimers();
    imprimirDocumento("<!doctype html><title>t</title><p>oi</p>");
    const iframe = document.querySelector("iframe[title='Relatório']") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    const print = vi.fn();
    Object.defineProperty(iframe.contentWindow, "print", { value: print, configurable: true });

    iframe.dispatchEvent(new Event("load"));
    expect(print).toHaveBeenCalled();

    iframe.contentWindow!.dispatchEvent(new Event("afterprint"));
    vi.advanceTimersByTime(200);
    expect(document.querySelector("iframe[title='Relatório']")).toBeNull();
  });
});

describe("Botão Gerar relatório na tela Financeiro", () => {
  it("gera o relatório da competência selecionada", async () => {
    vi.mocked(imprimirDocumento).mockImplementation(() => undefined);
    const { FinanceiroDREView } = await import("../../presentation/pages/FinanceiroDREView");
    render(<FinanceiroDREView modoDidatico={false} />);

    const botao = await screen.findByRole("button", { name: /Gerar relatório/ });
    await waitFor(() => expect(botao).toBeEnabled());
    fireEvent.click(botao);

    await waitFor(() => expect(imprimirDocumento).toHaveBeenCalledTimes(1));
    const html = vi.mocked(imprimirDocumento).mock.calls[0][0];
    expect(html).toContain("Relatório financeiro");
    expect(html).toContain("Demonstrativo de resultado (DRE)");
  });
});
