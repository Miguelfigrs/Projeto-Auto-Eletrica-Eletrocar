"""
Entidade: Usuario (Aggregate Root)
Operadores do sistema com RBAC multi-papel: o dono pode acumular Administrador, Balconista e Eletricista.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable, Optional, Set
import re
import uuid
from src.domain.value_objects.enums import Papel
from src.domain.value_objects.tempo import agora_utc
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass
class Usuario:
    id: uuid.UUID
    nome: str
    email: str
    senha_hash: str
    papeis: Set[Papel] = field(default_factory=set)
    username: Optional[str] = None
    pin_hash: Optional[str] = None  # PIN de troca rápida de operador (armazenado apenas como hash)
    telegram_user_id: Optional[str] = None  # Whitelist do Telegram Voice Bot
    ativo: bool = True
    created_at: datetime = field(default_factory=agora_utc)

    def __post_init__(self):
        if not self.nome or not self.nome.strip():
            raise RegraNegocioException("Nome do usuário é obrigatório.")
        self.email = (self.email or "").strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", self.email):
            raise RegraNegocioException("E-mail do usuário inválido.")
        if self.username is not None:
            self.username = self.username.strip().lower() or None
        if self.username and not re.fullmatch(r"[a-z0-9._-]{3,50}", self.username):
            raise RegraNegocioException(
                "Usuário de login deve ter de 3 a 50 caracteres (letras, números, ponto, hífen ou sublinhado)."
            )
        self.papeis = {Papel(p) for p in self.papeis}
        if not self.papeis:
            raise RegraNegocioException("O usuário deve possuir ao menos um papel de acesso.")

    def possui_papel(self, papel: Papel) -> bool:
        return papel in self.papeis

    def possui_algum_papel(self, *papeis: Papel) -> bool:
        """Administrador possui acesso total; os demais precisam de ao menos um dos papéis exigidos."""
        return self.eh_admin() or any(p in self.papeis for p in papeis)

    def adicionar_papel(self, papel: Papel):
        self.papeis.add(Papel(papel))

    def remover_papel(self, papel: Papel):
        if self.papeis == {papel}:
            raise RegraNegocioException("Não é possível remover o último papel do usuário.")
        self.papeis.discard(papel)

    def definir_papeis(self, papeis: Iterable[Papel]):
        novos = {Papel(p) for p in papeis}
        if not novos:
            raise RegraNegocioException("O usuário deve possuir ao menos um papel de acesso.")
        self.papeis = novos

    def eh_admin(self) -> bool:
        return Papel.ADMIN in self.papeis

    def pode_operar_balcao(self) -> bool:
        return self.possui_algum_papel(Papel.BALCONISTA)

    def pode_executar_servico(self) -> bool:
        return self.possui_algum_papel(Papel.ELETRICISTA)

    @property
    def tem_pin(self) -> bool:
        return bool(self.pin_hash)

    def desativar(self):
        self.ativo = False

    def ativar(self):
        self.ativo = True
