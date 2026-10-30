/**
 * Enums de domínio do sistema Auto Elétrica Eletrocar.
 * Espelha fielmente o backend (src/domain/value_objects/enums.py).
 */

export enum Papel {
  ADMIN = "ADMIN",
  BALCONISTA = "BALCONISTA",
  ELETRICISTA = "ELETRICISTA",
}

export enum StatusOS {
  TRIAGEM = "TRIAGEM",
  ORCAMENTO_PENDENTE = "ORCAMENTO_PENDENTE",
  APROVADO = "APROVADO",
  EM_EXECUCAO = "EM_EXECUCAO",
  AGUARDANDO_PECA = "AGUARDANDO_PECA",
  TESTES_ELETRICOS = "TESTES_ELETRICOS",
  FINALIZADO = "FINALIZADO",
  ENTREGUE = "ENTREGUE",
  CANCELADO = "CANCELADO",
}

export enum OrigemOS {
  BALCAO = "BALCAO",
  TELEGRAM_VOICE = "TELEGRAM_VOICE",
}

export enum PrioridadeOS {
  BAIXA = "BAIXA",
  MEDIA = "MEDIA",
  ALTA = "ALTA",
}

export enum FormaPagamento {
  DINHEIRO = "DINHEIRO",
  PIX = "PIX",
  CARTAO_CREDITO = "CARTAO_CREDITO",
  CARTAO_DEBITO = "CARTAO_DEBITO",
  BOLETO = "BOLETO",
  FATURADO = "FATURADO",
}

export enum TipoMovimentacaoCaixa {
  ENTRADA_VENDA = "ENTRADA_VENDA",
  ENTRADA_OS = "ENTRADA_OS",
  ENTRADA_TITULO = "ENTRADA_TITULO",
  SUPRIMENTO = "SUPRIMENTO",
  SANGRIA = "SANGRIA",
  ESTORNO_VENDA = "ESTORNO_VENDA",
}

export enum StatusCaixa {
  ABERTO = "ABERTO",
  FECHADO = "FECHADO",
}

export enum StatusVenda {
  CONCLUIDA = "CONCLUIDA",
  CANCELADA = "CANCELADA",
}

export enum TipoTitulo {
  PAGAR = "PAGAR",
  RECEBER = "RECEBER",
}

export enum StatusTitulo {
  ABERTO = "ABERTO",
  PAGO = "PAGO",
  CANCELADO = "CANCELADO",
}

export enum CategoriaTitulo {
  DESPESA_FIXA = "DESPESA_FIXA",
  DESPESA_VARIAVEL = "DESPESA_VARIAVEL",
  COMPRA_MERCADORIA = "COMPRA_MERCADORIA",
  VENDA_A_PRAZO = "VENDA_A_PRAZO",
  SERVICO_A_PRAZO = "SERVICO_A_PRAZO",
  OUTROS = "OUTROS",
}

export enum StatusCobrancaPix {
  PENDENTE = "PENDENTE",
  LIQUIDADA = "LIQUIDADA",
  EXPIRADA = "EXPIRADA",
}
