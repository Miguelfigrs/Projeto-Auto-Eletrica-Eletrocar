"""
DTOs para Venda Balcão / PDV Rápido.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.value_objects.enums import FormaPagamento


@dataclass
class AutorizacaoGerencialDTO:
    """Credenciais do gestor que autoriza desconto/preço fora da alçada do operador (UC04)."""
    identificador_gestor: str  # e-mail ou usuário do administrador
    pin: str


@dataclass
class ItemVendaInputDTO:
    peca_id: uuid.UUID
    quantidade: int
    preco_unitario_customizado: Optional[Decimal] = None


@dataclass
class RealizarVendaInputDTO:
    operador_id: uuid.UUID
    itens: List[ItemVendaInputDTO]
    forma_pagamento: FormaPagamento = FormaPagamento.DINHEIRO
    desconto: Decimal = Decimal("0.00")
    desconto_percentual: Optional[Decimal] = None
    cliente_id: Optional[uuid.UUID] = None
    cobranca_pix_id: Optional[uuid.UUID] = None
    autorizacao: Optional[AutorizacaoGerencialDTO] = None


@dataclass
class CancelarVendaInputDTO:
    venda_id: uuid.UUID
    motivo: str
    executor_id: uuid.UUID


@dataclass
class ItemVendaOutputDTO:
    id: uuid.UUID
    peca_id: uuid.UUID
    descricao_peca: str
    quantidade: int
    preco_unitario: Decimal
    subtotal: Decimal


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
    autorizado_por_id: Optional[uuid.UUID] = None
    motivo_cancelamento: Optional[str] = None
    sucesso: bool = True

    @classmethod
    def de(cls, venda: VendaBalcao) -> "VendaOutputDTO":
        return cls(
            id=venda.id,
            numero_venda=venda.numero_venda,
            operador_id=venda.operador_id,
            cliente_id=venda.cliente_id,
            itens=[
                ItemVendaOutputDTO(
                    id=it.id,
                    peca_id=it.peca_id,
                    descricao_peca=it.descricao_peca,
                    quantidade=it.quantidade,
                    preco_unitario=it.preco_unitario,
                    subtotal=it.subtotal
                )
                for it in venda.itens
            ],
            subtotal=venda.subtotal,
            desconto=venda.desconto,
            valor_total=venda.valor_total,
            forma_pagamento=venda.forma_pagamento.value if venda.forma_pagamento else "",
            status=venda.status.value,
            data_hora=venda.created_at,
            autorizado_por_id=venda.autorizado_por_id,
            motivo_cancelamento=venda.motivo_cancelamento,
        )
