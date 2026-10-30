"""
Caso de Uso: AutenticarUsuarioUseCase (UC01)
Login por e-mail ou usuário com proteção contra força bruta (máx. 5 tentativas incorretas)
e troca ultra-rápida de operador no balcão por PIN (Lock Screen).
"""
from typing import Optional
from src.domain.entities.auditoria import novo_log
from src.domain.entities.usuario import Usuario
from src.domain.repositories.interfaces import UsuarioRepositoryInterface, AuditoriaRepositoryInterface
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException
from src.application.ports.seguranca import PasswordHasher, LimitadorTentativas
from src.application.dtos.auth_dtos import LoginInputDTO, TrocaOperadorPinInputDTO, UsuarioOutputDTO


class AutenticarUsuarioUseCase:
    def __init__(
        self,
        usuario_repo: UsuarioRepositoryInterface,
        password_hasher: PasswordHasher,
        limitador: LimitadorTentativas,
        audit_repo: Optional[AuditoriaRepositoryInterface] = None,
    ):
        self.usuario_repo = usuario_repo
        self.password_hasher = password_hasher
        self.limitador = limitador
        self.audit_repo = audit_repo

    async def login(self, input_dto: LoginInputDTO) -> UsuarioOutputDTO:
        identificador = (input_dto.identificador or "").strip().lower()
        chave = f"login:{identificador}"
        self.limitador.verificar(chave)

        usuario = await self.usuario_repo.buscar_por_login(identificador) if identificador else None
        senha_ok = bool(usuario) and self.password_hasher.verify(input_dto.senha or "", usuario.senha_hash)
        if not senha_ok or not usuario.ativo:
            self.limitador.registrar_falha(chave)
            raise CredenciaisInvalidasException("Usuário/e-mail ou senha inválidos.")

        self.limitador.limpar(chave)
        await self._auditar(usuario, "LOGIN_REALIZADO")
        return UsuarioOutputDTO.de(usuario)

    async def trocar_operador_por_pin(self, input_dto: TrocaOperadorPinInputDTO) -> UsuarioOutputDTO:
        chave = f"pin:{input_dto.usuario_id}"
        self.limitador.verificar(chave)

        usuario = await self.usuario_repo.buscar_por_id(input_dto.usuario_id)
        pin_ok = (
            usuario is not None
            and usuario.ativo
            and usuario.tem_pin
            and self.password_hasher.verify(input_dto.pin or "", usuario.pin_hash)
        )
        if not pin_ok:
            self.limitador.registrar_falha(chave)
            raise CredenciaisInvalidasException("Operador ou PIN inválido.")

        self.limitador.limpar(chave)
        await self._auditar(usuario, "OPERADOR_TROCADO_POR_PIN")
        return UsuarioOutputDTO.de(usuario)

    async def _auditar(self, usuario: Usuario, acao: str):
        if self.audit_repo:
            await self.audit_repo.registrar(novo_log(
                usuario.id, "AUTENTICACAO", acao,
                detalhes={"papeis": sorted(p.value for p in usuario.papeis)}
            ))

