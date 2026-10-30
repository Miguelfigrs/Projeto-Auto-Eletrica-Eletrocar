/**
 * Exceções de Domínio da Auto Elétrica Eletrocar.
 * Espelham exatamente o mapa de exceções do backend (src/domain/exceptions/domain_exceptions.py).
 */

export class DomainError extends Error {
  constructor(message: string, public readonly codigo: string = "REGRA_NEGOCIO") {
    super(message);
    this.name = "DomainError";
  }
}

export class EstoqueInsuficienteError extends DomainError {
  constructor(
    public readonly pecaDescricao: string,
    public readonly disponivel: number,
    public readonly requisitado: number
  ) {
    super(
      `Estoque insuficiente para "${pecaDescricao}". Disponível: ${disponivel}, Requisitado: ${requisitado}.`,
      "EstoqueInsuficiente"
    );
    this.name = "EstoqueInsuficienteError";
  }
}

export class TransicaoStatusInvalidaError extends DomainError {
  constructor(public readonly statusAtual: string, public readonly statusDestino: string) {
    super(
      `Não é permitido avançar a OS do status "${statusAtual}" para "${statusDestino}".`,
      "TransicaoStatusInvalida"
    );
    this.name = "TransicaoStatusInvalidaError";
  }
}

export class CaixaFechadoError extends DomainError {
  constructor() {
    super("O caixa está fechado. Abra um novo turno para realizar movimentações.", "CaixaFechado");
    this.name = "CaixaFechadoError";
  }
}

export class CredenciaisInvalidasError extends DomainError {
  constructor() {
    super("Credenciais inválidas. Verifique usuário, senha ou PIN.", "CredenciaisInvalidas");
    this.name = "CredenciaisInvalidasError";
  }
}

export class AutorizacaoGerencialError extends DomainError {
  constructor(mensagem = "Operação requer autorização gerencial com PIN.") {
    super(mensagem, "AutorizacaoGerencialNecessaria");
    this.name = "AutorizacaoGerencialError";
  }
}
