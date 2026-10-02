"""
Entidade: Peca
Representa itens e componentes elétricos no catálogo de estoque com código de barras e SKU.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
from src.domain.exceptions.domain_exceptions import EstoqueInsuficienteException, RegraNegocioException


@dataclass
class Peca:
    id: uuid.UUID
    codigo_barras: str
    sku: str
    descricao: str
    preco_custo: Decimal
    preco_venda: Decimal
    estoque_atual: int
    estoque_minimo: int = 2
    localizacao: Optional[str] = None
    unidade_medida: str = "UN"
    ativo: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if not self.codigo_barras or not self.codigo_barras.strip():
            raise RegraNegocioException("Código de barras é obrigatório.")
        if not self.sku or not self.sku.strip():
            raise RegraNegocioException("SKU da peça é obrigatório.")
        if not self.descricao or not self.descricao.strip():
            raise RegraNegocioException("Descrição da peça é obrigatória.")
        if self.preco_custo < Decimal("0.00"):
            raise RegraNegocioException("Preço de custo não pode ser negativo.")
        if self.preco_venda < Decimal("0.00"):
            raise RegraNegocioException("Preço de venda não pode ser negativo.")
        if self.estoque_atual < 0:
            raise RegraNegocioException("Estoque inicial não pode ser negativo.")

    def baixar_estoque(self, quantidade: int):
        if quantidade <= 0:
            raise RegraNegocioException("A quantidade para baixa de estoque deve ser maior que zero.")
        if self.estoque_atual < quantidade:
            raise EstoqueInsuficienteException(
                peca_descricao=self.descricao,
                estoque_atual=self.estoque_atual,
                quantidade_requisitada=quantidade
            )
        self.estoque_atual -= quantidade

    def adicionar_estoque(self, quantidade: int):
        if quantidade <= 0:
            raise RegraNegocioException("A quantidade para entrada de estoque deve ser maior que zero.")
        self.estoque_atual += quantidade

    def esta_abaixo_minimo(self) -> bool:
        return self.estoque_atual <= self.estoque_minimo

    def calcular_margem_lucro(self) -> Decimal:
        if self.preco_venda == Decimal("0.00"):
            return Decimal("0.00")
        lucro = self.preco_venda - self.preco_custo
        return ((lucro / self.preco_venda) * Decimal("100.00")).quantize(Decimal("0.01"))
