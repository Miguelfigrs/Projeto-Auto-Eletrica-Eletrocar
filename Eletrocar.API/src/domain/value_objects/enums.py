"""
Enums de domínio do sistema Auto Elétrica Eletrocar.
"""
from enum import Enum


class Role(str, Enum):
    ADMIN = "ADMIN"
    BALCAO = "BALCAO"
    ELETRICISTA = "ELETRICISTA"


class StatusOS(str, Enum):
    TRIAGEM = "TRIAGEM"
    ORCAMENTO_PENDENTE = "ORCAMENTO_PENDENTE"
    APROVADO = "APROVADO"
    EM_EXECUCAO = "EM_EXECUCAO"
    AGUARDANDO_PECA = "AGUARDANDO_PECA"
    TESTES_ELETRICOS = "TESTES_ELETRICOS"
    FINALIZADO = "FINALIZADO"
    ENTREGUE = "ENTREGUE"
    CANCELADO = "CANCELADO"


class OrigemOS(str, Enum):
    BALCAO = "BALCAO"
    TELEGRAM_VOICE = "TELEGRAM_VOICE"


class FormaPagamento(str, Enum):
    DINHEIRO = "DINHEIRO"
    PIX = "PIX"
    CARTAO_CREDITO = "CARTAO_CREDITO"
    CARTAO_DEBITO = "CARTAO_DEBITO"
    FATURADO = "FATURADO"


class TipoMovimentacaoCaixa(str, Enum):
    ENTRADA_VENDA = "ENTRADA_VENDA"
    ENTRADA_OS = "ENTRADA_OS"
    SUPRIMENTO = "SUPRIMENTO"
    SANGRIA = "SANGRIA"


class StatusCaixa(str, Enum):
    ABERTO = "ABERTO"
    FECHADO = "FECHADO"


class StatusVenda(str, Enum):
    CONCLUIDA = "CONCLUIDA"
    CANCELADA = "CANCELADA"
