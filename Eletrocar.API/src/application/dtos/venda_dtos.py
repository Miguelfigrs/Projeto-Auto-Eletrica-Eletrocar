"""
DTOs para Venda Balcão / PDV Rápido.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from src.domain.value_objects.enums import FormaPagamento


@dataclass
class ItemVendaInputDTO:
    peca_id: uuid.UUID
    quantidade: int
    preco_unitario_customizado: Optional[Decimal] = None


@dataclass
class ItemVendaOutputDTO:
    id: uuid.UUID
    peca_id: uuid.UUID
    descricao_peca: str
    quantidade: int
    preco_unitario: Decimal
    subtotal: Decimal


@dataclass
class RealizarVendaInputDTO:
    operador_id: uuid.UUID
    itens: List[ItemVendaInputDTO]
    desconto: Decimal = Decimal("0.00")
    forma_pagamento: FormaPagamento = FormaPagamento.DINHEIRO
    cliente_id: Optional[uuid.UUID] = None


@dataclass
class VendaOutputDTO:
    id: uuid.UUID
    numero_venda: str
    operador_id: uuid.UUID
    cliente_id: Optional[uuid.UUID]
    itens: List[ItemVendaOutputDTO]
    subtotal: Decimal
    desconto: Decimal
    valor_total: Decimal
    forma_pagamento: str
    status: str
    data_hora: datetime
    sucesso: bool = True
