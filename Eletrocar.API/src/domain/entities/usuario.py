"""
Entidade: Usuario
Representa os operadores do sistema (Administrador, Balconista, Eletricista).
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid
from src.domain.value_objects.enums import Role
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass
class Usuario:
    id: uuid.UUID
    nome: str
    email: str
    senha_hash: str
    role: Role
    pin_caixa: Optional[str] = None  # PIN numérico rápido de 4 a 6 dígitos para troca rápida de operador
    telegram_user_id: Optional[str] = None  # ID único do Telegram para autorização no Bot de voz
    ativo: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if not self.nome or not self.nome.strip():
            raise RegraNegocioException("Nome do usuário é obrigatório.")
        if not self.email or "@" not in self.email:
            raise RegraNegocioException("E-mail do usuário inválido.")
        if self.pin_caixa and (len(self.pin_caixa) < 4 or not self.pin_caixa.isdigit()):
            raise RegraNegocioException("O PIN de operador deve conter entre 4 e 6 dígitos numéricos.")

    def verificar_pin(self, pin_informado: str) -> bool:
        if not self.pin_caixa:
            return False
        return self.pin_caixa == pin_informado

    def desativar(self):
        self.ativo = False

    def ativar(self):
        self.ativo = True

    def eh_admin(self) -> bool:
        return self.role == Role.ADMIN

    def eh_eletricista(self) -> bool:
        return self.role == Role.ELETRICISTA

    def eh_balcao(self) -> bool:
        return self.role == Role.BALCAO or self.role == Role.ADMIN
