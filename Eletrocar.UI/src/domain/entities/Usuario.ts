/**
 * Entidade: Usuario
 * Representa o colaborador autenticado e seus papéis RBAC.
 * Espelha fielmente src/domain/entities/usuario.py e UsuarioOutputDTO.
 */
import { Papel } from "../value-objects/Enums";

export type OrigemAutenticacao = "API" | "DEMO_LOCAL";

export interface UsuarioProps {
  id: string;
  nome: string;
  username: string;
  email: string;
  papeis: Papel[];
  pin?: string;
  temPin?: boolean;
  telegramUserId?: string;
  ativo?: boolean;
  telaInicial?: string;
  modulos?: string[];
  origemAuth?: OrigemAutenticacao;
}

export class Usuario {
  public readonly id: string;
  public readonly nome: string;
  public readonly username: string;
  public readonly email: string;
  public readonly papeis: Papel[];
  public readonly pin?: string;
  public readonly temPin: boolean;
  public readonly telegramUserId?: string;
  public readonly ativo: boolean;
  public readonly telaInicial: string;
  public readonly modulos: string[];
  public readonly origemAuth: OrigemAutenticacao;

  constructor(props: UsuarioProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.username = props.username;
    this.email = props.email;
    this.papeis = props.papeis || [];
    this.pin = props.pin;
    this.temPin = props.temPin ?? Boolean(props.pin);
    this.telegramUserId = props.telegramUserId;
    this.ativo = props.ativo ?? true;
    this.origemAuth = props.origemAuth ?? "DEMO_LOCAL";
    this.telaInicial = props.telaInicial ?? this.inferirTelaInicial();
    this.modulos = props.modulos ?? this.inferirModulos();
  }

  private inferirTelaInicial(): string {
    if (this.temPapel(Papel.ADMIN)) return "DASHBOARD_FINANCEIRO";
    if (this.temPapel(Papel.BALCONISTA)) return "BALCAO_PDV";
    if (this.temPapel(Papel.ELETRICISTA)) return "FILA_OS";
    return "VISAO_GERAL";
  }

  private inferirModulos(): string[] {
    const lista = new Set<string>();
    if (this.temPapel(Papel.ADMIN)) {
      [
        "DASHBOARD_FINANCEIRO",
        "BALCAO_PDV",
        "CAIXA",
        "FILA_OS",
        "ORDENS_SERVICO",
        "CLIENTES",
        "ESTOQUE",
        "ESTOQUE_GESTAO",
        "FINANCEIRO",
        "RELATORIOS",
        "USUARIOS",
        "AUDITORIA",
      ].forEach((m) => lista.add(m));
    }
    if (this.temPapel(Papel.BALCONISTA)) {
      ["BALCAO_PDV", "CAIXA", "ORDENS_SERVICO", "CLIENTES", "ESTOQUE"].forEach((m) =>
        lista.add(m)
      );
    }
    if (this.temPapel(Papel.ELETRICISTA)) {
      ["FILA_OS", "ORDENS_SERVICO", "CLIENTES", "ESTOQUE"].forEach((m) => lista.add(m));
    }
    return Array.from(lista);
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

  public get papelPrincipal(): string {
    if (this.ehAdmin) return "Administrador / Dono";
    if (this.ehBalconista && this.ehEletricista) return "Balcão & Oficina";
    if (this.ehBalconista) return "Balconista & Caixa";
    if (this.ehEletricista) return "Eletricista de Pátio";
    return "Operador";
  }
}
