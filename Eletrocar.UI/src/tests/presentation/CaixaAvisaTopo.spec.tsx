import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CaixaView } from "../../presentation/pages/CaixaView";

describe("Caixa: o topo acompanha o que acontece na tela do caixa", () => {
  it("avisa o App depois de um suprimento e trava o botão enquanto grava", async () => {
    const aoAlterar = vi.fn();
    render(<CaixaView operadorNome="Juliana" onCaixaAlterado={aoAlterar} />);

    fireEvent.click(await screen.findByRole("button", { name: /^Suprimento$/ }));
    fireEvent.change(screen.getByPlaceholderText("Ex: 100,00"), { target: { value: "10,00" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: Moedas e notas de R$ 5"), { target: { value: "Troco" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar suprimento/ }));

    // Enquanto o servidor responde o botão mostra que está gravando (evita clique duplo)
    expect(screen.getByRole("button", { name: /Registrando suprimento/ })).toBeDisabled();

    await waitFor(() => expect(aoAlterar).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Suprimento de R\$\s*10,00 registrado/)).toBeInTheDocument();
  });
});
