/**
 * Repositório de Autenticação e Sessão (Adapter)
 * Suporta login por credenciais, troca rápida de operador por PIN (Lock Screen)
 * e integração com backend FastAPI.
 */
import { IAuthRepository } from "../../application/ports/repositories/IAuthRepository";
import { Usuario } from "../../domain/entities/Usuario";
import { Papel } from "../../domain/value-objects/Enums";
import { CredenciaisInvalidasError } from "../../domain/exceptions/DomainExceptions";

export class MockOrHttpAuthRepository implements IAuthRepository {
  private usuariosRegistrados: Array<{ usuario: Usuario; senha: string; pin: string }> = [
    {
      usuario: new Usuario({
        id: "usr-admin",
        nome: "Carlos Eduardo (Dono/Admin)",
        username: "admin",
        email: "admin@eletrocar.com.br",
        papeis: [Papel.ADMIN, Papel.BALCONISTA, Papel.ELETRICISTA],
        pin: "1234",
      }),
      senha: "admin123",
      pin: "1234",
    },
    {
      usuario: new Usuario({
        id: "usr-carlos",
        nome: "Carlos Silva (Balconista)",
        username: "carlos",
        email: "carlos@eletrocar.com.br",
        papeis: [Papel.BALCONISTA],
        pin: "1122",
      }),
      senha: "carlos123",
      pin: "1122",
    },
    {
      usuario: new Usuario({
        id: "usr-marcio",
        nome: "Márcio Eletricista (Oficina)",
        username: "marcio",
        email: "marcio@eletrocar.com.br",
        papeis: [Papel.ELETRICISTA],
        pin: "4321",
      }),
      senha: "marcio123",
      pin: "4321",
    },
    {
      usuario: new Usuario({
        id: "usr-juliana",
        nome: "Juliana Santos (Balcão & Diagnóstico)",
        username: "juliana",
        email: "juliana@eletrocar.com.br",
        papeis: [Papel.BALCONISTA, Papel.ELETRICISTA],
        pin: "3344",
      }),
      senha: "juliana123",
      pin: "3344",
    },
  ];

  private usuarioAtual: Usuario | null = this.usuariosRegistrados[0].usuario;

  public async login(usernameOuEmail: string, senha: string): Promise<Usuario> {
    const limpo = usernameOuEmail.trim().toLowerCase();
    const encontrado = this.usuariosRegistrados.find(
      (u) =>
        (u.usuario.username.toLowerCase() === limpo || u.usuario.email.toLowerCase() === limpo) &&
        u.senha === senha
    );

    if (!encontrado) {
      throw new CredenciaisInvalidasError();
    }

    this.usuarioAtual = encontrado.usuario;
    return encontrado.usuario;
  }

  public async verificarPin(pin: string): Promise<Usuario> {
    const encontrado = this.usuariosRegistrados.find((u) => u.pin === pin.trim());
    if (!encontrado) {
      throw new CredenciaisInvalidasError();
    }
    this.usuarioAtual = encontrado.usuario;
    return encontrado.usuario;
  }

  public async obterUsuarioAtual(): Promise<Usuario | null> {
    return this.usuarioAtual;
  }

  public async logout(): Promise<void> {
    this.usuarioAtual = null;
  }
}
