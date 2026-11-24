import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FinanceiroDREView } from "../../presentation/pages/FinanceiroDREView";
import { container } from "../../infra/di/container";

describe("FinanceiroDREView — Filtros por Mês, Ano e Lucros/Prejuízos", () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    await container.authRepository.logout();
  });

  it("renderiza filtros de mês, ano e lucros/prejuízos e exibe prejuízo ao selecionar Outubro/2026", async () => {
    render(<FinanceiroDREView modoDidatico />);

    expect(await screen.findByRole("heading", { name: /Financeiro & DRE/i })).toBeInTheDocument();
    expect(screen.getByText(/Demonstrativo de resultado/i)).toBeInTheDocument();

    const selectMes = screen.getByLabelText("Selecionar mês") as HTMLSelectElement;
    const selectAno = screen.getByLabelText("Selecionar ano") as HTMLSelectElement;

    fireEvent.change(selectAno, { target: { value: "2026" } });
    fireEvent.change(selectMes, { target: { value: "10" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Outubro \/ 2026/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Prejuízo líquido")).toBeInTheDocument();
    expect(screen.getByText("(=) Prejuízo líquido do período")).toBeInTheDocument();
    expect(screen.getAllByText(/-R\$\s*2\.582,00/).length).toBeGreaterThan(0);
  });

  it("permite consolidar o ano inteiro selecionando Todos os meses e trocando para 2025", async () => {
    render(<FinanceiroDREView modoDidatico={false} />);

    const selectMes = await screen.findByLabelText("Selecionar mês");
    const selectAno = screen.getByLabelText("Selecionar ano");

    fireEvent.change(selectAno, { target: { value: "2025" } });
    fireEvent.change(selectMes, { target: { value: "TODOS" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Consolidado Anual · 2025/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText("Comparativo mensal · 2025 (Todos os resultados)")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("filtra comparativo mensal e linhas da DRE por Somente Prejuízos e Somente Lucros", async () => {
    render(<FinanceiroDREView modoDidatico={false} />);

    const selectAno = await screen.findByLabelText("Selecionar ano");
    const selectMes = screen.getByLabelText("Selecionar mês") as HTMLSelectElement;

    fireEvent.change(selectAno, { target: { value: "2026" } });
    fireEvent.change(selectMes, { target: { value: "11" } });

    await waitFor(() => {
      expect(screen.getAllByText(/Novembro \/ 2026/i).length).toBeGreaterThan(0);
    });

    // Filtra somente prejuízos -> 3 meses deficitários em 2026 (Fev, Jun, Out)
    fireEvent.click(screen.getByRole("button", { name: "Somente Prejuízos" }));

    await waitFor(() => {
      expect(screen.getByText("Comparativo mensal · 2026 (Somente Prejuízos)")).toBeInTheDocument();
    });

    expect(screen.getByText("Fev/2026")).toBeInTheDocument();
    expect(screen.getByText("Jun/2026")).toBeInTheDocument();
    expect(screen.getByText("Out/2026")).toBeInTheDocument();
    expect(screen.queryByText("Nov/2026")).not.toBeInTheDocument();
    expect(screen.queryByText("Receita bruta de vendas")).not.toBeInTheDocument();
    expect(screen.getByText(/não teve prejuízo líquido/i)).toBeInTheDocument();

    // Clica no card Fev/2026 -> atualiza seletor para mês 2 e exibe prejuízo
    fireEvent.click(screen.getByText("Fev/2026").closest("button") as HTMLButtonElement);

    await waitFor(() => {
      expect(selectMes.value).toBe("2");
      expect(screen.getByText("(=) Prejuízo líquido do período")).toBeInTheDocument();
    });

    // Filtra somente lucros -> oculta Fev/2026, Jun/2026, Out/2026 e mostra meses positivos
    fireEvent.click(screen.getByRole("button", { name: "Somente Lucros" }));

    await waitFor(() => {
      expect(screen.getByText("Comparativo mensal · 2026 (Somente Lucros)")).toBeInTheDocument();
    });

    expect(screen.getByText("Nov/2026")).toBeInTheDocument();
    expect(screen.queryByText("Fev/2026")).not.toBeInTheDocument();
    expect(screen.queryByText("Out/2026")).not.toBeInTheDocument();
    expect(screen.getByText("Receita bruta de vendas")).toBeInTheDocument();
    expect(screen.queryByText("(-) Despesas operacionais fixas (aluguel, energia, salários)")).not.toBeInTheDocument();
  });
});

