"""
Entidade: LogAuditoria
Registro imutável para compliance, segurança e auditoria financeira e de estoque.
Contém o estado antes/depois da alteração (payload_before / payload_after da especificação).
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
import uuid
from src.domain.value_objects.tempo import agora_utc


@dataclass(frozen=True)
class LogAuditoria:
    """Entidade de auditoria imutável (frozen)."""
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID]
    origem: str  # ex: BALCAO_PDV, TELEGRAM_VOICE_BOT, CAIXA, ESTOQUE
    acao: str    # ex: VENDA_BALCAO_FINALIZADA, DESCONTO_APLICADO, PRECO_ALTERADO
    detalhes: Dict[str, Any] = field(default_factory=dict)
    payload_antes: Optional[Dict[str, Any]] = None
    payload_depois: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    timestamp: datetime = field(default_factory=agora_utc)


def novo_log(
    usuario_id: Optional[uuid.UUID],
    origem: str,
    acao: str,
    detalhes: Optional[Dict[str, Any]] = None,
    antes: Optional[Dict[str, Any]] = None,
    depois: Optional[Dict[str, Any]] = None,
) -> LogAuditoria:
    return LogAuditoria(
        id=uuid.uuid4(),
        usuario_id=usuario_id,
        origem=origem,
        acao=acao,
        detalhes=detalhes or {},
        payload_antes=antes,
        payload_depois=depois,
    )
