"""
DTOs para Ordem de Serviço (Balcão e Telegram Voice Bot).
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
import uuid
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.value_objects.enums import FormaPagamento
from src.application.dtos.venda_dtos import AutorizacaoGerencialDTO


@dataclass
class ItemOSOutputDTO:
    id: uuid.UUID
    peca_id: uuid.UUID
    descricao_peca: str
    quantidade: int
    preco_unitario: Decimal
    subtotal: Decimal


@dataclass
class ServicoOSOutputDTO:
    id: uuid.UUID
    descricao: str
    valor: Decimal
    eletricista_responsavel_id: Optional[uuid.UUID]


@dataclass
class CriarOSBalcaoInputDTO:
    usuario_id: uuid.UUID
    cliente_id: uuid.UUID
    carro_id: uuid.UUID
    sintomas: str
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = field(default_factory=dict)
    observacoes: Optional[str] = None
    prioridade: str = "MEDIA"


@dataclass
class CriarOSVozInputDTO:
    telegram_user_id: str
    nome_cliente: str
    carro_modelo: str
    carro_marca: Optional[str] = None
    carro_placa: Optional[str] = None
    carro_ano: Optional[str] = None
    sintomas_relatados: str = ""
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = field(default_factory=dict)
    servicos_sugeridos: List[str] = field(default_factory=list)
    prioridade: str = "MEDIA"
    telefone_cliente: Optional[str] = None


@dataclass
class AtualizarStatusOSInputDTO:
    os_id: uuid.UUID
    novo_status: str
    usuario_id: uuid.UUID


@dataclass
class AlocarPecaOSInputDTO:
    os_id: uuid.UUID
    peca_id: uuid.UUID
    quantidade: int
    usuario_id: Optional[uuid.UUID] = None


@dataclass
class AdicionarServicoOSInputDTO:
    os_id: uuid.UUID
    descricao: str
    valor: Decimal
    eletricista_id: Optional[uuid.UUID] = None


@dataclass
class AplicarDescontoOSInputDTO:
    os_id: uuid.UUID
    desconto: Decimal
    operador_id: uuid.UUID
    autorizacao: Optional[AutorizacaoGerencialDTO] = None


@dataclass
class FaturarOSInputDTO:
    os_id: uuid.UUID
    forma_pagamento: FormaPagamento
    operador_id: uuid.UUID
    cobranca_pix_id: Optional[uuid.UUID] = None


@dataclass
class OrdemServicoOutputDTO:
    id: uuid.UUID
    numero_os: str
    cliente_id: uuid.UUID
    nome_cliente: str
    carro_id: uuid.UUID
    descricao_carro: str
    usuario_id: uuid.UUID
    status: str
    origem: str
    prioridade: str
    sintomas: str
    hipotese_diagnostica: Optional[str]
    checklist_eletrico: Dict[str, Any]
    itens: List[ItemOSOutputDTO]
    servicos: List[ServicoOSOutputDTO]
    valor_pecas: Decimal
    valor_servicos: Decimal
    desconto: Decimal
    valor_total: Decimal
    created_at: datetime
    updated_at: datetime
    observacoes: Optional[str] = None
    forma_pagamento: Optional[str] = None
    finalizada_em: Optional[datetime] = None
    entregue_em: Optional[datetime] = None
    sucesso: bool = True

    @classmethod
    def de(cls, os: OrdemServico, nome_cliente: str, descricao_carro: str) -> "OrdemServicoOutputDTO":
        return cls(
            id=os.id,
            numero_os=os.numero_os,
            cliente_id=os.cliente_id,
            nome_cliente=nome_cliente,
            carro_id=os.carro_id,
            descricao_carro=descricao_carro,
            usuario_id=os.usuario_id,
            status=os.status.value,
            origem=os.origem.value,
            prioridade=os.prioridade.value,
            sintomas=os.sintomas,
            hipotese_diagnostica=os.hipotese_diagnostica,
            checklist_eletrico=os.checklist_eletrico,
            itens=[
                ItemOSOutputDTO(
                    id=it.id, peca_id=it.peca_id, descricao_peca=it.descricao_peca,
                    quantidade=it.quantidade, preco_unitario=it.preco_unitario, subtotal=it.subtotal
                )
                for it in os.itens
            ],
            servicos=[
                ServicoOSOutputDTO(
                    id=s.id, descricao=s.descricao, valor=s.valor,
                    eletricista_responsavel_id=s.eletricista_responsavel_id
                )
                for s in os.servicos
            ],
            valor_pecas=os.valor_pecas,
            valor_servicos=os.valor_servicos,
            desconto=os.desconto,
            valor_total=os.valor_total,
            created_at=os.created_at,
            updated_at=os.updated_at,
            observacoes=os.observacoes,
            forma_pagamento=os.forma_pagamento.value if os.forma_pagamento else None,
            finalizada_em=os.finalizada_em,
            entregue_em=os.entregue_em,
        )
