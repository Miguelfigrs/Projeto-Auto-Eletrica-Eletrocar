import { beforeEach, describe, expect, it } from "vitest";
import { MockOrHttpAuthRepository } from "../../adapters/repositories/MockOrHttpAuthRepository";
import { CredenciaisInvalidasError } from "../../domain/exceptions/DomainExceptions";
import { Papel } from "../../domain/value-objects/Enums";

describe("MockOrHttpAuthRepository", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("deve iniciar desconectado quando não há sessão persistida", async () => {
    const repo = new MockOrHttpAuthRepository();
    expect(await repo.obterUsuarioAtual()).toBeNull();
  });

  it("deve autenticar perfis de demonstração (admin, carlos, marcio, juliana) e aliases", async () => {
    const repo = new MockOrHttpAuthRepository();

    const admin = await repo.login("admin", "admin123", false);
    expect(admin.ehAdmin).toBe(true);
    expect(admin.origemAuth).toBe("DEMO_LOCAL");
    expect((await repo.obterUsuarioAtual())?.username).toBe("admin");

    const carlos = await repo.login("carlos@eletrocar.com.br", "carlos123", false);
    expect(carlos.ehBalconista).toBe(true);
    expect(carlos.ehAdmin).toBe(false);

    const marcio = await repo.login("marcio", "marcio123", false);
    expect(marcio.ehEletricista).toBe(true);
    expect(marcio.ehBalconista).toBe(false);

    const juliana = await repo.login("juliana", "juliana123", true);
    expect(juliana.papeis).toContain(Papel.BALCONISTA);
    expect(juliana.papeis).toContain(Papel.ELETRICISTA);

    // Quando lembrarSessao=true, uma nova instância deve restaurar do localStorage
    const novaInstancia = new MockOrHttpAuthRepository();
    expect((await novaInstancia.obterUsuarioAtual())?.username).toBe("juliana");
  });

  it("deve rejeitar credenciais inválidas sem iniciar sessão", async () => {
    const repo = new MockOrHttpAuthRepository();
    await expect(repo.login("admin", "senha-errada", false)).rejects.toThrow(
      CredenciaisInvalidasError
    );
    expect(await repo.obterUsuarioAtual()).toBeNull();
  });

  it("deve alternar operador por PIN e limpar sessão no logout", async () => {
    const repo = new MockOrHttpAuthRepository();
    await repo.login("admin", "admin123", false);

    const trocado = await repo.verificarPin("4321");
    expect(trocado.username).toBe("marcio");

    // Se informar usuarioId específico com PIN de outro operador, deve rejeitar
    await expect(repo.verificarPin("1234", trocado.id)).rejects.toThrow(
      CredenciaisInvalidasError
    );

    await repo.logout();
    expect(await repo.obterUsuarioAtual()).toBeNull();

    const aposLogout = new MockOrHttpAuthRepository();
    expect(await aposLogout.obterUsuarioAtual()).toBeNull();
  });

  it("deve permitir criar, editar, alterar papéis/status, redefinir senha/PIN e remover usuário como admin", async () => {
    const repo = new MockOrHttpAuthRepository();
    const admin = await repo.login("admin", "admin123", false);

    const novo = await repo.criar({
      nome: "Lucas Auxiliar",
      email: "lucas@eletrocar.com.br",
      username: "lucas",
      senha: "lucas1234",
      papeis: [Papel.ELETRICISTA],
      pin: "7788",
    });
    expect(novo.nome).toBe("Lucas Auxiliar");
    expect(novo.temPin).toBe(true);

    const editado = await repo.atualizar(novo.id, { nome: "Lucas Eletricista Sênior" });
    expect(editado.nome).toBe("Lucas Eletricista Sênior");

    const comPapeis = await repo.definirPapeis(novo.id, [Papel.ELETRICISTA, Papel.BALCONISTA]);
    expect(comPapeis.papeis).toContain(Papel.BALCONISTA);

    await repo.redefinirSenha(novo.id, "novaSenha99");
    await repo.definirPin(novo.id, "9900");

    // Desativar bloqueia login e remoção da própria conta é bloqueada
    await repo.alterarStatus(novo.id, false);
    await expect(repo.login("lucas", "novaSenha99", false)).rejects.toThrow(CredenciaisInvalidasError);
    await expect(repo.remover(admin.id)).rejects.toThrow();

    // Reativar permite login com nova senha
    await repo.alterarStatus(novo.id, true);
    const logadoLucas = await repo.login("lucas", "novaSenha99", false);
    expect(logadoLucas.username).toBe("lucas");

    // Admin remove Lucas
    await repo.login("admin", "admin123", false);
    await repo.remover(novo.id);
    const todos = await repo.listarTodos();
    expect(todos.some((u) => u.id === novo.id)).toBe(false);
  });
});

