"""
Domain Service: PoliticaAlcadaService
Define quando um desconto ou alteração de preço exige autorização gerencial (alçada - RF08 / UC04).
"""
from decimal import Decimal


class PoliticaAlcadaService:
    @staticmethod
    def exige_autorizacao(
        subtotal: Decimal,
        desconto: Decimal,
        limite_percentual: Decimal,
        houve_alteracao_preco: bool
    ) -> bool:
        if houve_alteracao_preco:
            return True
        if subtotal <= Decimal("0.00") or desconto <= Decimal("0.00"):
            return False
        percentual = desconto / subtotal * Decimal("100")
        return percentual > limite_percentual
