"""
Entidade: VendaBalcao (Aggregate Root) e ItemVenda
Operação de balcão / PDV rápido para venda direta de peças elétricas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional
import uuid
from src.domain.value_objects.enums import FormaPagamento, StatusVenda
from src.domain.value_objects.tempo import agora_utc
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass
class ItemVenda:
    id: uuid.UUID
    venda_id: uuid.UUID
    peca_id: uuid.UUID
    descricao_peca: str
    quantidade: int
    preco_unitario: Decimal
    custo_unitario: Decimal = Decimal("0.00")  # Custo no momento da venda (base do CMV real)

    @property
    def subtotal(self) -> Decimal:
        return (self.preco_unitario * Decimal(self.quantidade)).quantize(Decimal("0.01"))

    @property
    def custo_total(self) -> Decimal:
        return (self.custo_unitario * Decimal(self.quantidade)).quantize(Decimal("0.01"))


@dataclass
class VendaBalcao:
    id: uuid.UUID
    numero_venda: str
    operador_id: uuid.UUID
    cliente_id: Optional[uuid.UUID] = None
    itens: List[ItemVenda] = field(default_factory=list)
    desconto: Decimal = Decimal("0.00")
    forma_pagamento: Optional[FormaPagamento] = None
    status: StatusVenda = StatusVenda.CONCLUIDA
    autorizado_por_id: Optional[uuid.UUID] = None  # Gestor que autorizou desconto/preço fora da alçada
    referencia_pagamento: Optional[str] = None  # ex: txid da cobrança PIX
    motivo_cancelamento: Optional[str] = None
    cancelada_em: Optional[datetime] = None
    created_at: datetime = field(default_factory=agora_utc)

    def __post_init__(self):
        if not self.numero_venda or not self.numero_venda.strip():
            raise RegraNegocioException("Número da venda é obrigatório.")

    @property
    def subtotal(self) -> Decimal:
        return sum((item.subtotal for item in self.itens), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def custo_total(self) -> Decimal:
        return sum((item.custo_total for item in self.itens), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def valor_total(self) -> Decimal:
        return max(Decimal("0.00"), self.subtotal - self.desconto).quantize(Decimal("0.01"))

    @property
    def percentual_desconto(self) -> Decimal:
        if self.subtotal == Decimal("0.00"):
            return Decimal("0.00")
        return (self.desconto / self.subtotal * Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def quantidades_por_peca(self) -> Dict[uuid.UUID, int]:
        quantidades: Dict[uuid.UUID, int] = {}
        for item in self.itens:
            quantidades[item.peca_id] = quantidades.get(item.peca_id, 0) + item.quantidade
        return quantidades

    def _validar_aberta(self, acao: str):
        if self.forma_pagamento is not None:
            raise RegraNegocioException(f"Não é permitido {acao} uma venda já finalizada.")

    def adicionar_item(
        self,
        peca_id: uuid.UUID,
        descricao_peca: str,
        quantidade: int,
        preco_unitario: Decimal,
        custo_unitario: Decimal = Decimal("0.00")
    ):
        self._validar_aberta("alterar itens de")
        if quantidade <= 0:
            raise RegraNegocioException("Quantidade do item de venda deve ser maior que zero.")
        if preco_unitario < Decimal("0.00") or custo_unitario < Decimal("0.00"):
            raise RegraNegocioException("Preço unitário não pode ser negativo.")

        self.itens.append(ItemVenda(
            id=uuid.uuid4(),
            venda_id=self.id,
            peca_id=peca_id,
            descricao_peca=descricao_peca,
            quantidade=quantidade,
            preco_unitario=preco_unitario,
            custo_unitario=custo_unitario
        ))

    def aplicar_desconto(self, valor_desconto: Decimal):
        self._validar_aberta("aplicar desconto em")
        if valor_desconto < Decimal("0.00"):
            raise RegraNegocioException("Desconto não pode ser negativo.")
        if valor_desconto > self.subtotal:
            raise RegraNegocioException("Desconto não pode ser maior que o subtotal da venda.")
        self.desconto = valor_desconto.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def aplicar_desconto_percentual(self, percentual: Decimal):
        if percentual < Decimal("0") or percentual > Decimal("100"):
            raise RegraNegocioException("O percentual de desconto deve estar entre 0 e 100.")
        self.aplicar_desconto(self.subtotal * percentual / Decimal("100"))

    def finalizar(self, forma_pagamento: FormaPagamento):
        if not self.itens:
            raise RegraNegocioException("Não é possível finalizar uma venda sem itens.")
        self._validar_aberta("finalizar novamente")
        self.forma_pagamento = forma_pagamento
        self.status = StatusVenda.CONCLUIDA

    def cancelar(self, motivo: str):
        if self.status == StatusVenda.CANCELADA:
            raise RegraNegocioException("Venda já está cancelada.")
        if not motivo or not motivo.strip():
            raise RegraNegocioException("O motivo do cancelamento é obrigatório.")
        self.status = StatusVenda.CANCELADA
        self.motivo_cancelamento = motivo.strip()
        self.cancelada_em = agora_utc()
