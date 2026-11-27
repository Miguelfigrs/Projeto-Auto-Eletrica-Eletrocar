import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FinanceiroDREView } from "../../presentation/pages/FinanceiroDREView";
import { container } from "../../infra/di/container";

describe("FinanceiroDREView — Calendário 3 Níveis (Dias/Meses/Anos) e Gráficos Analíticos", () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    await container.authRepository.logout();
  });

  it("permite selecionar dias espaçados com clique, selecionar período arrastando e alternar Dias -> Meses -> Anos no scroll", async () => {
    render(<FinanceiroDREView modoDidatico />);

    expect(await screen.findByRole("heading", { name: /Financeiro & DRE/i })).toBeInTheDocument();

    // Abre o calendário moderno (inicia na visão de Dias com D S T Q Q S S)
    fireEvent.click(screen.getByRole("button", { name: /Abrir calendário de competências/i }));
    const dialogo = await screen.findByRole("dialog", {
      name: /Calendário de seleção de dias, meses e anos/i,
    });

    // 1) Clique simples em dias com espaçamento (Dia 4 e Dia 12 de Novembro de 2026)
    const dia4 = within(dialogo).getByRole("button", { name: "Dia 4 de Novembro de 2026" });
    const dia12 = within(dialogo).getByRole("button", { name: "Dia 12 de Novembro de 2026" });

    fireEvent.mouseDown(dia4);
    fireEvent.mouseUp(dia4);
    await waitFor(() => {
      expect(screen.getAllByText(/04 Nov 2026/i).length).toBeGreaterThan(0);
    });

    fireEvent.mouseDown(dia12);
    fireEvent.mouseUp(dia12);
    await waitFor(() => {
      expect(screen.getAllByText(/Dias 04, 12 · Nov 2026/i).length).toBeGreaterThan(0);
    });

    // 2) Segurar e arrastar do Dia 10 até o Dia 14 -> seleciona período contínuo (5 dias)
    const dia10 = within(dialogo).getByRole("button", { name: "Dia 10 de Novembro de 2026" });
    const dia14 = within(dialogo).getByRole("button", { name: "Dia 14 de Novembro de 2026" });

    fireEvent.mouseDown(dia10);
    fireEvent.mouseEnter(dia14);
    fireEvent.mouseUp(dia14);

    await waitFor(() => {
      expect(screen.getAllByText(/10–14 Nov 2026/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("5 dias")).toBeInTheDocument();

    // 3) Scroll do mouse 1x -> Dias vira Meses; Scroll 2x -> Meses vira Anos
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(10_000);
    fireEvent.wheel(dialogo, { deltaY: 120 });
    expect(await within(dialogo).findByRole("button", { name: "Outubro de 2026" })).toBeInTheDocument();

    // Seleciona Outubro + Novembro de 2026 (multi-mês) e depois só Outubro (prejuízo)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Outubro de 2026" }));
    await waitFor(() => {
      expect(screen.getAllByText(/Out\/2026, Nov\/2026/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(within(dialogo).getByRole("button", { name: "Novembro de 2026" }));
    await waitFor(() => {
      expect(screen.getAllByText(/Outubro \/ 2026/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Prejuízo líquido")).toBeInTheDocument();
    expect(screen.getAllByText(/-R\$\s*2\.582,00/).length).toBeGreaterThan(0);

    // 2ª rolagem para baixo -> Meses vira Anos
    nowSpy.mockReturnValue(10_500);
    fireEvent.wheel(dialogo, { deltaY: 120 });
    expect(await within(dialogo).findByRole("button", { name: "Selecionar ano 2025" })).toBeInTheDocument();

    // Seleciona 2025 e 2026 (multi-ano -> 24 meses)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Selecionar ano 2025" }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Selecionar ano 2026" }));

    await waitFor(() => {
      expect(screen.getAllByText(/Consolidado 2025 \+ 2026 \(24 meses\)/i).length).toBeGreaterThan(0);
    });

    // Rola para cima -> Anos volta para Meses -> mais uma vez volta para Dias
    nowSpy.mockReturnValue(11_000);
    fireEvent.wheel(dialogo, { deltaY: -120 });
    expect(await within(dialogo).findByRole("button", { name: "Janeiro de 2026" })).toBeInTheDocument();

    nowSpy.mockReturnValue(11_500);
    fireEvent.wheel(dialogo, { deltaY: -120 });
    expect(await within(dialogo).findByRole("button", { name: /Dia 1 de/i })).toBeInTheDocument();

    nowSpy.mockRestore();
  });

  it("filtra comparativo mensal e linhas da DRE por Somente Prejuízos e Somente Lucros", async () => {
    render(<FinanceiroDREView modoDidatico={false} />);

    expect(await screen.findByText(/Demonstrativo de resultado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Somente Prejuízos" }));

    await waitFor(() => {
      expect(screen.getByText("Comparativo mensal · 2026 (Somente Prejuízos)")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Fev/2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jun/2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Out/2026").length).toBeGreaterThan(0);
    expect(screen.queryByText("Receita bruta de vendas")).not.toBeInTheDocument();

    const botaoFev = screen
      .getAllByText("Fev/2026")
      .map((el) => el.closest("button"))
      .find((btn): btn is HTMLButtonElement => btn !== null);
    expect(botaoFev).toBeDefined();
    fireEvent.click(botaoFev!);
    await waitFor(() => {
      expect(screen.getByText("(=) Prejuízo líquido do período")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Somente Lucros" }));
    await waitFor(() => {
      expect(screen.getByText("Comparativo mensal · 2026 (Somente Lucros)")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Nov/2026").length).toBeGreaterThan(0);
    expect(screen.queryByText("Fev/2026")).not.toBeInTheDocument();
    expect(screen.getByText("Receita bruta de vendas")).toBeInTheDocument();
  });

  it("exibe gráficos financeiros em Barras e Curva, comparando meses e mostrando dias mais lucrativos", async () => {
    render(<FinanceiroDREView modoDidatico={false} />);

    expect(
      await screen.findByRole("img", { name: /Gráfico em barras de comparação mensal/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Mês Mais Lucrativo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Curva" }));
    expect(
      screen.getByRole("img", { name: /Gráfico em curva de comparação mensal/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Receita × Custos" }));
    expect(screen.getByText("Custos + Despesas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dias do Mês" }));
    expect(
      screen.getByRole("img", { name: /Gráfico em curva de lucratividade diária/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Dia Mais Lucrativo")).toBeInTheDocument();
    expect(screen.getByText("Top 3 Dias Mais Lucrativos")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Barras" }));
    expect(
      screen.getByRole("img", { name: /Gráfico em barras de lucratividade diária/i })
    ).toBeInTheDocument();

    // Passar o mouse sobre uma barra exibe o tooltip flutuante com Receita, Custos + Desp., Lucro/Prejuízo e % da média
    const ponto0 = screen.getByTestId("grafico-ponto-0");
    fireEvent.mouseEnter(ponto0);
    const tooltip = await screen.findByRole("tooltip");
    expect(within(tooltip).getByText("Receita")).toBeInTheDocument();
    expect(within(tooltip).getByText("Custos + Desp.")).toBeInTheDocument();
    expect(within(tooltip).getByText("% da média")).toBeInTheDocument();
  });
});
