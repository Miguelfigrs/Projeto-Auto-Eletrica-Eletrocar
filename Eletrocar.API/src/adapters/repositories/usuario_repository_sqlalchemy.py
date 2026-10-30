"""
Implementação SQLAlchemy dos repositórios de Usuário (RBAC N:N) e Sessões de refresh token.
"""
from datetime import datetime
from typing import List, Optional
import uuid
from sqlalchemy import select, or_, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.usuario import Usuario
from src.domain.entities.sessao import SessaoRefresh
from src.domain.repositories.interfaces import UsuarioRepositoryInterface, SessaoRepositoryInterface
from src.infra.database.models import UsuarioModel, UsuarioPapelModel, SessaoRefreshModel
from src.infra.database.papeis import PAPEIS_CATALOGO, PAPEL_POR_ID


class UsuarioRepositorySQLAlchemy(UsuarioRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, usuario: Usuario) -> Usuario:
        model = await self.session.get(UsuarioModel, usuario.id)
        if not model:
            model = UsuarioModel(id=usuario.id, papeis=[])
            self.session.add(model)

        model.nome = usuario.nome
        model.email = usuario.email
        model.username = usuario.username
        model.senha_hash = usuario.senha_hash
        model.pin_hash = usuario.pin_hash
        model.telegram_user_id = usuario.telegram_user_id
        model.ativo = usuario.ativo
        model.created_at = usuario.created_at

        ids_desejados = {PAPEIS_CATALOGO[p][0] for p in usuario.papeis}
        model.papeis = [up for up in model.papeis if up.papel_id in ids_desejados]
        atuais = {up.papel_id for up in model.papeis}
        for papel_id in sorted(ids_desejados - atuais):
            model.papeis.append(UsuarioPapelModel(usuario_id=usuario.id, papel_id=papel_id))

        await self.session.flush()
        return usuario

    async def buscar_por_id(self, usuario_id: uuid.UUID) -> Optional[Usuario]:
        model = await self.session.get(UsuarioModel, usuario_id)
        return self._to_entity(model) if model else None

    async def buscar_por_email(self, email: str) -> Optional[Usuario]:
        return await self._um(select(UsuarioModel).where(UsuarioModel.email == email.strip().lower()))

    async def buscar_por_login(self, identificador: str) -> Optional[Usuario]:
        ident = identificador.strip().lower()
        return await self._um(select(UsuarioModel).where(or_(UsuarioModel.email == ident, UsuarioModel.username == ident)))

    async def buscar_por_telegram_id(self, telegram_id: str) -> Optional[Usuario]:
        return await self._um(select(UsuarioModel).where(UsuarioModel.telegram_user_id == str(telegram_id).strip()))

    async def listar_todos(self) -> List[Usuario]:
        res = await self.session.execute(select(UsuarioModel).order_by(UsuarioModel.nome))
        return [self._to_entity(m) for m in res.scalars().all()]

    async def contar(self) -> int:
        return (await self.session.execute(select(func.count(UsuarioModel.id)))).scalar_one()

    async def _um(self, stmt) -> Optional[Usuario]:
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model else None

    @staticmethod
    def _to_entity(m: UsuarioModel) -> Usuario:
        return Usuario(
            id=m.id,
            nome=m.nome,
            email=m.email,
            username=m.username,
            senha_hash=m.senha_hash,
            papeis={PAPEL_POR_ID[up.papel_id] for up in m.papeis},
            pin_hash=m.pin_hash,
            telegram_user_id=m.telegram_user_id,
            ativo=m.ativo,
            created_at=m.created_at
        )


class SessaoRepositorySQLAlchemy(SessaoRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, sessao: SessaoRefresh) -> SessaoRefresh:
        model = await self.session.get(SessaoRefreshModel, sessao.id)
        if not model:
            model = SessaoRefreshModel(id=sessao.id)
            self.session.add(model)
        model.usuario_id = sessao.usuario_id
        model.criada_em = sessao.criada_em
        model.expira_em = sessao.expira_em
        model.revogada_em = sessao.revogada_em
        model.substituida_por = sessao.substituida_por
        await self.session.flush()
        return sessao

    async def buscar_por_id(self, sessao_id: uuid.UUID) -> Optional[SessaoRefresh]:
        m = await self.session.get(SessaoRefreshModel, sessao_id)
        if not m:
            return None
        return SessaoRefresh(
            id=m.id, usuario_id=m.usuario_id, criada_em=m.criada_em, expira_em=m.expira_em,
            revogada_em=m.revogada_em, substituida_por=m.substituida_por
        )

    async def revogar_todas_do_usuario(self, usuario_id: uuid.UUID, agora: datetime) -> None:
        # Medida de segurança (reuso de refresh token): grava em transação própria para que a revogação
        # persista mesmo quando a requisição atual termina em erro e sofre rollback.
        async with AsyncSession(bind=self.session.bind) as sessao_independente:
            await sessao_independente.execute(
                update(SessaoRefreshModel)
                .where(SessaoRefreshModel.usuario_id == usuario_id, SessaoRefreshModel.revogada_em.is_(None))
                .values(revogada_em=agora)
            )
            await sessao_independente.commit()
