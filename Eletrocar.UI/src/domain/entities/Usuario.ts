/**
 * Entidade: Usuario
 * Representa o colaborador autenticado e seus papéis RBAC.
 * Espelha fielmente src/domain/entities/usuario.py.
 */
import { Papel } from "../value-objects/Enums";

export interface UsuarioProps {
  id: string;
  nome: string;
  username: string;
  email: string;
  papeis: Papel[];
  pin?: string;
  ativo?: boolean;
}

export class Usuario {
  public readonly id: string;
  public readonly nome: string;
  public readonly username: string;
  public readonly email: string;
  public readonly papeis: Papel[];
  public readonly pin?: string;
  public readonly ativo: boolean;

  constructor(props: UsuarioProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.username = props.username;
    this.email = props.email;
    this.papeis = props.papeis || [];
    this.pin = props.pin;
    this.ativo = props.ativo ?? true;
  }

  public temPapel(papel: Papel): boolean {
    return this.papeis.includes(papel);
  }

  public get ehAdmin(): boolean {
    return this.temPapel(Papel.ADMIN);
  }

  public get ehBalconista(): boolean {
    return this.temPapel(Papel.BALCONISTA);
  }

  public get ehEletricista(): boolean {
    return this.temPapel(Papel.ELETRICISTA);
  }
}
