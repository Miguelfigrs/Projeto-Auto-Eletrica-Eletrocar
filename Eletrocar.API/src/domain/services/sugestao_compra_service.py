"""
Domain Service: SugestaoCompraService
Sugestão de compra baseada no giro médio de consumo (RF23).
quantidade = giro_diario x dias_de_cobertura + estoque_minimo - estoque_disponivel
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_CEILING
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass(frozen=True)
class SugestaoCompra:
    giro_medio_diario: Decimal
    quantidade_sugerida: int


class SugestaoCompraService:
    @staticmethod
    def calcular(
        estoque_disponivel: int,
        estoque_minimo: int,
        consumo_periodo: int,
        dias_periodo: int,
        dias_cobertura: int
    ) -> SugestaoCompra:
        if dias_periodo <= 0 or dias_cobertura <= 0:
            raise RegraNegocioException("Os períodos de análise e de cobertura devem ser positivos.")
        giro = (Decimal(consumo_periodo) / Decimal(dias_periodo)).quantize(Decimal("0.01"))
        necessidade = (
            Decimal(consumo_periodo) / Decimal(dias_periodo) * Decimal(dias_cobertura)
            + Decimal(estoque_minimo)
            - Decimal(estoque_disponivel)
        )
        quantidade = int(necessidade.to_integral_value(rounding=ROUND_CEILING)) if necessidade > 0 else 0
        return SugestaoCompra(giro_medio_diario=giro, quantidade_sugerida=quantidade)
