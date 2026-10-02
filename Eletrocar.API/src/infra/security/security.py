"""
Serviços de segurança: Hashing de senhas com Bcrypt e emissão/validação de Tokens JWT.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
import jwt
from src.infra.config import settings
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException


class BcryptPasswordHasher:
    @staticmethod
    def hash(password: str) -> str:
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify(password: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False


class TokenService:
    @staticmethod
    def criar_access_token(dados: Dict[str, Any], expira_em_minutos: Optional[int] = None) -> str:
        dados_copia = dados.copy()
        minutos = expira_em_minutos or settings.ACCESS_TOKEN_EXPIRE_MINUTES
        expira = datetime.utcnow() + timedelta(minutes=minutos)
        dados_copia.update({"exp": expira})
        token = jwt.encode(dados_copia, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return token

    @staticmethod
    def decodificar_token(token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise CredenciaisInvalidasException("Sessão expirada. Faça login novamente.")
        except jwt.PyJWTError:
            raise CredenciaisInvalidasException("Token de autenticação inválido.")
