"""
Implementação SQLAlchemy do AuditoriaRepositoryInterface (somente inserção e leitura - logs imutáveis).
O IP de origem é obtido do contexto da requisição HTTP quando o caso de uso não o informa.
"""
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.auditoria import LogAuditoria
from src.domain.repositories.interfaces import AuditoriaRepositoryInterface
from src.infra.database.models import LogAuditoriaModel
from src.infra.web.contexto_requisicao import ip_requisicao


class AuditoriaRepositorySQLAlchemy(AuditoriaRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def registrar(self, log: LogAuditoria) -> None:
        self.session.add(LogAuditoriaModel(
            id=log.id,
            usuario_id=log.usuario_id,
            origem=log.origem,
            acao=log.acao,
            detalhes=log.detalhes,
            payload_antes=log.payload_antes,
            payload_depois=log.payload_depois,
            ip_address=log.ip_address or ip_requisicao.get(),
            timestamp=log.timestamp
        ))
        await self.session.flush()

    async def listar_ultimos(self, limite: int = 100, acao: Optional[str] = None,
                             usuario_id: Optional[uuid.UUID] = None) -> List[LogAuditoria]:
        stmt = select(LogAuditoriaModel).order_by(LogAuditoriaModel.timestamp.desc()).limit(limite)
        if acao:
            stmt = stmt.where(LogAuditoriaModel.acao == acao.upper())
        if usuario_id:
            stmt = stmt.where(LogAuditoriaModel.usuario_id == usuario_id)
        return [
            LogAuditoria(
                id=m.id, usuario_id=m.usuario_id, origem=m.origem, acao=m.acao, detalhes=m.detalhes or {},
                payload_antes=m.payload_antes, payload_depois=m.payload_depois,
                ip_address=m.ip_address, timestamp=m.timestamp
            )
            for m in (await self.session.execute(stmt)).scalars().all()
        ]
