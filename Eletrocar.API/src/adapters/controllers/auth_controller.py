"""
Controlador de Autenticação e Gestão de Sessão.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import uuid
from typing import Optional
from src.infra.database.session import get_db_session
from src.infra.security.security import BcryptPasswordHasher, TokenService
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.application.use_cases.autenticar_usuario_use_case import AutenticarUsuarioUseCase
from src.application.dtos.auth_dtos import LoginInputDTO, TrocaOperadorPinInputDTO
from src.adapters.controllers.dependencies import get_current_user
from src.domain.entities.usuario import Usuario

router = APIRouter(prefix="/auth", tags=["Autenticação"])


class LoginRequest(BaseModel):
    email: str
    senha: str


class PinSwitchRequest(BaseModel):
    usuario_id: str
    pin: str


@router.post("/token")
async def login_oauth(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_db_session)
):
    repo = UsuarioRepositorySQLAlchemy(session)
    hasher = BcryptPasswordHasher()
    use_case = AutenticarUsuarioUseCase(usuario_repo=repo, password_hasher=hasher)

    usuario_dto = await use_case.login(LoginInputDTO(
        email=form_data.username,
        senha=form_data.password
    ))

    token = TokenService.criar_access_token({
        "sub": str(usuario_dto.id),
        "email": usuario_dto.email,
        "role": usuario_dto.role,
        "nome": usuario_dto.nome
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario_dto
    }


@router.post("/login")
async def login_json(
    body: LoginRequest,
    session: AsyncSession = Depends(get_db_session)
):
    repo = UsuarioRepositorySQLAlchemy(session)
    hasher = BcryptPasswordHasher()
    use_case = AutenticarUsuarioUseCase(usuario_repo=repo, password_hasher=hasher)

    usuario_dto = await use_case.login(LoginInputDTO(
        email=body.email,
        senha=body.senha
    ))

    token = TokenService.criar_access_token({
        "sub": str(usuario_dto.id),
        "email": usuario_dto.email,
        "role": usuario_dto.role,
        "nome": usuario_dto.nome
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario_dto
    }


@router.post("/pin-switch")
async def trocar_operador_pin(
    body: PinSwitchRequest,
    session: AsyncSession = Depends(get_db_session)
):
    repo = UsuarioRepositorySQLAlchemy(session)
    hasher = BcryptPasswordHasher()
    use_case = AutenticarUsuarioUseCase(usuario_repo=repo, password_hasher=hasher)

    usuario_dto = await use_case.trocar_operador_por_pin(TrocaOperadorPinInputDTO(
        usuario_id=uuid.UUID(body.usuario_id),
        pin=body.pin
    ))

    token = TokenService.criar_access_token({
        "sub": str(usuario_dto.id),
        "email": usuario_dto.email,
        "role": usuario_dto.role,
        "nome": usuario_dto.nome
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": usuario_dto
    }


@router.get("/me")
async def obter_usuario_logado(usuario: Usuario = Depends(get_current_user)):
    return {
        "id": str(usuario.id),
        "nome": usuario.nome,
        "email": usuario.email,
        "role": usuario.role.value,
        "telegram_user_id": usuario.telegram_user_id,
        "tem_pin_caixa": bool(usuario.pin_caixa)
    }
