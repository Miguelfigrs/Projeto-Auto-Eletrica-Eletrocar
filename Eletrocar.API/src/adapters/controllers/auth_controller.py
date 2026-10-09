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


def _normalizar_email(identificador: str) -> str:
    ident = (identificador or "").strip().lower()
    mapa = {
        "admin": "admin@eletrocar.com.br",
        "administrador": "admin@eletrocar.com.br",
        "marcio": "marcio@eletrocar.com.br",
        "mrcio": "marcio@eletrocar.com.br",
        "roberto": "roberto@eletrocar.com.br",
        "carlos": "carlos.balcao@eletrocar.com.br",
        "juliana": "juliana@eletrocar.com.br"
    }
    return mapa.get(ident, ident)


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    senha: Optional[str] = None
    password: Optional[str] = None

    @property
    def get_email(self) -> str:
        return _normalizar_email(self.email or self.username or "")

    @property
    def get_senha(self) -> str:
        s = (self.senha or self.password or "").strip()
        # Se for admin e digitou 'admin' por costume do pgAdmin, converte para 'admin123'
        if s == "admin" and "admin" in self.get_email:
            return "admin123"
        return s


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

    email = _normalizar_email(form_data.username)
    senha = form_data.password.strip() if form_data.password else ""
    if senha == "admin" and "admin" in email:
        senha = "admin123"

    usuario_dto = await use_case.login(LoginInputDTO(
        email=email,
        senha=senha
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
    email = body.get_email
    senha = body.get_senha

    if not email or not senha:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Informe o e-mail (ou username) e a senha (ou password)."
        )

    repo = UsuarioRepositorySQLAlchemy(session)
    hasher = BcryptPasswordHasher()
    use_case = AutenticarUsuarioUseCase(usuario_repo=repo, password_hasher=hasher)

    usuario_dto = await use_case.login(LoginInputDTO(
        email=email,
        senha=senha
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
