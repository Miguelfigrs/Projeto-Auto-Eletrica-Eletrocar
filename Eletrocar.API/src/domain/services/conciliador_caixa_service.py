"""
Domain Service: ConciliadorCaixaService
Conciliação cega de múltiplos meios de pagamento (Dinheiro, PIX, Cartões).
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict
from src.domain.value_objects.enums import FormaPagamento


@dataclass(frozen=True)
class ResultadoConciliacao:
    saldo_teorico_por_forma: Dict[FormaPagamento, Decimal]
    saldo_contado_por_forma: Dict[FormaPagamento, Decimal]
    diferencas_por_forma: Dict[FormaPagamento, Decimal]
    diferenca_total: Decimal
    houve_divergencia: bool
    status: str  # CORRETO, QUEBRA_DE_CAIXA, SOBRA_DE_CAIXA


class ConciliadorCaixaService:
    @staticmethod
    def conciliar(
        saldo_teorico: Dict[FormaPagamento, Decimal],
        saldo_contado: Dict[FormaPagamento, Decimal]
    ) -> ResultadoConciliacao:
        diferencas: Dict[FormaPagamento, Decimal] = {}
        diferenca_total = Decimal("0.00")

        todas_formas = set(saldo_teorico.keys()).union(set(saldo_contado.keys()))

        for forma in todas_formas:
            teorico = saldo_teorico.get(forma, Decimal("0.00"))
            contado = saldo_contado.get(forma, Decimal("0.00"))
            diff = (contado - teorico).quantize(Decimal("0.01"))
            diferencas[forma] = diff
            diferenca_total += diff

        houve_divergencia = diferenca_total != Decimal("0.00") or any(v != Decimal("0.00") for v in diferencas.values())

        if diferenca_total < Decimal("0.00"):
            status = "QUEBRA_DE_CAIXA"
        elif diferenca_total > Decimal("0.00"):
            status = "SOBRA_DE_CAIXA"
        else:
            status = "CORRETO"

        return ResultadoConciliacao(
            saldo_teorico_por_forma=saldo_teorico,
            saldo_contado_por_forma=saldo_contado,
            diferencas_por_forma=diferencas,
            diferenca_total=diferenca_total.quantize(Decimal("0.01")),
            houve_divergencia=houve_divergencia,
            status=status
        )
