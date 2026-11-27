import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BalcaoPDVView } from "../../presentation/pages/BalcaoPDVView";

describe("Componente de Interface: BalcaoPDVView (React Testing Library)", () => {
  it("deve renderizar a tela de balcão com o nome do operador e atalhos", () => {
    render(<BalcaoPDVView operadorNome="Carlos Eduardo" />);

    // Verifica presença do nome do operador
    expect(screen.getByText("Carlos Eduardo")).toBeInTheDocument();

    // Verifica legenda de atalhos de teclado
    expect(screen.getByText(/Atalhos do Teclado/i)).toBeInTheDocument();
    expect(screen.getByText(/Finalizar Venda \(F9\)/i)).toBeInTheDocument();
  });

  it("deve exibir o input de código de barras pronto para leitura", () => {
    render(<BalcaoPDVView operadorNome="Carlos Eduardo" />);

    const input = screen.getByPlaceholderText(/Escaneie o código de barras/i);
    expect(input).toBeInTheDocument();
  });

  it("deve adicionar item ao carrinho ao clicar no botão de atalho de peça", async () => {
    render(<BalcaoPDVView operadorNome="Carlos Eduardo" />);

    // Os atalhos de teste vêm do catálogo carregado (antes eram códigos fixos que não existiam no banco real)
    const botaoRegulador = await screen.findByRole("button", { name: /Regulador de Voltagem/i });
    fireEvent.click(botaoRegulador);

    // O item deve aparecer na lista da venda
    expect(await screen.findByText("Regulador de Voltagem Bosch 12V")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum item na venda")).not.toBeInTheDocument();
  });

  it("F9 abre o pagamento e o recibo usa o número gravado pelo servidor", async () => {
    render(<BalcaoPDVView operadorNome="Carlos Eduardo" />);

    fireEvent.click(await screen.findByRole("button", { name: /Regulador de Voltagem/i }));
    await screen.findByText("Regulador de Voltagem Bosch 12V");

    fireEvent.keyDown(window, { key: "F9" });
    expect(await screen.findByText("Concluir venda")).toBeInTheDocument();

    // Valor recebido com separador de milhar: "1.000,00" é mil reais, não um real
    fireEvent.change(screen.getByLabelText(/Valor recebido/i), { target: { value: "1.000,00" } });
    expect(await screen.findByText("Troco a devolver")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*815,00/)).toBeInTheDocument();
  });

  it("o aviso de valor recebido menor some quando o valor é corrigido", async () => {
    render(<BalcaoPDVView operadorNome="Carlos Eduardo" />);
    fireEvent.click(await screen.findByRole("button", { name: /Regulador de Voltagem/i }));
    await screen.findByText("Regulador de Voltagem Bosch 12V");

    fireEvent.keyDown(window, { key: "F9" });
    const recebido = await screen.findByLabelText(/Valor recebido/i);
    fireEvent.change(recebido, { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar recebimento/i }));
    expect(await screen.findByText(/é menor que o total/)).toBeInTheDocument();

    fireEvent.change(recebido, { target: { value: "1.000,00" } });
    expect(screen.queryByText(/é menor que o total/)).not.toBeInTheDocument();
    expect(screen.getByText("Troco a devolver")).toBeInTheDocument();
  });

  it("pede confirmação antes de cancelar a venda", async () => {
    render(<BalcaoPDVView operadorNome="Carlos Eduardo" />);

    fireEvent.click(await screen.findByRole("button", { name: /Regulador de Voltagem/i }));
    await screen.findByText("Regulador de Voltagem Bosch 12V");

    fireEvent.click(screen.getByRole("button", { name: /Cancelar venda/i }));
    expect(await screen.findByText("Cancelar esta venda?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Não, continuar vendendo/i }));
    expect(screen.getByText("Regulador de Voltagem Bosch 12V")).toBeInTheDocument();
  });
});
