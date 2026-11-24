import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { EstoqueView } from "../../presentation/pages/EstoqueView";

describe("Componente de Interface: EstoqueView — nova peça e entrada de estoque", () => {
  it("cadastra uma nova peça pelo botão 'Nova peça'", async () => {
    render(<EstoqueView onBiparPecaNoBalcao={vi.fn()} modoDidatico={false} />);
    await screen.findByText("Regulador de Voltagem Bosch 12V");

    fireEvent.click(screen.getByRole("button", { name: /Nova peça/i }));
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText(/Descrição/i), {
      target: { value: "Sensor de Rotação Teste" },
    });
    fireEvent.change(within(dialog).getByLabelText(/SKU/i), { target: { value: "SEN-TST-01" } });
    fireEvent.change(within(dialog).getByLabelText(/Preço de venda/i), { target: { value: "129,90" } });
    fireEvent.change(within(dialog).getByLabelText(/Estoque inicial/i), { target: { value: "8" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Cadastrar peça/i }));

    expect(await screen.findByText(/cadastrada com 8 un/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sensor de Rotação Teste" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("registra entrada de estoque em peça existente pelo botão do card", async () => {
    render(<EstoqueView onBiparPecaNoBalcao={vi.fn()} modoDidatico={false} />);
    await screen.findByText("Alternador Valeo 90A Completo");

    const card = screen.getByRole("heading", { name: "Alternador Valeo 90A Completo" }).closest(".card") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: /Entrada/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Alternador Valeo 90A Completo")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Quantidade recebida/i), { target: { value: "4" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Registrar entrada/i }));

    expect(await screen.findByText(/\+4 un adicionadas em "Alternador Valeo 90A Completo"/)).toBeInTheDocument();
  });
});
