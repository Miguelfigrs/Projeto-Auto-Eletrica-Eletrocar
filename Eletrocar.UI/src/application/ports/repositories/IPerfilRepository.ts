import type { Usuario } from "../../../domain/entities/Usuario";

/** Dados que o próprio usuário pode alterar. Papéis, status e Telegram ficam com o administrador. */
export interface AtualizarMeuPerfilDTO {
  nome?: string;
  email?: string;
  username?: string;
}

/** "Meu perfil": operações do usuário logado sobre a própria conta. */
export interface IPerfilRepository {
  atualizarMeuPerfil(dados: AtualizarMeuPerfilDTO): Promise<Usuario>;
  /** Exige a senha atual. */
  trocarMinhaSenha(senhaAtual: string, novaSenha: string): Promise<void>;
  /** Exige a senha atual. */
  definirMeuPin(senhaAtual: string, pin: string): Promise<void>;
}
