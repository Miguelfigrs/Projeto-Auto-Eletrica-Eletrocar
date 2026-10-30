"""
Dependências de autenticação e controle de acesso (RBAC multi-papel) para os controllers FastAPI.
Matriz de acesso conforme a especificação (slide 26): o Administrador possui acesso total;
os demais endpoints exigem ao menos um dos papéis informados.
"""
from functools import lru_cache
from typing import Optional
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from src.infra.config import settings
from src.infra.database.session import get_db_session
from src.infra.security.security import BcryptPasswordHasher, JwtTokenService, LimitadorTentativasMemoria
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


@lru_cache
def get_token_service() -> JwtTokenService:
    return JwtTokenService(settings.SECRET_KEY, settings.ALGORITHM, settings.ACCESS_TOKEN_EXPIRE_MINUTES)


@lru_cache
def get_limitador() -> LimitadorTentativasMemoria:
    return LimitadorTentativasMemoria(settings.MAX_TENTATIVAS_LOGIN, settings.BLOQUEIO_LOGIN_MINUTOS)


@lru_cache
def get_password_hasher() -> BcryptPasswordHasher:
    return BcryptPasswordHasher(settings.BCRYPT_CUSTO)


async def usuario_do_token(token: Optional[str], session: AsyncSession) -> Usuario:
    if not token:
        raise CredenciaisInvalidasException("Autenticação requerida.")
    dados = get_token_service().decodificar(token, "access")
    try:
        usuario_id = uuid.UUID(str(dados.get("sub")))
    except ValueError:
        raise CredenciaisInvalidasException("Token de autenticação inválido.")
    usuario = await UsuarioRepositorySQLAlchemy(session).buscar_por_id(usuario_id)
    if not usuario or not usuario.ativo:
        raise CredenciaisInvalidasException("Usuário inativo ou inexistente.")
    return usuario


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db_session)
) -> Usuario:
    return await usuario_do_token(token, session)


def exigir_papeis(*papeis: Papel):
    """Permite o acesso a quem possui ao menos um dos papéis (ADMIN sempre possui acesso)."""
    async def verificador(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if not usuario.possui_algum_papel(*papeis):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso restrito aos perfis: {', '.join(['ADMIN'] + [p.value for p in papeis])}."
            )
        return usuario
    return verificador


somente_admin = exigir_papeis(Papel.ADMIN)
balcao = exigir_papeis(Papel.BALCONISTA)
oficina = exigir_papeis(Papel.ELETRICISTA)
operacional = exigir_papeis(Papel.BALCONISTA, Papel.ELETRICISTA)
