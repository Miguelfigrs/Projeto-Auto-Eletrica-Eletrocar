import { Usuario } from "../../../domain/entities/Usuario";

export interface OperadorRapidoInfo {
  id: string;
  nome: string;
  username: string;
  email?: string;
  papeis: Usuario["papeis"];
  /** Só na demonstração offline: com a API os PINs nunca chegam ao navegador. */
  pinDemo?: string;
  senhaDemo?: string;
  descricaoAcesso?: string;
}

export interface IAuthRepository {
  login(usernameOuEmail: string, senha: string, lembrarSessao?: boolean): Promise<Usuario>;
  verificarPin(pin: string, usuarioId?: string): Promise<Usuario>;
  obterUsuarioAtual(): Promise<Usuario | null>;
  listarOperadoresRapidos(): Promise<OperadorRapidoInfo[]>;
  logout(): Promise<void>;
}
