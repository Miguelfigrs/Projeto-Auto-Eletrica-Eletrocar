"""
DTOs para catálogo de peças, leitura de código de barras e movimentação de estoque.
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
import uuid
from src.domain.entities.peca import Peca


@dataclass
class CriarPecaInputDTO:
    codigo_barras: str
    sku: str
    descricao: str
    preco_custo: Decimal
    preco_venda: Decimal
    estoque_atual: int
    estoque_minimo: int = 2
    codigo_original_fabricante: Optional[str] = None
    fabricante: Optional[str] = None
    aplicacao_veicular: Optional[str] = None
    localizacao: Optional[str] = None
    unidade_medida: str = "UN"


@dataclass
class AtualizarPecaInputDTO:
    peca_id: uuid.UUID
    executor_id: uuid.UUID
    descricao: Optional[str] = None
    preco_custo: Optional[Decimal] = None
    preco_venda: Optional[Decimal] = None
    estoque_minimo: Optional[int] = None
    codigo_original_fabricante: Optional[str] = None
    fabricante: Optional[str] = None
    aplicacao_veicular: Optional[str] = None
    localizacao: Optional[str] = None
    ativo: Optional[bool] = None


@dataclass
class EntradaEstoqueInputDTO:
    peca_id: uuid.UUID
    quantidade: int
    executor_id: uuid.UUID
    custo_unitario: Optional[Decimal] = None
    observacao: str = ""


@dataclass
class AjusteEstoqueInputDTO:
    peca_id: uuid.UUID
    novo_saldo: int
    motivo: str
    executor_id: uuid.UUID


@dataclass
class PecaOutputDTO:
    id: uuid.UUID
    codigo_barras: str
    sku: str
    descricao: str
    preco_custo: Decimal
    preco_venda: Decimal
    estoque_atual: int
    estoque_reservado: int
    estoque_disponivel: int
    estoque_minimo: int
    localizacao: Optional[str]
    unidade_medida: str
    abaixo_minimo: bool
    margem_lucro: Decimal
    codigo_original_fabricante: Optional[str] = None
    fabricante: Optional[str] = None
    aplicacao_veicular: Optional[str] = None
    ativo: bool = True

    @classmethod
    def de(cls, p: Peca) -> "PecaOutputDTO":
        return cls(
            id=p.id,
            codigo_barras=p.codigo_barras,
            sku=p.sku,
            descricao=p.descricao,
            preco_custo=p.preco_custo,
            preco_venda=p.preco_venda,
            estoque_atual=p.estoque_atual,
            estoque_reservado=p.estoque_reservado,
            estoque_disponivel=p.estoque_disponivel,
            estoque_minimo=p.estoque_minimo,
            localizacao=p.localizacao,
            unidade_medida=p.unidade_medida,
            abaixo_minimo=p.esta_abaixo_minimo(),
            margem_lucro=p.calcular_margem_lucro(),
            codigo_original_fabricante=p.codigo_original_fabricante,
            fabricante=p.fabricante,
            aplicacao_veicular=p.aplicacao_veicular,
            ativo=p.ativo,
        )


@dataclass
class SugestaoCompraOutputDTO:
    peca_id: uuid.UUID
    sku: str
    descricao: str
    estoque_disponivel: int
    estoque_minimo: int
    consumo_periodo: int
    giro_medio_diario: Decimal
    quantidade_sugerida: int
