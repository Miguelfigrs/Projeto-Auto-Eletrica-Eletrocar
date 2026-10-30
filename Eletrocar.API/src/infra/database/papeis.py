"""
Catálogo fixo da tabela PAPEIS (RBAC). Os ids são estáveis e referenciados por USUARIOS_PAPEIS.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.value_objects.enums import Papel
from src.infra.database.models import PapelModel

PAPEIS_CATALOGO = {
    Papel.ADMIN: (1, "Administrador / Gestor"),
    Papel.BALCONISTA: (2, "Balconista / Atendente"),
    Papel.ELETRICISTA: (3, "Eletricista / Mecânico"),
}
PAPEL_POR_ID = {pid: papel for papel, (pid, _) in PAPEIS_CATALOGO.items()}


async def garantir_papeis(session: AsyncSession) -> None:
    existentes = set((await session.execute(select(PapelModel.id))).scalars().all())
    for papel, (pid, descricao) in PAPEIS_CATALOGO.items():
        if pid not in existentes:
            session.add(PapelModel(id=pid, codigo=papel.value, descricao=descricao))
    await session.flush()
