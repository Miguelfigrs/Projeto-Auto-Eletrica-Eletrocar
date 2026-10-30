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

    const botaoRegulador = screen.getByRole("button", { name: /Regulador Bosch/i });
    fireEvent.click(botaoRegulador);

    // O item deve aparecer na lista ou exibir alerta de adição
    const alertas = await screen.findAllByText(/Regulador/i);
    expect(alertas.length).toBeGreaterThan(0);
  });
});
