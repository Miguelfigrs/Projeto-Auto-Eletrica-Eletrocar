"""
Value Object: CodigoBarras
Valida e padroniza códigos de barras (EAN-13, EAN-8, Code 128) ou códigos SKU de peças automotivas.
"""
import re
from src.domain.exceptions.domain_exceptions import RegraNegocioException


class CodigoBarras:
    """Value object para validação e normalização de códigos de barras e SKUs."""

    def __init__(self, valor: str):
        if not valor or not valor.strip():
            raise RegraNegocioException("Código de barras não pode ser vazio.")
        
        # Limpa espaços e quebras de linha que o leitor de código de barras possa injetar
        codigo_limpo = valor.strip()
        self._valor = codigo_limpo
        self._tipo = self._identificar_tipo(codigo_limpo)

    @property
    def valor(self) -> str:
        return self._valor

    @property
    def tipo(self) -> str:
        return self._tipo

    def _identificar_tipo(self, codigo: str) -> str:
        # Se for puramente numérico e possuir 13 dígitos: EAN-13
        if re.fullmatch(r"\d{13}", codigo):
            return "EAN13"
        # Se for puramente numérico e possuir 8 dígitos: EAN-8
        if re.fullmatch(r"\d{8}", codigo):
            return "EAN8"
        # Se for alfanumérico com hífen/sublinhado: SKU / Part Number
        return "SKU"

    def __eq__(self, outro: object) -> bool:
        if not isinstance(outro, CodigoBarras):
            return False
        return self._valor == outro.valor

    def __hash__(self) -> int:
        return hash(self._valor)

    def __repr__(self) -> str:
        return f"CodigoBarras({self._valor}, tipo={self._tipo})"
