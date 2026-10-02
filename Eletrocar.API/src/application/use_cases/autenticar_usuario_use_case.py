"""
Caso de Uso: AutenticarUsuarioUseCase
Suporta autenticação via login/senha e troca ultra-rápida de operador no balcão por PIN numérico.
"""
from typing import Protocol
import uuid
from src.domain.repositories.interfaces import UsuarioRepositoryInterface
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException, RegraNegocioException
from src.application.dtos.auth_dtos import LoginInputDTO, TrocaOperadorPinInputDTO, UsuarioOutputDTO


class PasswordHasherProtocol(Protocol):
    def verify(self, password: str, hashed: str) -> bool:
        ...


class AutenticarUsuarioUseCase:
    def __init__(self, usuario_repo: UsuarioRepositoryInterface, password_hasher: PasswordHasherProtocol):
        self.usuario_repo = usuario_repo
        self.password_hasher = password_hasher

    async def login(self, input_dto: LoginInputDTO) -> UsuarioOutputDTO:
        usuario = await self.usuario_repo.buscar_por_email(input_dto.email)
        if not usuario or not usuario.ativo:
            raise CredenciaisInvalidasException("E-mail ou senha inválidos.")

        if not self.password_hasher.verify(input_dto.senha, usuario.senha_hash):
            raise CredenciaisInvalidasException("E-mail ou senha inválidos.")

        return UsuarioOutputDTO(
            id=usuario.id,
            nome=usuario.nome,
            email=usuario.email,
            role=usuario.role.value,
            ativo=usuario.ativo,
            telegram_user_id=usuario.telegram_user_id,
            tem_pin_caixa=bool(usuario.pin_caixa)
        )

    async def trocar_operador_por_pin(self, input_dto: TrocaOperadorPinInputDTO) -> UsuarioOutputDTO:
        usuario = await self.usuario_repo.buscar_por_id(input_dto.usuario_id)
        if not usuario or not usuario.ativo:
            raise CredenciaisInvalidasException("Operador não encontrado ou inativo.")

        if not usuario.verificar_pin(input_dto.pin):
            raise CredenciaisInvalidasException("PIN de operador incorreto.")

        return UsuarioOutputDTO(
            id=usuario.id,
            nome=usuario.nome,
            email=usuario.email,
            role=usuario.role.value,
            ativo=usuario.ativo,
            telegram_user_id=usuario.telegram_user_id,
            tem_pin_caixa=True
        )
