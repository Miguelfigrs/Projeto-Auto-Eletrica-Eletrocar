import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "../../presentation/components/ui";

/** jsdom não calcula layout: simula uma janela com conteúdo maior que a tela. */
function simularAltura(el: HTMLElement, { total, visivel, rolado }: { total: number; visivel: number; rolado: number }) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: total });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: visivel });
  Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: rolado });
}

describe("Janelas em telas baixas", () => {
  it("o conteúdo rola e mostra 'Role para ver mais' até chegar ao fim", () => {
    render(
      <Modal aberto onFechar={() => {}} titulo="Novo usuário">
        <button type="button">Cadastrar usuário</button>
      </Modal>
    );

    const corpo = document.querySelector(".modal .modal-corpo") as HTMLElement;
    expect(corpo).toBeInTheDocument();
    // O título fica fora da área que rola: o "X" de fechar está sempre visível
    expect(corpo.contains(screen.getByRole("button", { name: "Fechar" }))).toBe(false);

    simularAltura(corpo, { total: 900, visivel: 400, rolado: 0 });
    act(() => {
      fireEvent.scroll(corpo);
    });
    const dica = screen.getByRole("button", { name: /Role para ver mais/ });

    corpo.scrollBy = vi.fn();
    fireEvent.click(dica);
    expect(corpo.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));

    simularAltura(corpo, { total: 900, visivel: 400, rolado: 500 });
    act(() => {
      fireEvent.scroll(corpo);
    });
    expect(screen.queryByRole("button", { name: /Role para ver mais/ })).not.toBeInTheDocument();
  });

  it("janela que cabe na tela não mostra o aviso", () => {
    render(
      <Modal aberto onFechar={() => {}} titulo="Abrir turno">
        <p>Conteúdo curto</p>
      </Modal>
    );
    expect(screen.queryByRole("button", { name: /Role para ver mais/ })).not.toBeInTheDocument();
  });
});
