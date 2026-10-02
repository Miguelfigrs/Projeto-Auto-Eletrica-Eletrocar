"""
Entidade: Cliente (Aggregate Root)
Gerencia seus veículos vinculados e dados cadastrais de balcão.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
import uuid
from src.domain.entities.carro import Carro
from src.domain.value_objects.cpf_cnpj import CpfCnpj
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass
class Cliente:
    id: uuid.UUID
    nome: str
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    carros: List[Carro] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if not self.nome or not self.nome.strip():
            raise RegraNegocioException("Nome do cliente é obrigatório.")
        if self.cpf_cnpj:
            # Valida através do Value Object
            vo = CpfCnpj(self.cpf_cnpj)
            self.cpf_cnpj = vo.somente_digitos()

    def adicionar_carro(self, carro: Carro):
        if carro.cliente_id != self.id:
            raise RegraNegocioException("O carro pertence a outro cliente.")
        self.carros.append(carro)

    def remover_carro(self, carro_id: uuid.UUID):
        self.carros = [c for c in self.carros if c.id != carro_id]

    def buscar_carro_por_id(self, carro_id: uuid.UUID) -> Optional[Carro]:
        for c in self.carros:
            if c.id == carro_id:
                return c
        return None
