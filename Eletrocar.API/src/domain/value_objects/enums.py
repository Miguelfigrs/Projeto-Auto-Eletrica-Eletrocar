"""
Enums de domínio do sistema Auto Elétrica Eletrocar.
"""
from enum import Enum


class Papel(str, Enum):
    """Papéis de acesso (RBAC). Um usuário pode acumular vários papéis (N:N USUARIOS_PAPEIS)."""
    ADMIN = "ADMIN"
    BALCONISTA = "BALCONISTA"
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


class PrioridadeOS(str, Enum):
    BAIXA = "BAIXA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"


class FormaPagamento(str, Enum):
    DINHEIRO = "DINHEIRO"
    PIX = "PIX"
    CARTAO_CREDITO = "CARTAO_CREDITO"
    CARTAO_DEBITO = "CARTAO_DEBITO"
    BOLETO = "BOLETO"
    FATURADO = "FATURADO"

    @property
    def a_prazo(self) -> bool:
        """Formas a prazo não entram no caixa do turno: geram título a receber."""
        return self in (FormaPagamento.BOLETO, FormaPagamento.FATURADO)


class TipoMovimentacaoCaixa(str, Enum):
    ENTRADA_VENDA = "ENTRADA_VENDA"
    ENTRADA_OS = "ENTRADA_OS"
    ENTRADA_TITULO = "ENTRADA_TITULO"
    SUPRIMENTO = "SUPRIMENTO"
    SANGRIA = "SANGRIA"
    ESTORNO_VENDA = "ESTORNO_VENDA"

    @property
    def eh_saida(self) -> bool:
        return self in (TipoMovimentacaoCaixa.SANGRIA, TipoMovimentacaoCaixa.ESTORNO_VENDA)


class StatusCaixa(str, Enum):
    ABERTO = "ABERTO"
    FECHADO = "FECHADO"


class StatusVenda(str, Enum):
    CONCLUIDA = "CONCLUIDA"
    CANCELADA = "CANCELADA"


class TipoTitulo(str, Enum):
    PAGAR = "PAGAR"
    RECEBER = "RECEBER"


class StatusTitulo(str, Enum):
    ABERTO = "ABERTO"
    PAGO = "PAGO"
    CANCELADO = "CANCELADO"


class CategoriaTitulo(str, Enum):
    DESPESA_FIXA = "DESPESA_FIXA"
    DESPESA_VARIAVEL = "DESPESA_VARIAVEL"
    COMPRA_MERCADORIA = "COMPRA_MERCADORIA"
    VENDA_A_PRAZO = "VENDA_A_PRAZO"
    SERVICO_A_PRAZO = "SERVICO_A_PRAZO"
    OUTROS = "OUTROS"


class StatusCobrancaPix(str, Enum):
    PENDENTE = "PENDENTE"
    LIQUIDADA = "LIQUIDADA"
    EXPIRADA = "EXPIRADA"
