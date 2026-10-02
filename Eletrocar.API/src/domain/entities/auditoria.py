"""
Entidade: LogAuditoria
Registro imutável para compliance, segurança e auditoria financeira e de estoque.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
import uuid


@dataclass(frozen=True)
class LogAuditoria:
    """Entidade de auditoria imutável (frozen)."""
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID]
    origem: str  # ex: BALCAO, TELEGRAM_BOT, WEBSOCKET, REST_API
    acao: str    # ex: VENDA_FINALIZADA, DESCONTO_APLICADO, OS_TRANSICIONADA, SANGRIA_CAIXA
    detalhes: Dict[str, Any] = field(default_factory=dict)
    ip_address: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
