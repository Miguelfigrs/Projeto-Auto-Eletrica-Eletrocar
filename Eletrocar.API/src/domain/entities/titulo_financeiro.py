"""
Entidade: TituloFinanceiro (Contas a Pagar e a Receber)
Controle de vencimentos, baixas e inadimplência (vendas faturadas para frotas, boletos e despesas).
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import uuid
from src.domain.value_objects.enums import TipoTitulo, StatusTitulo, CategoriaTitulo, FormaPagamento
from src.domain.value_objects.tempo import agora_utc
from src.domain.exceptions.domain_exceptions import RegraNegocioException

CATEGORIAS_POR_TIPO = {
    TipoTitulo.PAGAR: {
        CategoriaTitulo.DESPESA_FIXA,
        CategoriaTitulo.DESPESA_VARIAVEL,
        CategoriaTitulo.COMPRA_MERCADORIA,
        CategoriaTitulo.OUTROS,
    },
    TipoTitulo.RECEBER: {
        CategoriaTitulo.VENDA_A_PRAZO,
        CategoriaTitulo.SERVICO_A_PRAZO,
        CategoriaTitulo.OUTROS,
    },
}


@dataclass
class TituloFinanceiro:
    id: uuid.UUID
    tipo: TipoTitulo
    descricao: str
    valor: Decimal
    data_vencimento: date
    categoria: CategoriaTitulo
    status: StatusTitulo = StatusTitulo.ABERTO
    cliente_id: Optional[uuid.UUID] = None
    venda_id: Optional[uuid.UUID] = None
    ordem_servico_id: Optional[uuid.UUID] = None
    data_pagamento: Optional[date] = None
    forma_pagamento_baixa: Optional[FormaPagamento] = None
    created_at: datetime = field(default_factory=agora_utc)

    def __post_init__(self):
        if not self.descricao or not self.descricao.strip():
            raise RegraNegocioException("A descrição do título é obrigatória.")
        if self.valor <= Decimal("0.00"):
            raise RegraNegocioException("O valor do título deve ser maior que zero.")
        if self.categoria not in CATEGORIAS_POR_TIPO[self.tipo]:
            raise RegraNegocioException(
                f"Categoria '{self.categoria.value}' não é válida para títulos a {self.tipo.value.lower()}."
            )
        self.valor = self.valor.quantize(Decimal("0.01"))

    def eh_despesa_operacional(self) -> bool:
        return self.categoria in (CategoriaTitulo.DESPESA_FIXA, CategoriaTitulo.DESPESA_VARIAVEL)

    def baixar(self, data_pagamento: date, forma_pagamento: FormaPagamento):
        if self.status != StatusTitulo.ABERTO:
            raise RegraNegocioException(f"Título no status '{self.status.value}' não pode ser baixado.")
        if forma_pagamento.a_prazo:
            raise RegraNegocioException("A baixa deve informar o meio efetivo de pagamento.")
        self.status = StatusTitulo.PAGO
        self.data_pagamento = data_pagamento
        self.forma_pagamento_baixa = forma_pagamento

    def cancelar(self):
        if self.status != StatusTitulo.ABERTO:
            raise RegraNegocioException(f"Título no status '{self.status.value}' não pode ser cancelado.")
        self.status = StatusTitulo.CANCELADO

    def esta_vencido(self, hoje: date) -> bool:
        return self.status == StatusTitulo.ABERTO and self.data_vencimento < hoje

    def dias_em_atraso(self, hoje: date) -> int:
        return (hoje - self.data_vencimento).days if self.esta_vencido(hoje) else 0
