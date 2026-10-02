"""
DTOs para Ordem de Serviço (Balcão e Telegram Voice Bot).
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
import uuid


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


@dataclass
class CriarOSVozInputDTO:
    telegram_user_id: str
    nome_cliente: str
    carro_modelo: str
    carro_marca: str = "Geral"
    carro_placa: Optional[str] = None
    carro_ano: Optional[str] = None
    sintomas_relatados: str = ""
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = field(default_factory=dict)
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
    preco_unitario: Optional[Decimal] = None


@dataclass
class AdicionarServicoOSInputDTO:
    os_id: uuid.UUID
    descricao: str
    valor: Decimal
    eletricista_id: Optional[uuid.UUID] = None


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
    sucesso: bool = True
