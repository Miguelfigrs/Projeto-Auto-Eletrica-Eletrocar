"""
Adaptadores de segurança: Bcrypt (custo 12), JWT (access + refresh com tipo e jti)
e limitador de tentativas contra força bruta.
"""
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any, Callable, Dict, Iterable, Tuple
import time
import uuid
import bcrypt
import jwt
from src.application.ports.seguranca import PasswordHasher, TokenService, LimitadorTentativas
from src.domain.exceptions.domain_exceptions import (
    CredenciaisInvalidasException,
    LimiteTentativasExcedidoException,
)


class BcryptPasswordHasher(PasswordHasher):
    def __init__(self, custo: int = 12):
        self.custo = custo

    def hash(self, valor: str) -> str:
        return bcrypt.hashpw(valor.encode("utf-8"), bcrypt.gensalt(rounds=self.custo)).decode("utf-8")

    def verify(self, valor: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(valor.encode("utf-8"), hashed.encode("utf-8"))
        except (ValueError, TypeError):
            return False


class JwtTokenService(TokenService):
    def __init__(self, secret_key: str, algoritmo: str = "HS256", access_minutos: int = 30):
        self.secret_key = secret_key
        self.algoritmo = algoritmo
        self.access_minutos = access_minutos

    def criar_access_token(self, usuario_id: uuid.UUID, nome: str, papeis: Iterable[str]) -> str:
        agora = datetime.now(timezone.utc)
        return jwt.encode({
            "sub": str(usuario_id),
            "nome": nome,
            "papeis": sorted(papeis),
            "tipo": "access",
            "iat": agora,
            "exp": agora + timedelta(minutes=self.access_minutos),
        }, self.secret_key, algorithm=self.algoritmo)

    def criar_refresh_token(self, usuario_id: uuid.UUID, sessao_id: uuid.UUID, expira_em: datetime) -> str:
        return jwt.encode({
            "sub": str(usuario_id),
            "jti": str(sessao_id),
            "tipo": "refresh",
            "iat": datetime.now(timezone.utc),
            "exp": expira_em.replace(tzinfo=timezone.utc),
        }, self.secret_key, algorithm=self.algoritmo)

    def decodificar(self, token: str, tipo_esperado: str) -> Dict[str, Any]:
        try:
            dados = jwt.decode(token, self.secret_key, algorithms=[self.algoritmo])
        except jwt.ExpiredSignatureError:
            raise CredenciaisInvalidasException("Sessão expirada. Faça login novamente.")
        except jwt.PyJWTError:
            raise CredenciaisInvalidasException("Token de autenticação inválido.")
        if dados.get("tipo") != tipo_esperado:
            raise CredenciaisInvalidasException("Tipo de token inválido para esta operação.")
        return dados


class LimitadorTentativasMemoria(LimitadorTentativas):
    """
    Bloqueia a chave por N minutos após M falhas consecutivas.
    Em memória do processo (a API roda com um worker por contêiner).
    """

    def __init__(self, maximo_tentativas: int = 5, bloqueio_minutos: int = 15, relogio: Callable[[], float] = time.monotonic):
        self.maximo = maximo_tentativas
        self.bloqueio_segundos = bloqueio_minutos * 60
        self.relogio = relogio
        self._estado: Dict[str, Tuple[int, float]] = {}  # chave -> (falhas, bloqueado_ate)
        self._lock = Lock()

    def verificar(self, chave: str) -> None:
        with self._lock:
            falhas, bloqueado_ate = self._estado.get(chave, (0, 0.0))
            restante = bloqueado_ate - self.relogio()
            if restante > 0:
                raise LimiteTentativasExcedidoException(segundos_restantes=int(restante) + 1)
            if bloqueado_ate and restante <= 0:
                self._estado.pop(chave, None)  # bloqueio expirado: recomeça a contagem

    def registrar_falha(self, chave: str) -> None:
        with self._lock:
            falhas, _ = self._estado.get(chave, (0, 0.0))
            falhas += 1
            bloqueado_ate = self.relogio() + self.bloqueio_segundos if falhas >= self.maximo else 0.0
            self._estado[chave] = (falhas, bloqueado_ate)

    def limpar(self, chave: str) -> None:
        with self._lock:
            self._estado.pop(chave, None)

    def resetar(self) -> None:
        with self._lock:
            self._estado.clear()
