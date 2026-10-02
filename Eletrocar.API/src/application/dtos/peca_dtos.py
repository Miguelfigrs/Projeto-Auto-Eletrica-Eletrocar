"""
DTOs para catálogo de peças e leitura de código de barras.
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
import uuid


@dataclass
class CriarPecaInputDTO:
    codigo_barras: str
    sku: str
    descricao: str
    preco_custo: Decimal
    preco_venda: Decimal
    estoque_atual: int
    estoque_minimo: int = 2
    localizacao: Optional[str] = None
    unidade_medida: str = "UN"


@dataclass
class PecaOutputDTO:
    id: uuid.UUID
    codigo_barras: str
    sku: str
    descricao: str
    preco_custo: Decimal
    preco_venda: Decimal
    estoque_atual: int
    estoque_minimo: int
    localizacao: Optional[str]
    unidade_medida: str
    abaixo_minimo: bool
    margem_lucro: Decimal
