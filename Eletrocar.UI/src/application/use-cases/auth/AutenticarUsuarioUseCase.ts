import { IAuthRepository } from "../../ports/repositories/IAuthRepository";
import { ISoundEffectGateway } from "../../ports/gateways/ISoundEffectGateway";
import { Usuario } from "../../../domain/entities/Usuario";

export class AutenticarUsuarioUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async executar(
    usernameOuEmail: string,
    senha: string,
    lembrarSessao = false
  ): Promise<Usuario> {
    try {
      const usuario = await this.authRepo.login(usernameOuEmail, senha, lembrarSessao);
      this.soundGateway.tocarBipSucesso();
      return usuario;
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }
}

export class TrocarOperadorPorPinUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async executar(pin: string, usuarioId?: string): Promise<Usuario> {
    try {
      const usuario = await this.authRepo.verificarPin(pin, usuarioId);
      this.soundGateway.tocarBipSucesso();
      return usuario;
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }
}
