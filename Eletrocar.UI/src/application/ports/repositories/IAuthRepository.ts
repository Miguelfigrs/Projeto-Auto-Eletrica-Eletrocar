import { Usuario } from "../../../domain/entities/Usuario";

export interface IAuthRepository {
  login(usernameOuEmail: string, senha: string): Promise<Usuario>;
  verificarPin(pin: string): Promise<Usuario>;
  obterUsuarioAtual(): Promise<Usuario | null>;
  logout(): Promise<void>;
}
