"""
Portas de segurança da camada de Aplicação.
Implementadas na infraestrutura (Bcrypt, JWT, limitador em memória) e substituíveis por fakes nos testes.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, Iterable
import uuid


class PasswordHasher(ABC):
    @abstractmethod
    def hash(self, valor: str) -> str:
        pass

    @abstractmethod
    def verify(self, valor: str, hashed: str) -> bool:
        pass


class TokenService(ABC):
    @abstractmethod
    def criar_access_token(self, usuario_id: uuid.UUID, nome: str, papeis: Iterable[str]) -> str:
        pass

    @abstractmethod
    def criar_refresh_token(self, usuario_id: uuid.UUID, sessao_id: uuid.UUID, expira_em: datetime) -> str:
        pass

    @abstractmethod
    def decodificar(self, token: str, tipo_esperado: str) -> Dict[str, Any]:
        """Valida assinatura/expiração e o tipo ('access' ou 'refresh'). Lança CredenciaisInvalidasException."""


class LimitadorTentativas(ABC):
    """Proteção contra força bruta: bloqueia a chave após N falhas consecutivas."""

    @abstractmethod
    def verificar(self, chave: str) -> None:
        """Lança LimiteTentativasExcedidoException se a chave estiver bloqueada."""

    @abstractmethod
    def registrar_falha(self, chave: str) -> None:
        pass

    @abstractmethod
    def limpar(self, chave: str) -> None:
        pass
