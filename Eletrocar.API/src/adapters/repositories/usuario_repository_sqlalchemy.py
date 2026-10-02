"""
Implementação SQLAlchemy do UsuarioRepositoryInterface.
"""
from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Role
from src.domain.repositories.interfaces import UsuarioRepositoryInterface
from src.infra.database.models import UsuarioModel


class UsuarioRepositorySQLAlchemy(UsuarioRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, usuario: Usuario) -> Usuario:
        model = await self.session.get(UsuarioModel, str(usuario.id))
        if not model:
            model = UsuarioModel(id=str(usuario.id))
            self.session.add(model)

        model.nome = usuario.nome
        model.email = usuario.email
        model.senha_hash = usuario.senha_hash
        model.role = usuario.role.value
        model.pin_caixa = usuario.pin_caixa
        model.telegram_user_id = usuario.telegram_user_id
        model.ativo = usuario.ativo
        model.created_at = usuario.created_at

        await self.session.flush()
        return usuario

    async def buscar_por_id(self, usuario_id: uuid.UUID) -> Optional[Usuario]:
        model = await self.session.get(UsuarioModel, str(usuario_id))
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_email(self, email: str) -> Optional[Usuario]:
        stmt = select(UsuarioModel).where(UsuarioModel.email == email.strip().lower())
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_telegram_id(self, telegram_id: str) -> Optional[Usuario]:
        stmt = select(UsuarioModel).where(UsuarioModel.telegram_user_id == telegram_id.strip())
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    async def listar_todos(self) -> List[Usuario]:
        stmt = select(UsuarioModel)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_entity(m) for m in models]

    def _to_entity(self, m: UsuarioModel) -> Usuario:
        return Usuario(
            id=uuid.UUID(m.id),
            nome=m.nome,
            email=m.email,
            senha_hash=m.senha_hash,
            role=Role(m.role),
            pin_caixa=m.pin_caixa,
            telegram_user_id=m.telegram_user_id,
            ativo=m.ativo,
            created_at=m.created_at
        )
