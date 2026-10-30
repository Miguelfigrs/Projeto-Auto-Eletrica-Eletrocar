"""
Value Object: PinOperador
PIN numérico de 4 a 6 dígitos usado na troca rápida de operador (Lock Screen) e na alçada gerencial.
"""
import re
from src.domain.exceptions.domain_exceptions import RegraNegocioException


class PinOperador:
    def __init__(self, valor: str):
        pin = (valor or "").strip()
        if not re.fullmatch(r"\d{4,6}", pin):
            raise RegraNegocioException("O PIN de operador deve conter entre 4 e 6 dígitos numéricos.")
        self._valor = pin

    @property
    def valor(self) -> str:
        return self._valor

    def __repr__(self) -> str:
        return "PinOperador(****)"
