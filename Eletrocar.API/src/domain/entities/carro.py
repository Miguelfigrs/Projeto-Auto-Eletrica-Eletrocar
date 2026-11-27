"""
Entidade: Carro
Representa o veículo vinculado a um Cliente (composição no DDD).
"""
from dataclasses import dataclass
from typing import Optional
import uuid
from src.domain.exceptions.domain_exceptions import RegraNegocioException

# Marcador gravado quando a OS é aberta sem a marca do veículo (não deve aparecer para o cliente)
MARCAS_NAO_INFORMADAS = {"", "não informada", "nao informada"}


@dataclass
class Carro:
    id: uuid.UUID
    cliente_id: uuid.UUID
    modelo: str
    marca: str
    placa: Optional[str] = None
    ano: Optional[str] = None

    def __post_init__(self):
        if not self.modelo or not self.modelo.strip():
            raise RegraNegocioException("Modelo do veículo é obrigatório.")
        if not self.marca or not self.marca.strip():
            raise RegraNegocioException("Marca do veículo é obrigatória.")
        if self.placa:
            self.placa = self.placa.strip().upper().replace("-", "")

    @property
    def marca_e_modelo(self) -> str:
        """Marca + modelo, sem o marcador "Não informada" gravado quando o balcão não sabe a marca."""
        marca = (self.marca or "").strip()
        if marca.lower() in MARCAS_NAO_INFORMADAS:
            return self.modelo.strip()
        return f"{marca} {self.modelo}".strip()

    def formatar_descricao(self) -> str:
        placa_str = f" [{self.placa}]" if self.placa else ""
        ano_str = f" ({self.ano})" if self.ano else ""
        return f"{self.marca_e_modelo}{ano_str}{placa_str}"
