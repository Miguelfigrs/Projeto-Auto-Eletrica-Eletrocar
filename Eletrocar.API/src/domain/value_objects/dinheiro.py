"""
Value Object: Dinheiro
Garante precisão decimal financeira estrita e sem imprecisão de ponto flutuante.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Union
from src.domain.exceptions.domain_exceptions import RegraNegocioException


class Dinheiro:
    """Value Object imutável para valores monetários em Real (BRL)."""

    def __init__(self, valor: Union[Decimal, str, int, float], permitir_negativo: bool = True):
        try:
            if isinstance(valor, float):
                # Converte float para string para evitar artefatos de ponto flutuante binário
                decimal_val = Decimal(str(valor))
            else:
                decimal_val = Decimal(valor)
        except Exception as e:
            raise RegraNegocioException(f"Valor monetário inválido: {valor}") from e

        # Quantização em 2 casas decimais
        self._valor = decimal_val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if not permitir_negativo and self._valor < Decimal("0.00"):
            raise RegraNegocioException("Valor monetário não pode ser negativo.")

    @property
    def valor(self) -> Decimal:
        return self._valor

    def formatar(self) -> str:
        """Formata no padrão monetário brasileiro: R$ 1.250,50"""
        valor_str = f"{self._valor:,.2f}"
        # Inverte vírgula e ponto para o padrão PT-BR
        valor_br = valor_str.replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {valor_br}"

    def __add__(self, outro: "Dinheiro") -> "Dinheiro":
        if not isinstance(outro, Dinheiro):
            raise TypeError("Operação de soma permitida apenas entre instâncias de Dinheiro.")
        return Dinheiro(self._valor + outro.valor)

    def __sub__(self, outro: "Dinheiro") -> "Dinheiro":
        if not isinstance(outro, Dinheiro):
            raise TypeError("Operação de subtração permitida apenas entre instâncias de Dinheiro.")
        return Dinheiro(self._valor - outro.valor)

    def __mul__(self, fator: Union[int, Decimal, float]) -> "Dinheiro":
        if isinstance(fator, float):
            fator_dec = Decimal(str(fator))
        else:
            fator_dec = Decimal(fator)
        return Dinheiro(self._valor * fator_dec)

    def __eq__(self, outro: object) -> bool:
        if not isinstance(outro, Dinheiro):
            return False
        return self._valor == outro.valor

    def __lt__(self, outro: "Dinheiro") -> bool:
        return self._valor < outro.valor

    def __le__(self, outro: "Dinheiro") -> bool:
        return self._valor <= outro.valor

    def __gt__(self, outro: "Dinheiro") -> bool:
        return self._valor > outro.valor

    def __ge__(self, outro: "Dinheiro") -> bool:
        return self._valor >= outro.valor

    def __repr__(self) -> str:
        return f"Dinheiro({self._valor})"
