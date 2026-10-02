"""
DTOs para autenticação e gestão de usuários.
"""
from dataclasses import dataclass
from typing import Optional
import uuid


@dataclass
class LoginInputDTO:
    email: str
    senha: str


@dataclass
class TrocaOperadorPinInputDTO:
    usuario_id: uuid.UUID
    pin: str


@dataclass
class CriarUsuarioInputDTO:
    nome: str
    email: str
    senha: str
    role: str
    pin_caixa: Optional[str] = None
    telegram_user_id: Optional[str] = None


@dataclass
class UsuarioOutputDTO:
    id: uuid.UUID
    nome: str
    email: str
    role: str
    ativo: bool
    telegram_user_id: Optional[str] = None
    tem_pin_caixa: bool = False

    @property
    def usuario_id(self) -> uuid.UUID:
        return self.id


@dataclass
class TokenResponseDTO:
    access_token: str
    token_type: str = "bearer"
    usuario: Optional[UsuarioOutputDTO] = None
