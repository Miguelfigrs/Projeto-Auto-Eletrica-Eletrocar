"""
Entidade: Carro
Representa o veículo vinculado a um Cliente (composição no DDD).
"""
from dataclasses import dataclass
from typing import Optional
import uuid
from src.domain.exceptions.domain_exceptions import RegraNegocioException


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

    def formatar_descricao(self) -> str:
        placa_str = f" [{self.placa}]" if self.placa else ""
        ano_str = f" ({self.ano})" if self.ano else ""
        return f"{self.marca} {self.modelo}{ano_str}{placa_str}"
