"""
Caso de Uso: GerenciarUsuariosUseCase (Módulo 0 - Gestão de Usuários)
Criação, edição, papéis (RBAC multi-perfil), ativação/desativação, redefinição de senha e PIN.
Todas as operações geram log de auditoria imutável (sem expor segredos).
"""
from typing import List, Optional
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.entities.auditoria import novo_log
from src.domain.value_objects.enums import Papel
from src.domain.value_objects.pin_operador import PinOperador
from src.domain.repositories.interfaces import UsuarioRepositoryInterface, AuditoriaRepositoryInterface
from src.domain.exceptions.domain_exceptions import RegraNegocioException, EntidadeNaoEncontradaException
from src.application.ports.seguranca import PasswordHasher
from src.application.dtos.auth_dtos import CriarUsuarioInputDTO, AtualizarUsuarioInputDTO, UsuarioOutputDTO

TAMANHO_MINIMO_SENHA = 8
ORIGEM = "GESTAO_USUARIOS"


def _papeis(valores: List[str]) -> List[Papel]:
    try:
        return [Papel(str(v).upper()) for v in valores]
    except ValueError:
        raise RegraNegocioException(f"Papel inválido. Use: {', '.join(p.value for p in Papel)}.")


def _validar_senha(senha: str):
    if not senha or len(senha) < TAMANHO_MINIMO_SENHA:
        raise RegraNegocioException(f"A senha deve ter ao menos {TAMANHO_MINIMO_SENHA} caracteres.")


class GerenciarUsuariosUseCase:
    def __init__(
        self,
        usuario_repo: UsuarioRepositoryInterface,
        password_hasher: PasswordHasher,
        audit_repo: AuditoriaRepositoryInterface
    ):
        self.usuario_repo = usuario_repo
        self.password_hasher = password_hasher
        self.audit_repo = audit_repo

    async def criar(self, dto: CriarUsuarioInputDTO, executor_id: Optional[uuid.UUID]) -> UsuarioOutputDTO:
        _validar_senha(dto.senha)
        pin_hash = self.password_hasher.hash(PinOperador(dto.pin).valor) if dto.pin else None
        usuario = Usuario(
            id=uuid.uuid4(),
            nome=dto.nome,
            email=dto.email,
            username=dto.username,
            senha_hash=self.password_hasher.hash(dto.senha),
            papeis=set(_papeis(dto.papeis)),
            pin_hash=pin_hash,
            telegram_user_id=(dto.telegram_user_id or "").strip() or None,
        )
        await self._validar_unicidade(usuario)
        await self.usuario_repo.salvar(usuario)
        await self._auditar(executor_id, "USUARIO_CRIADO", usuario, depois=self._resumo(usuario))
        return UsuarioOutputDTO.de(usuario)

    async def atualizar(self, dto: AtualizarUsuarioInputDTO, executor_id: uuid.UUID) -> UsuarioOutputDTO:
        usuario = await self._obter(dto.usuario_id)
        antes = self._resumo(usuario)
        dados = {
            "id": usuario.id,
            "nome": dto.nome if dto.nome is not None else usuario.nome,
            "email": dto.email if dto.email is not None else usuario.email,
            "username": dto.username if dto.username is not None else usuario.username,
            "telegram_user_id": (dto.telegram_user_id.strip() or None) if dto.telegram_user_id is not None else usuario.telegram_user_id,
            "senha_hash": usuario.senha_hash,
            "papeis": usuario.papeis,
            "pin_hash": usuario.pin_hash,
            "ativo": usuario.ativo,
            "created_at": usuario.created_at,
        }
        atualizado = Usuario(**dados)  # revalida invariantes
        await self._validar_unicidade(atualizado)
        await self.usuario_repo.salvar(atualizado)
        await self._auditar(executor_id, "USUARIO_ATUALIZADO", atualizado, antes=antes, depois=self._resumo(atualizado))
        return UsuarioOutputDTO.de(atualizado)

    async def definir_papeis(self, usuario_id: uuid.UUID, papeis: List[str], executor_id: uuid.UUID) -> UsuarioOutputDTO:
        usuario = await self._obter(usuario_id)
        novos = _papeis(papeis)
        if usuario_id == executor_id and Papel.ADMIN not in novos and usuario.eh_admin():
            raise RegraNegocioException("O administrador não pode remover o próprio papel de ADMIN.")
        antes = {"papeis": sorted(p.value for p in usuario.papeis)}
        usuario.definir_papeis(novos)
        await self.usuario_repo.salvar(usuario)
        await self._auditar(executor_id, "USUARIO_PAPEIS_ALTERADOS", usuario, antes=antes,
                            depois={"papeis": sorted(p.value for p in usuario.papeis)})
        return UsuarioOutputDTO.de(usuario)

    async def alterar_status(self, usuario_id: uuid.UUID, ativo: bool, executor_id: uuid.UUID) -> UsuarioOutputDTO:
        if usuario_id == executor_id and not ativo:
            raise RegraNegocioException("O usuário não pode desativar a própria conta.")
        usuario = await self._obter(usuario_id)
        antes = {"ativo": usuario.ativo}
        usuario.ativar() if ativo else usuario.desativar()
        await self.usuario_repo.salvar(usuario)
        await self._auditar(executor_id, "USUARIO_ATIVADO" if ativo else "USUARIO_DESATIVADO", usuario,
                            antes=antes, depois={"ativo": usuario.ativo})
        return UsuarioOutputDTO.de(usuario)

    async def redefinir_senha(self, usuario_id: uuid.UUID, nova_senha: str, executor_id: uuid.UUID) -> None:
        _validar_senha(nova_senha)
        usuario = await self._obter(usuario_id)
        usuario.senha_hash = self.password_hasher.hash(nova_senha)
        await self.usuario_repo.salvar(usuario)
        await self._auditar(executor_id, "USUARIO_SENHA_REDEFINIDA", usuario)

    async def definir_pin(self, usuario_id: uuid.UUID, pin: str, executor_id: uuid.UUID) -> None:
        usuario = await self._obter(usuario_id)
        usuario.pin_hash = self.password_hasher.hash(PinOperador(pin).valor)
        await self.usuario_repo.salvar(usuario)
        await self._auditar(executor_id, "USUARIO_PIN_DEFINIDO", usuario)

    async def listar(self) -> List[UsuarioOutputDTO]:
        usuarios = await self.usuario_repo.listar_todos()
        return [UsuarioOutputDTO.de(u) for u in sorted(usuarios, key=lambda u: u.nome.lower())]

    async def _obter(self, usuario_id: uuid.UUID) -> Usuario:
        usuario = await self.usuario_repo.buscar_por_id(usuario_id)
        if not usuario:
            raise EntidadeNaoEncontradaException("Usuário não encontrado.")
        return usuario

    async def _validar_unicidade(self, usuario: Usuario):
        por_email = await self.usuario_repo.buscar_por_email(usuario.email)
        if por_email and por_email.id != usuario.id:
            raise RegraNegocioException(f"Já existe um usuário com o e-mail '{usuario.email}'.")
        if usuario.username:
            por_login = await self.usuario_repo.buscar_por_login(usuario.username)
            if por_login and por_login.id != usuario.id:
                raise RegraNegocioException(f"O usuário de login '{usuario.username}' já está em uso.")
        if usuario.telegram_user_id:
            por_telegram = await self.usuario_repo.buscar_por_telegram_id(usuario.telegram_user_id)
            if por_telegram and por_telegram.id != usuario.id:
                raise RegraNegocioException("Este Telegram já está vinculado a outro colaborador.")

    @staticmethod
    def _resumo(usuario: Usuario) -> dict:
        return {
            "nome": usuario.nome,
            "email": usuario.email,
            "username": usuario.username,
            "telegram_user_id": usuario.telegram_user_id,
            "papeis": sorted(p.value for p in usuario.papeis),
            "ativo": usuario.ativo,
        }

    async def _auditar(self, executor_id, acao: str, usuario: Usuario, antes=None, depois=None):
        await self.audit_repo.registrar(novo_log(
            executor_id, ORIGEM, acao, detalhes={"usuario_alvo_id": str(usuario.id)}, antes=antes, depois=depois
        ))
