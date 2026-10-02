"""
Entidade: VendaBalcao (Aggregate Root) e ItemVenda
Operação de balcão / PDV rápido para venda direta de peças elétricas.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from src.domain.value_objects.enums import FormaPagamento, StatusVenda
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass
class ItemVenda:
    id: uuid.UUID
    venda_id: uuid.UUID
    peca_id: uuid.UUID
    descricao_peca: str
    quantidade: int
    preco_unitario: Decimal

    @property
    def subtotal(self) -> Decimal:
        return (self.preco_unitario * Decimal(self.quantidade)).quantize(Decimal("0.01"))


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
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if not self.numero_venda or not self.numero_venda.strip():
            raise RegraNegocioException("Número da venda é obrigatório.")

    @property
    def subtotal(self) -> Decimal:
        return sum((item.subtotal for item in self.itens), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def valor_total(self) -> Decimal:
        total = self.subtotal - self.desconto
        return max(Decimal("0.00"), total).quantize(Decimal("0.01"))

    def adicionar_item(self, peca_id: uuid.UUID, descricao_peca: str, quantidade: int, preco_unitario: Decimal):
        if self.forma_pagamento is not None:
            raise RegraNegocioException("Não é permitido alterar itens de uma venda já finalizada.")
        if quantidade <= 0:
            raise RegraNegocioException("Quantidade do item de venda deve ser maior que zero.")
        if preco_unitario < Decimal("0.00"):
            raise RegraNegocioException("Preço unitário não pode ser negativo.")

        item = ItemVenda(
            id=uuid.uuid4(),
            venda_id=self.id,
            peca_id=peca_id,
            descricao_peca=descricao_peca,
            quantidade=quantidade,
            preco_unitario=preco_unitario
        )
        self.itens.append(item)

    def aplicar_desconto(self, valor_desconto: Decimal):
        if self.forma_pagamento is not None:
            raise RegraNegocioException("Não é permitido aplicar desconto em uma venda já finalizada.")
        if valor_desconto < Decimal("0.00"):
            raise RegraNegocioException("Desconto não pode ser negativo.")
        if valor_desconto > self.subtotal:
            raise RegraNegocioException("Desconto não pode ser maior que o subtotal da venda.")
        self.desconto = valor_desconto.quantize(Decimal("0.01"))

    def finalizar(self, forma_pagamento: FormaPagamento):
        if not self.itens:
            raise RegraNegocioException("Não é possível finalizar uma venda sem itens.")
        if self.forma_pagamento is not None:
            raise RegraNegocioException("Venda já foi finalizada anteriormente.")
        self.forma_pagamento = forma_pagamento
        self.status = StatusVenda.CONCLUIDA

    def cancelar(self):
        if self.status == StatusVenda.CANCELADA:
            raise RegraNegocioException("Venda já está cancelada.")
        self.status = StatusVenda.CANCELADA
