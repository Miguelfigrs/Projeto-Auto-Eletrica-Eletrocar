"""
DTOs para fluxo e fechamento de caixa diário.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
import uuid
from src.domain.value_objects.enums import FormaPagamento


@dataclass
class AbrirCaixaInputDTO:
    operador_id: uuid.UUID
    saldo_inicial: Decimal = Decimal("0.00")


@dataclass
class MovimentarCaixaInputDTO:
    operador_id: uuid.UUID
    tipo: str  # SUPRIMENTO, SANGRIA
    valor: Decimal
    forma_pagamento: FormaPagamento = FormaPagamento.DINHEIRO
    descricao: str = ""


@dataclass
class MovimentacaoOutputDTO:
    id: uuid.UUID
    tipo: str
    valor: Decimal
    forma_pagamento: str
    descricao: str
    created_at: datetime
    sucesso: bool = True


@dataclass
class FechamentoCegoInputDTO:
    operador_id: uuid.UUID
    valores_contados: Dict[FormaPagamento, Decimal] = field(default_factory=dict)


@dataclass
class FechamentoCegoOutputDTO:
    caixa_id: uuid.UUID
    saldo_teorico_dinheiro: Decimal
    saldo_contado_dinheiro: Decimal
    diferenca_total: Decimal
    quebra_ou_sobra: str
    data_fechamento: datetime
    sucesso: bool = True


@dataclass
class CaixaOutputDTO:
    id: uuid.UUID
    operador_id: uuid.UUID
    status: str
    saldo_inicial: Decimal
    saldo_teorico: Decimal
    data_abertura: datetime
    data_fechamento: Optional[datetime] = None
    movimentacoes: List[MovimentacaoOutputDTO] = field(default_factory=list)
