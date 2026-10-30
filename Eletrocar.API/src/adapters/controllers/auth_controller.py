"""
Controlador de Autenticação e Sessão (Módulo 0).
Login por e-mail ou usuário, refresh token rotativo (cookie HTTP-Only), logout
e troca rápida de operador por PIN no terminal já autenticado (Lock Screen).
"""
from typing import Optional
import uuid
from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, model_validator
from src.infra.config import settings
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException
from src.application.dtos.auth_dtos import LoginInputDTO, TrocaOperadorPinInputDTO, SessaoTokensDTO, UsuarioOutputDTO
from src.application.use_cases.autenticar_usuario_use_case import AutenticarUsuarioUseCase
from src.application.use_cases.gerenciar_sessao_use_case import GerenciarSessaoUseCase
from src.adapters.controllers.dependencies import get_current_user
from src.adapters.controllers.fabricas import autenticar_uc, sessao_uc

router = APIRouter(prefix="/auth", tags=["Autenticação"])

COOKIE_REFRESH = "eletrocar_refresh"


class LoginRequest(BaseModel):
    """Aceita 'identificador', 'email' ou 'username' (e-mail ou nome de usuário) e 'senha' ou 'password'."""
    identificador: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    senha: Optional[str] = None
    password: Optional[str] = None

    @model_validator(mode="after")
    def _exigir_campos(self):
        if not (self.identificador or self.email or self.username) or not (self.senha or self.password):
            raise ValueError("Informe o usuário/e-mail e a senha.")
        return self

    def para_dto(self) -> LoginInputDTO:
        return LoginInputDTO(
            identificador=(self.identificador or self.email or self.username or "").strip(),
            senha=self.senha or self.password or "",
        )


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


class PinSwitchRequest(BaseModel):
    usuario_id: uuid.UUID
    pin: str = Field(min_length=4, max_length=6)


def _responder_sessao(response: Response, tokens: SessaoTokensDTO) -> SessaoTokensDTO:
    response.set_cookie(
        COOKIE_REFRESH, tokens.refresh_token, httponly=True, secure=settings.REFRESH_COOKIE_SECURE,
        samesite="strict", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, path=f"{settings.API_V1_PREFIX}/auth",
    )
    response.headers["Cache-Control"] = "no-store"
    return tokens


@router.post("/login", response_model=SessaoTokensDTO)
async def login(
    body: LoginRequest,
    response: Response,
    autenticar: AutenticarUsuarioUseCase = Depends(autenticar_uc),
    sessao: GerenciarSessaoUseCase = Depends(sessao_uc),
):
    usuario = await autenticar.login(body.para_dto())
    return _responder_sessao(response, await sessao.iniciar(usuario.id))


@router.post("/token", response_model=SessaoTokensDTO, summary="Login OAuth2 (formulário) para o Swagger")
async def login_oauth2(
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    autenticar: AutenticarUsuarioUseCase = Depends(autenticar_uc),
    sessao: GerenciarSessaoUseCase = Depends(sessao_uc),
):
    usuario = await autenticar.login(LoginInputDTO(identificador=form.username, senha=form.password))
    return _responder_sessao(response, await sessao.iniciar(usuario.id))


@router.post("/refresh", response_model=SessaoTokensDTO)
async def renovar_sessao(
    response: Response,
    body: Optional[RefreshRequest] = None,
    cookie_refresh: Optional[str] = Cookie(default=None, alias=COOKIE_REFRESH),
    sessao: GerenciarSessaoUseCase = Depends(sessao_uc),
):
    token = (body.refresh_token if body and body.refresh_token else None) or cookie_refresh
    if not token:
        raise CredenciaisInvalidasException("Refresh token não informado.")
    return _responder_sessao(response, await sessao.renovar(token))


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    body: Optional[RefreshRequest] = None,
    cookie_refresh: Optional[str] = Cookie(default=None, alias=COOKIE_REFRESH),
    sessao: GerenciarSessaoUseCase = Depends(sessao_uc),
):
    token = (body.refresh_token if body and body.refresh_token else None) or cookie_refresh
    if token:
        await sessao.encerrar(token)
    response.delete_cookie(COOKIE_REFRESH, path=f"{settings.API_V1_PREFIX}/auth")
    response.status_code = 204
    return response


@router.post("/pin-switch", response_model=SessaoTokensDTO, summary="Troca rápida de operador (terminal autenticado)")
async def trocar_operador_pin(
    body: PinSwitchRequest,
    response: Response,
    _terminal: Usuario = Depends(get_current_user),
    autenticar: AutenticarUsuarioUseCase = Depends(autenticar_uc),
    sessao: GerenciarSessaoUseCase = Depends(sessao_uc),
):
    usuario = await autenticar.trocar_operador_por_pin(TrocaOperadorPinInputDTO(usuario_id=body.usuario_id, pin=body.pin))
    return _responder_sessao(response, await sessao.iniciar(usuario.id))


@router.get("/me", response_model=UsuarioOutputDTO)
async def obter_usuario_logado(usuario: Usuario = Depends(get_current_user)):
    return UsuarioOutputDTO.de(usuario)
