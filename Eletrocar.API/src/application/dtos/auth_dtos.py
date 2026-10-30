"""
DTOs para autenticação, sessão e gestão de usuários.
"""
from dataclasses import dataclass, field
from typing import List, Optional
import uuid
from src.domain.entities.usuario import Usuario
from src.application.services.perfil_acesso import definir_perfil_acesso


@dataclass
class LoginInputDTO:
    identificador: str  # e-mail ou nome de usuário
    senha: str


@dataclass
class TrocaOperadorPinInputDTO:
    usuario_id: uuid.UUID
    pin: str


@dataclass
class CriarUsuarioInputDTO:
    nome: str
    email: str
    senha: str
    papeis: List[str]
    username: Optional[str] = None
    pin: Optional[str] = None
    telegram_user_id: Optional[str] = None


@dataclass
class AtualizarUsuarioInputDTO:
    usuario_id: uuid.UUID
    nome: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    telegram_user_id: Optional[str] = None


@dataclass
class UsuarioOutputDTO:
    id: uuid.UUID
    nome: str
    email: str
    papeis: List[str]
    ativo: bool
    username: Optional[str] = None
    telegram_user_id: Optional[str] = None
    tem_pin: bool = False
    tela_inicial: str = ""  # Redirecionamento automático por perfil no PWA
    modulos: List[str] = field(default_factory=list)

    @classmethod
    def de(cls, usuario: Usuario) -> "UsuarioOutputDTO":
        perfil = definir_perfil_acesso(usuario.papeis)
        return cls(
            id=usuario.id,
            nome=usuario.nome,
            email=usuario.email,
            papeis=sorted(p.value for p in usuario.papeis),
            ativo=usuario.ativo,
            username=usuario.username,
            telegram_user_id=usuario.telegram_user_id,
            tem_pin=usuario.tem_pin,
            tela_inicial=perfil.tela_inicial,
            modulos=perfil.modulos,
        )


@dataclass
class SessaoTokensDTO:
    access_token: str
    refresh_token: str
    usuario: UsuarioOutputDTO
    expira_em_segundos: int = 0  # validade do access token (renove com /auth/refresh antes de expirar)
    token_type: str = "bearer"
