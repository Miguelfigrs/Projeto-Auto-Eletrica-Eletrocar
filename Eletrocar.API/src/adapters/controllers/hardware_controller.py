"""
Controlador de Hardware: Monitoramento de leitores de código de barras USB/BT e Web Serial.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/hardware", tags=["Hardware & Leitores"])


class HardwareStatusResponse(BaseModel):
    modo_operacao: str
    suporte_webhid: bool
    suporte_webserial: bool
    protocolo_recomendado: str
    intervalo_limite_leitor_ms: int
    data_servidor: datetime


@router.get("/status", response_model=HardwareStatusResponse)
async def status_hardware():
    return HardwareStatusResponse(
        modo_operacao="KEYBOARD_WEDGE_E_WEB_SERIAL",
        suporte_webhid=True,
        suporte_webserial=True,
        protocolo_recomendado="BUFFER_TEMPORAL_GLOBAL",
        intervalo_limite_leitor_ms=30,  # Leitor emite chars com intervalo < 30ms; digitação humana > 80ms
        data_servidor=datetime.utcnow()
    )
