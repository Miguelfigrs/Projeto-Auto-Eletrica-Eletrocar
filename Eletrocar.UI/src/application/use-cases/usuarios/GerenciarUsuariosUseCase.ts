import { ISoundEffectGateway } from "../../ports/gateways/ISoundEffectGateway";
import {
  AtualizarUsuarioDTO,
  CriarUsuarioDTO,
  IUsuarioAdminRepository,
} from "../../ports/repositories/IUsuarioAdminRepository";
import { Usuario } from "../../../domain/entities/Usuario";
import { Papel } from "../../../domain/value-objects/Enums";

export class GerenciarUsuariosUseCase {
  constructor(
    private readonly usuarioRepo: IUsuarioAdminRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async listarTodos(): Promise<Usuario[]> {
    return this.usuarioRepo.listarTodos();
  }

  public async criar(dados: CriarUsuarioDTO): Promise<Usuario> {
    try {
      const criado = await this.usuarioRepo.criar(dados);
      this.soundGateway.tocarBipSucesso();
      return criado;
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }

  public async atualizar(usuarioId: string, dados: AtualizarUsuarioDTO): Promise<Usuario> {
    try {
      const atualizado = await this.usuarioRepo.atualizar(usuarioId, dados);
      this.soundGateway.tocarBipSucesso();
      return atualizado;
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }

  public async definirPapeis(usuarioId: string, papeis: Papel[]): Promise<Usuario> {
    try {
      const atualizado = await this.usuarioRepo.definirPapeis(usuarioId, papeis);
      this.soundGateway.tocarBipSucesso();
      return atualizado;
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }

  public async alterarStatus(usuarioId: string, ativo: boolean): Promise<Usuario> {
    try {
      const atualizado = await this.usuarioRepo.alterarStatus(usuarioId, ativo);
      this.soundGateway.tocarBipSucesso();
      return atualizado;
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }

  public async redefinirSenha(usuarioId: string, novaSenha: string): Promise<void> {
    try {
      await this.usuarioRepo.redefinirSenha(usuarioId, novaSenha);
      this.soundGateway.tocarBipSucesso();
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }

  public async definirPin(usuarioId: string, pin: string): Promise<void> {
    try {
      await this.usuarioRepo.definirPin(usuarioId, pin);
      this.soundGateway.tocarBipSucesso();
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }

  public async remover(usuarioId: string): Promise<void> {
    try {
      await this.usuarioRepo.remover(usuarioId);
      this.soundGateway.tocarBipSucesso();
    } catch (err) {
      this.soundGateway.tocarAlertaErro();
      throw err;
    }
  }
}

