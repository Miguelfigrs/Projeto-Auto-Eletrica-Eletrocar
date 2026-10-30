"""
Entidade: Peca (Aggregate Root)
Itens e componentes elétricos do estoque com código de barras, SKU, código original do fabricante,
aplicação veicular e controle de reserva para Ordens de Serviço.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
from src.domain.value_objects.tempo import agora_utc
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
    estoque_reservado: int = 0
    codigo_original_fabricante: Optional[str] = None  # ex: código Bosch / Delphi / Magneti Marelli
    fabricante: Optional[str] = None
    aplicacao_veicular: Optional[str] = None  # ex: "Gol G5 1.6, Fox 1.0"
    localizacao: Optional[str] = None
    unidade_medida: str = "UN"
    ativo: bool = True
    created_at: datetime = field(default_factory=agora_utc)

    def __post_init__(self):
        self.validar()

    def validar(self):
        """Valida invariantes e normaliza códigos (usado na criação e após edições de cadastro)."""
        if not self.codigo_barras or not self.codigo_barras.strip():
            raise RegraNegocioException("Código de barras é obrigatório.")
        if not self.sku or not self.sku.strip():
            raise RegraNegocioException("SKU da peça é obrigatório.")
        if not self.descricao or not self.descricao.strip():
            raise RegraNegocioException("Descrição da peça é obrigatória.")
        self.codigo_barras = self.codigo_barras.strip()
        self.sku = self.sku.strip().upper()
        if self.codigo_original_fabricante:
            self.codigo_original_fabricante = self.codigo_original_fabricante.strip().upper()
        self._validar_precos(self.preco_custo, self.preco_venda)
        if self.estoque_atual < 0:
            raise RegraNegocioException("Estoque não pode ser negativo.")
        if self.estoque_minimo < 0:
            raise RegraNegocioException("Estoque mínimo não pode ser negativo.")
        if self.estoque_reservado < 0 or self.estoque_reservado > self.estoque_atual:
            raise RegraNegocioException("Estoque reservado inválido.")

    @staticmethod
    def _validar_precos(preco_custo: Decimal, preco_venda: Decimal):
        if preco_custo < Decimal("0.00"):
            raise RegraNegocioException("Preço de custo não pode ser negativo.")
        if preco_venda < Decimal("0.00"):
            raise RegraNegocioException("Preço de venda não pode ser negativo.")

    @staticmethod
    def _validar_quantidade(quantidade: int):
        if quantidade <= 0:
            raise RegraNegocioException("A quantidade deve ser maior que zero.")

    @property
    def estoque_disponivel(self) -> int:
        """Saldo livre para venda: estoque físico menos o que está reservado para OS."""
        return self.estoque_atual - self.estoque_reservado

    def validar_saldo(self, quantidade: int):
        self._validar_quantidade(quantidade)
        if self.estoque_disponivel < quantidade:
            raise EstoqueInsuficienteException(
                peca_descricao=self.descricao,
                estoque_atual=self.estoque_disponivel,
                quantidade_requisitada=quantidade
            )

    def baixar_estoque(self, quantidade: int):
        """Baixa imediata (venda de balcão)."""
        self.validar_saldo(quantidade)
        self.estoque_atual -= quantidade

    def reservar(self, quantidade: int):
        """Reserva para OS: a peça sai do saldo disponível, mas só é baixada na finalização."""
        self.validar_saldo(quantidade)
        self.estoque_reservado += quantidade

    def liberar_reserva(self, quantidade: int):
        self._validar_quantidade(quantidade)
        if quantidade > self.estoque_reservado:
            raise RegraNegocioException("Quantidade a liberar maior que a reservada.")
        self.estoque_reservado -= quantidade

    def baixar_reserva(self, quantidade: int):
        """Converte a reserva da OS em baixa definitiva (finalização da OS)."""
        self.liberar_reserva(quantidade)
        self.estoque_atual -= quantidade

    def adicionar_estoque(self, quantidade: int):
        self._validar_quantidade(quantidade)
        self.estoque_atual += quantidade

    def estornar(self, quantidade: int):
        """Devolve ao estoque itens de uma venda cancelada."""
        self.adicionar_estoque(quantidade)

    def ajustar_saldo(self, novo_saldo: int) -> int:
        """Ajuste manual de inventário. Retorna a diferença aplicada."""
        if novo_saldo < self.estoque_reservado:
            raise RegraNegocioException(
                f"O saldo ajustado ({novo_saldo}) não pode ser menor que o reservado para OS ({self.estoque_reservado})."
            )
        diferenca = novo_saldo - self.estoque_atual
        self.estoque_atual = novo_saldo
        return diferenca

    def alterar_precos(self, preco_custo: Decimal, preco_venda: Decimal):
        self._validar_precos(preco_custo, preco_venda)
        self.preco_custo = preco_custo.quantize(Decimal("0.01"))
        self.preco_venda = preco_venda.quantize(Decimal("0.01"))

    def esta_abaixo_minimo(self) -> bool:
        return self.estoque_disponivel <= self.estoque_minimo

    def calcular_margem_lucro(self) -> Decimal:
        if self.preco_venda == Decimal("0.00"):
            return Decimal("0.00")
        lucro = self.preco_venda - self.preco_custo
        return ((lucro / self.preco_venda) * Decimal("100.00")).quantize(Decimal("0.01"))
