// @vitest-environment-options {"url": "https://projeto-auto-eletrica-eletrocar.vercel.app/"}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MockOrHttpAuthRepository,
  permiteFallbackDemo,
} from "../../adapters/repositories/MockOrHttpAuthRepository";

const respostaLogin = {
  access_token: "tok",
  refresh_token: "r",
  token_type: "bearer",
  usuario: { id: "u-1", nome: "Miguel", email: "miguel@eletrocar.com.br", username: "admin", papeis: ["ADMIN"], ativo: true },
};

describe("Login na versão publicada (Vercel)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 Chrome");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("só permite o modo demonstração em localhost", () => {
    expect(window.location.hostname).toBe("projeto-auto-eletrica-eletrocar.vercel.app");
    expect(permiteFallbackDemo()).toBe(false);
    expect(permiteFallbackDemo("localhost")).toBe(true);
    expect(permiteFallbackDemo("127.0.0.1")).toBe(true);
    expect(permiteFallbackDemo("eletrocar.localhost")).toBe(true);
  });

  it("espera uma API lenta (3,7 s, como medido em produção) em vez de desistir", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, status: 200, json: async () => respostaLogin }), 3700)
          )
      )
    );
    const promessa = new MockOrHttpAuthRepository().login("admin", "senhaReal123");
    await vi.advanceTimersByTimeAsync(3700);
    const usuario = await promessa;
    expect(usuario.origemAuth).toBe("API");
    expect(usuario.nome).toBe("Miguel");
  });

  it("tempo esgotado vira aviso de servidor lento, sem cair na demonstração", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })));
    // admin/admin123 é um usuário da demonstração: não pode entrar na versão publicada
    await expect(new MockOrHttpAuthRepository().login("admin", "admin123")).rejects.toThrow(/demorou para responder/);
  });

  it("erro do servidor (502) avisa indisponibilidade; senha errada continua com a mensagem da API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) }));
    await expect(new MockOrHttpAuthRepository().login("admin", "admin123")).rejects.toThrow(/indisponível.*HTTP 502/);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ erro: "Usuário/e-mail ou senha inválidos." }) })
    );
    await expect(new MockOrHttpAuthRepository().login("admin", "errada")).rejects.toThrow("Usuário/e-mail ou senha inválidos.");
  });

  it("sem internet avisa que não conseguiu falar com o servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(new MockOrHttpAuthRepository().login("admin", "admin123")).rejects.toThrow(/Não foi possível falar com o servidor/);
  });
});
