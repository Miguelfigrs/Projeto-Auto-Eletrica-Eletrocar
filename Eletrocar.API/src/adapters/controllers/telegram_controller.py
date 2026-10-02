"""
Controlador de Webhook do Telegram Voice Bot.
Recebe comandos e transcrições de áudio do chão de oficina e dispara abertura instantânea de OS.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Dict, Any
from src.infra.config import settings
from src.infra.database.session import get_db_session
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.adapters.repositories.cliente_repository_sqlalchemy import ClienteRepositorySQLAlchemy
from src.adapters.repositories.ordem_servico_repository_sqlalchemy import OrdemServicoRepositorySQLAlchemy
from src.adapters.repositories.auditoria_repository_sqlalchemy import AuditoriaRepositorySQLAlchemy
from src.application.use_cases.criar_os_voz_use_case import CriarOSPorVozTelegramUseCase
from src.application.dtos.os_dtos import CriarOSVozInputDTO, OrdemServicoOutputDTO
from src.adapters.controllers.ws_controller import manager

router = APIRouter(prefix="/telegram", tags=["Telegram Voice Bot"])


class TelegramVoiceWebhookPayload(BaseModel):
    telegram_user_id: str
    nome_cliente: str
    carro_modelo: str
    carro_marca: Optional[str] = "Geral"
    carro_placa: Optional[str] = None
    carro_ano: Optional[str] = None
    sintomas_relatados: str = ""
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = {}
    telefone_cliente: Optional[str] = None


@router.post("/webhook")
async def processar_webhook_telegram(
    payload: TelegramVoiceWebhookPayload,
    session: AsyncSession = Depends(get_db_session)
):
    use_case = CriarOSPorVozTelegramUseCase(
        usuario_repo=UsuarioRepositorySQLAlchemy(session),
        cliente_repo=ClienteRepositorySQLAlchemy(session),
        os_repo=OrdemServicoRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )

    os_criada = await use_case.executar(CriarOSVozInputDTO(
        telegram_user_id=payload.telegram_user_id,
        nome_cliente=payload.nome_cliente,
        carro_modelo=payload.carro_modelo,
        carro_marca=payload.carro_marca or "Geral",
        carro_placa=payload.carro_placa,
        carro_ano=payload.carro_ano,
        sintomas_relatados=payload.sintomas_relatados,
        hipotese_diagnostica=payload.hipotese_diagnostica,
        checklist_eletrico=payload.checklist_eletrico,
        telefone_cliente=payload.telefone_cliente
    ))

    # Notifica em tempo real a tela do balcão/oficina via WebSocket
    await manager.broadcast("OS_CRIADA_VOZ", {
        "numero_os": os_criada.numero_os,
        "cliente": os_criada.nome_cliente,
        "carro": os_criada.descricao_carro,
        "sintomas": os_criada.sintomas,
        "status": os_criada.status
    })

    # Resposta formatada para o Bot do Telegram renderizar como Card
    return {
        "ok": True,
        "mensagem": f"Ordem de Serviço #{os_criada.numero_os} aberta com sucesso via comando de voz!",
        "card_telegram": {
            "titulo": f"🛠️ Nova OS Aberta: {os_criada.numero_os}",
            "cliente": os_criada.nome_cliente,
            "veiculo": os_criada.descricao_carro,
            "sintomas": os_criada.sintomas,
            "status": "Triagem (Aguardando Orçamento / Diagnóstico)",
            "acoes_botoes": [
                {"texto": "✅ Confirmar", "callback_data": f"confirm_{os_criada.id}"},
                {"texto": "✏️ Adicionar Peça", "callback_data": f"add_part_{os_criada.id}"},
                {"texto": "📋 Ver no Balcão", "url": f"https://eletrocar.local/os/{os_criada.id}"}
            ]
        },
        "os": os_criada
    }
