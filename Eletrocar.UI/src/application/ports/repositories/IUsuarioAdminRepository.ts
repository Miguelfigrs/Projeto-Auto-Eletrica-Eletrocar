import { Usuario } from "../../../domain/entities/Usuario";
import { Papel } from "../../../domain/value-objects/Enums";

export interface CriarUsuarioDTO {
  nome: string;
  email: string;
  username?: string;
  senha: string;
  papeis: Papel[];
  pin?: string;
  telegramUserId?: string;
}

export interface AtualizarUsuarioDTO {
  nome?: string;
  email?: string;
  username?: string | null;
  telegramUserId?: string | null;
}

export interface IUsuarioAdminRepository {
  listarTodos(): Promise<Usuario[]>;
  criar(dados: CriarUsuarioDTO): Promise<Usuario>;
  atualizar(usuarioId: string, dados: AtualizarUsuarioDTO): Promise<Usuario>;
  definirPapeis(usuarioId: string, papeis: Papel[]): Promise<Usuario>;
  alterarStatus(usuarioId: string, ativo: boolean): Promise<Usuario>;
  redefinirSenha(usuarioId: string, novaSenha: string): Promise<void>;
  definirPin(usuarioId: string, pin: string): Promise<void>;
  remover(usuarioId: string): Promise<void>;
}

