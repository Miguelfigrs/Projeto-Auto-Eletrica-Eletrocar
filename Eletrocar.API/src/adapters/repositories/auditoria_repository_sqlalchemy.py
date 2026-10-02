"""
Implementação SQLAlchemy do AuditoriaRepositoryInterface.
"""
from typing import List
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.domain.entities.auditoria import LogAuditoria
from src.domain.repositories.interfaces import AuditoriaRepositoryInterface
from src.infra.database.models import LogAuditoriaModel


class AuditoriaRepositorySQLAlchemy(AuditoriaRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def registrar(self, log: LogAuditoria) -> None:
        model = LogAuditoriaModel(
            id=str(log.id),
            usuario_id=str(log.usuario_id) if log.usuario_id else None,
            origem=log.origem,
            acao=log.acao,
            detalhes=log.detalhes,
            ip_address=log.ip_address,
            timestamp=log.timestamp
        )
        self.session.add(model)
        await self.session.flush()

    async def listar_ultimos(self, limite: int = 100) -> List[LogAuditoria]:
        stmt = select(LogAuditoriaModel).order_by(LogAuditoriaModel.timestamp.desc()).limit(limite)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            LogAuditoria(
                id=uuid.UUID(m.id),
                usuario_id=uuid.UUID(m.usuario_id) if m.usuario_id else None,
                origem=m.origem,
                acao=m.acao,
                detalhes=m.detalhes or {},
                ip_address=m.ip_address,
                timestamp=m.timestamp
            )
            for m in models
        ]
