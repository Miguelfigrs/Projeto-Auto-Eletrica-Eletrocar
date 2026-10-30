"""
Caso de Uso: ConsultarAuditoriaUseCase
Leitura (somente) dos logs imutáveis de auditoria - exclusivo do Administrador.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from src.domain.repositories.interfaces import AuditoriaRepositoryInterface


@dataclass
class LogAuditoriaOutputDTO:
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID]
    origem: str
    acao: str
    detalhes: Dict[str, Any]
    payload_antes: Optional[Dict[str, Any]]
    payload_depois: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    timestamp: datetime


class ConsultarAuditoriaUseCase:
    def __init__(self, audit_repo: AuditoriaRepositoryInterface):
        self.audit_repo = audit_repo

    async def listar(self, limite: int = 100, acao: Optional[str] = None,
                     usuario_id: Optional[uuid.UUID] = None) -> List[LogAuditoriaOutputDTO]:
        limite = max(1, min(limite, 1000))
        logs = await self.audit_repo.listar_ultimos(limite=limite, acao=acao, usuario_id=usuario_id)
        return [
            LogAuditoriaOutputDTO(
                id=l.id, usuario_id=l.usuario_id, origem=l.origem, acao=l.acao, detalhes=l.detalhes,
                payload_antes=l.payload_antes, payload_depois=l.payload_depois,
                ip_address=l.ip_address, timestamp=l.timestamp,
            )
            for l in logs
        ]
