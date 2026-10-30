"""
DTOs para fluxo e fechamento cego de caixa diário.
Os DTOs do operador NUNCA expõem saldo teórico, totais calculados ou quebra/sobra;
essas informações existem apenas nos DTOs gerenciais.
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
    tipo: str  # SUPRIMENTO ou SANGRIA
    valor: Decimal
    forma_pagamento: FormaPagamento = FormaPagamento.DINHEIRO
    descricao: str = ""


@dataclass
class FechamentoCegoInputDTO:
    operador_id: uuid.UUID
    valores_contados: Dict[FormaPagamento, Decimal] = field(default_factory=dict)


@dataclass
class MovimentacaoOutputDTO:
    id: uuid.UUID
    tipo: str
    valor: Decimal
    forma_pagamento: str
    descricao: str
    created_at: datetime


@dataclass
class CaixaOperadorOutputDTO:
    """Visão do operador de balcão (sem saldos calculados)."""
    id: uuid.UUID
    operador_id: uuid.UUID
    status: str
    saldo_inicial: Decimal
    data_abertura: datetime
    quantidade_movimentacoes: int


@dataclass
class FechamentoCegoConfirmacaoDTO:
    """Resposta ao operador no fechamento cego: apenas a confirmação."""
    caixa_id: uuid.UUID
    data_fechamento: datetime
    mensagem: str = "Caixa fechado. Valores informados registrados para conferência da gerência."


@dataclass
class CaixaGerencialOutputDTO:
    id: uuid.UUID
    operador_id: uuid.UUID
    status: str
    saldo_inicial: Decimal
    saldo_teorico_dinheiro: Decimal
    totais_por_forma: Dict[str, Decimal]
    data_abertura: datetime
    data_fechamento: Optional[datetime]
    movimentacoes: List[MovimentacaoOutputDTO]


@dataclass
class ConciliacaoFormaDTO:
    forma_pagamento: str
    teorico: Decimal
    contado: Decimal
    diferenca: Decimal


@dataclass
class RelatorioFechamentoOutputDTO:
    caixa_id: uuid.UUID
    operador_id: uuid.UUID
    data_abertura: datetime
    data_fechamento: datetime
    formas: List[ConciliacaoFormaDTO]
    diferenca_total: Decimal
    status: str  # CORRETO, QUEBRA_DE_CAIXA, SOBRA_DE_CAIXA
