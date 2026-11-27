import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "../../App";
import { container } from "../../infra/di/container";

describe("Aba Administrativa de Usuários (Somente ADMIN)", () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    await container.authRepository.logout();
  });

  it("não deve exibir a aba de Usuários para operadores não-admin", async () => {
    render(<App />);

    const inputUsuario = await screen.findByLabelText(/Usuário ou e-mail/i);
    const inputSenha = screen.getByPlaceholderText(/Digite sua senha de acesso/i);
    fireEvent.change(inputUsuario, { target: { value: "carlos" } });
    fireEvent.change(inputSenha, { target: { value: "carlos123" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar no sistema/i }));

    expect(await screen.findByPlaceholderText(/Escaneie o código de barras/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Usuários/i })).not.toBeInTheDocument();
  });

  it("deve permitir ao Admin abrir a aba Usuários, adicionar, editar e remover um usuário", async () => {
    render(<App />);

    const inputUsuario = await screen.findByLabelText(/Usuário ou e-mail/i);
    const inputSenha = screen.getByPlaceholderText(/Digite sua senha de acesso/i);
    fireEvent.change(inputUsuario, { target: { value: "admin" } });
    fireEvent.change(inputSenha, { target: { value: "admin123" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar no sistema/i }));

    const navSidebar = await screen.findByRole("navigation");
    const btnAbaUsuarios = within(navSidebar).getByRole("button", { name: /Usuários/i });
    fireEvent.click(btnAbaUsuarios);

    expect(await screen.findByRole("heading", { name: /Usuários & acessos/i })).toBeInTheDocument();
    const tabela = await screen.findByRole("table");
    expect(within(tabela).getByText("Administrador Eletrocar (Dono)")).toBeInTheDocument();

    // Própria conta não pode ser removida nem desativada
    expect(screen.getByRole("button", { name: "Remover Administrador Eletrocar (Dono)" })).toBeDisabled();

    // 1. Adicionar novo usuário
    fireEvent.click(screen.getByRole("button", { name: /Novo usuário/i }));
    fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: "Fernanda Santos" } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "fernanda@eletrocar.com.br" } });
    fireEvent.change(screen.getByLabelText(/Usuário de login/i), { target: { value: "fernanda" } });
    fireEvent.change(screen.getByLabelText(/Senha inicial/i), { target: { value: "fernanda123" } });
    fireEvent.change(screen.getByLabelText(/PIN rápido F12/i), { target: { value: "8899" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Eletricista \/ Oficina/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar usuário/i }));

    expect(await screen.findByText("Fernanda Santos")).toBeInTheDocument();

    // 2. Editar usuário recém-cadastrado
    fireEvent.click(screen.getByRole("button", { name: "Editar Fernanda Santos" }));
    const campoNomeEdicao = await screen.findByLabelText(/Nome completo/i);
    fireEvent.change(campoNomeEdicao, { target: { value: "Fernanda Técnica" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));

    expect(await screen.findByText("Fernanda Técnica")).toBeInTheDocument();

    // 3. Remover usuário editado
    fireEvent.click(screen.getByRole("button", { name: "Remover Fernanda Técnica" }));
    fireEvent.click(await screen.findByRole("button", { name: /Confirmar remoção/i }));

    await waitFor(() => {
      expect(screen.queryByText("Fernanda Técnica")).not.toBeInTheDocument();
    });
  });
});

