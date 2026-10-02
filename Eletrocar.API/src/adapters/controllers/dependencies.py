"""
Dependências comuns para injeção nos controladores FastAPI.
"""
from typing import Optional
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from src.infra.database.session import get_db_session
from src.infra.security.security import TokenService
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.domain.entities.usuario import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db_session)
) -> Usuario:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação requerida.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = TokenService.decodificar_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    repo = UsuarioRepositorySQLAlchemy(session)
    usuario = await repo.buscar_por_id(uuid.UUID(user_id_str))
    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo ou inexistente.")

    return usuario


def require_role(roles_permitidas: list):
    async def role_checker(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.role.value not in roles_permitidas and usuario.role.value != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso não autorizado para o perfil do usuário."
            )
        return usuario
    return role_checker
