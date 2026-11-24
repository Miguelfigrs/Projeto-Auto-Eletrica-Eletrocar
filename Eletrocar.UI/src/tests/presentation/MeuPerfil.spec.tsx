import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MeuPerfilView } from "../../presentation/pages/MeuPerfilView";
import { MockOrHttpAuthRepository } from "../../adapters/repositories/MockOrHttpAuthRepository";
import { container } from "../../infra/di/container";

async function entrarComo(usuario: string, senha: string) {
  return container.authRepository.login(usuario, senha, false);
}

function secao(titulo: string): HTMLElement {
  return screen.getByRole("heading", { name: titulo }).closest("section") as HTMLElement;
}

describe("Meu perfil (modo demonstração)", () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    await container.authRepository.logout();
  });

  it("salva nome, e-mail e usuário e avisa o app para atualizar a sessão", async () => {
    const usuario = await entrarComo("carlos", "carlos123");
    const onPerfilAtualizado = vi.fn();
    render(<MeuPerfilView usuario={usuario} onPerfilAtualizado={onPerfilAtualizado} />);

    const dados = secao("Dados pessoais");
    expect(within(dados).getByRole("button", { name: /Salvar dados/ })).toBeDisabled();
    expect(within(dados).getByText("Balconista")).toBeInTheDocument();

    fireEvent.change(within(dados).getByLabelText("Nome"), { target: { value: "Carlos Eduardo Lima" } });
    fireEvent.click(within(dados).getByRole("button", { name: /Salvar dados/ }));

    expect(await within(dados).findByText("Dados atualizados.")).toBeInTheDocument();
    expect(onPerfilAtualizado).toHaveBeenCalled();
    expect((await container.authRepository.obterUsuarioAtual())?.nome).toBe("Carlos Eduardo Lima");
  });

  it("recusa e-mail que já pertence a outro usuário", async () => {
    const usuario = await entrarComo("carlos", "carlos123");
    render(<MeuPerfilView usuario={usuario} onPerfilAtualizado={vi.fn()} />);
    const dados = secao("Dados pessoais");

    fireEvent.change(within(dados).getByLabelText("E-mail"), { target: { value: "admin@eletrocar.com.br" } });
    fireEvent.click(within(dados).getByRole("button", { name: /Salvar dados/ }));

    expect(await within(dados).findByText(/Já existe um usuário com o e-mail/)).toBeInTheDocument();
  });

  it("troca a senha só com a senha atual correta e confirmação igual", async () => {
    const usuario = await entrarComo("marcio", "marcio123");
    render(<MeuPerfilView usuario={usuario} onPerfilAtualizado={vi.fn()} />);
    const senha = secao("Trocar senha");
    const preencher = (atual: string, nova: string, confirma: string) => {
      fireEvent.change(within(senha).getByLabelText("Senha atual"), { target: { value: atual } });
      fireEvent.change(within(senha).getByLabelText("Nova senha"), { target: { value: nova } });
      fireEvent.change(within(senha).getByLabelText("Confirmar nova senha"), { target: { value: confirma } });
      fireEvent.click(within(senha).getByRole("button", { name: /Alterar senha/ }));
    };

    preencher("marcio123", "novaSenha99", "outraCoisa1");
    expect(await within(senha).findByText(/confirmação não confere/)).toBeInTheDocument();

    preencher("errada123", "novaSenha99", "novaSenha99");
    expect(await within(senha).findByText("Senha atual incorreta.")).toBeInTheDocument();

    preencher("marcio123", "novaSenha99", "novaSenha99");
    expect(await within(senha).findByText(/Senha alterada/)).toBeInTheDocument();

    await container.authRepository.logout();
    await expect(container.authRepository.login("marcio", "marcio123")).rejects.toThrow();
    expect((await container.authRepository.login("marcio", "novaSenha99")).username).toBe("marcio");
  });

  it("define o PIN com a senha atual e valida o formato", async () => {
    const usuario = await entrarComo("juliana", "juliana123");
    render(<MeuPerfilView usuario={usuario} onPerfilAtualizado={vi.fn()} />);
    const pin = secao("PIN de troca rápida (F12)");

    fireEvent.change(within(pin).getByLabelText("Senha atual"), { target: { value: "juliana123" } });
    fireEvent.change(within(pin).getByLabelText("Novo PIN"), { target: { value: "12a" } });
    expect(within(pin).getByLabelText("Novo PIN")).toHaveValue("12"); // só dígitos
    fireEvent.click(within(pin).getByRole("button", { name: /Salvar PIN/ }));
    expect(await within(pin).findByText(/entre 4 e 6 dígitos/)).toBeInTheDocument();

    fireEvent.change(within(pin).getByLabelText("Novo PIN"), { target: { value: "9087" } });
    fireEvent.click(within(pin).getByRole("button", { name: /Salvar PIN/ }));
    expect(await within(pin).findByText(/PIN salvo/)).toBeInTheDocument();

    expect((await container.authRepository.verificarPin("9087")).username).toBe("juliana");
  });
});

describe("Meu perfil (modo API)", () => {
  const respostaLogin = {
    access_token: "tok",
    refresh_token: "r",
    token_type: "bearer",
    usuario: { id: "u-1", nome: "Carlos", email: "carlos@eletrocar.com.br", username: "carlos", papeis: ["BALCONISTA"], ativo: true },
  };
  const ok = (corpo: unknown, status = 200) => ({ ok: true, status, json: async () => corpo });

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 Chrome");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("usa as rotas /auth/me com o token e repassa a mensagem da API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(respostaLogin))
      .mockResolvedValueOnce(ok({ ...respostaLogin.usuario, nome: "Carlos Eduardo" }))
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ erro: "Senha atual incorreta." }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpAuthRepository();
    await repo.login("carlos", "senhaReal1");

    const atualizado = await repo.atualizarMeuPerfil({ nome: "Carlos Eduardo" });
    expect(atualizado.nome).toBe("Carlos Eduardo");
    expect((await repo.obterUsuarioAtual())?.nome).toBe("Carlos Eduardo");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/v1/auth/me");
    expect(init.method).toBe("PATCH");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ nome: "Carlos Eduardo" });

    await expect(repo.trocarMinhaSenha("errada", "novaSenha99")).rejects.toThrow("Senha atual incorreta.");
    await repo.definirMeuPin("senhaReal1", "4455");
    expect(fetchMock.mock.calls[3][0]).toBe("/api/v1/auth/me/pin");
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({ senha_atual: "senhaReal1", pin: "4455" });
    expect((await repo.obterUsuarioAtual())?.temPin).toBe(true);
  });

  it("sem sessão pede para entrar", async () => {
    const repo = new MockOrHttpAuthRepository();
    await expect(repo.atualizarMeuPerfil({ nome: "X" })).rejects.toThrow(/Entre no sistema/);
  });
});
