import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "../../App";
import { container } from "../../infra/di/container";

describe("Fluxo de Login, RBAC Didático e Logout", () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    await container.authRepository.logout();
  });

  it("deve abrir na tela de Login moderna com perfis didáticos e exigir autenticação", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /Entrar no sistema/i })).toBeInTheDocument();
    expect(screen.getByText(/Perfis Didáticos de Demonstração/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sair/i })).not.toBeInTheDocument();
  });

  it("deve autenticar via perfil rápido de balconista e bloquear acesso ao módulo DRE por RBAC", async () => {
    render(<App />);

    const credenciaisCarlos = await screen.findByText(/carlos \/ carlos123/i);
    const cardCarlos = credenciaisCarlos.closest(".rounded-xl") as HTMLElement;
    expect(cardCarlos).not.toBeNull();

    fireEvent.click(within(cardCarlos).getByRole("button", { name: "Entrar" }));

    // Aguarda transição pós-login (elemento exclusivo do AppShell/PDV)
    expect(await screen.findByPlaceholderText(/Escaneie o código de barras/i)).toBeInTheDocument();
    expect(screen.getAllByText("Carlos Atendente Balcão").length).toBeGreaterThan(0);

    // Tenta acessar Financeiro & DRE -> exibe explicação didática de RBAC restrito
    fireEvent.click(screen.getByRole("button", { name: /Financeiro & DRE/i }));
    expect(await screen.findByText(/Módulo restrito ao seu perfil/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trocar operador por PIN/i })).toBeInTheDocument();
  });

  it("deve autenticar como Dono/Admin pelo formulário, acessar DRE e voltar ao Login ao clicar em Sair", async () => {
    render(<App />);

    const inputUsuario = await screen.findByLabelText(/Usuário ou e-mail/i);
    const inputSenha = screen.getByPlaceholderText(/Digite sua senha de acesso/i);

    fireEvent.change(inputUsuario, { target: { value: "admin" } });
    fireEvent.change(inputSenha, { target: { value: "admin123" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar no sistema/i }));

    // Admin cai na Visão Geral didática
    expect(await screen.findByText(/Olá, Administrador/i)).toBeInTheDocument();
    expect(screen.getByText(/Como o sistema Eletrocar está organizado\?/i)).toBeInTheDocument();

    // Admin acessa Financeiro & DRE normalmente
    fireEvent.click(screen.getByRole("button", { name: /Financeiro & DRE/i }));
    expect(await screen.findByText(/Demonstrativo de resultado/i)).toBeInTheDocument();

    // Sair volta à tela de Login
    fireEvent.click(screen.getByRole("button", { name: /Sair/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Entrar no sistema/i })).toBeInTheDocument();
    });
  });
});
