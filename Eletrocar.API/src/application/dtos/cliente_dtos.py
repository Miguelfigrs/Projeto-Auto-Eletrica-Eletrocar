"""
DTOs para gestão de clientes e seus veículos vinculados.
"""
from dataclasses import dataclass, field
from typing import List, Optional
import uuid


@dataclass
class CarroInputDTO:
    modelo: str
    marca: str
    placa: Optional[str] = None
    ano: Optional[str] = None


@dataclass
class CarroOutputDTO:
    id: uuid.UUID
    modelo: str
    marca: str
    placa: Optional[str]
    ano: Optional[str]
    descricao_completa: str


@dataclass
class CadastrarClienteInputDTO:
    nome: str
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    carros: List[CarroInputDTO] = field(default_factory=list)


@dataclass
class ClienteOutputDTO:
    id: uuid.UUID
    nome: str
    cpf_cnpj: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    carros: List[CarroOutputDTO] = field(default_factory=list)
