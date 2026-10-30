"""
Controlador do Webhook do Telegram Voice Bot (UC06).
Recebe o Update oficial da Bot API, valida o segredo do webhook (X-Telegram-Bot-Api-Secret-Token)
e delega o pipeline de voz (Whisper -> LLM -> OS) ao caso de uso.
Erros de negócio respondem 200 ao Telegram (evita reenvio infinito) e a transação é desfeita.
"""
import hmac
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.infra.config import settings
from src.infra.database.session import get_db_session
from src.domain.exceptions.domain_exceptions import DomainException
from src.application.dtos.telegram_dtos import AudioTelegramInputDTO, CallbackTelegramInputDTO
from src.application.use_cases.processar_telegram_use_case import ProcessarMensagemTelegramUseCase
from src.adapters.controllers.fabricas import telegram_uc
from src.adapters.controllers.ws_controller import manager

router = APIRouter(prefix="/telegram", tags=["Telegram Voice Bot"])
logger = logging.getLogger("eletrocar.telegram")


def _validar_segredo(token: Optional[str]):
    if not settings.TELEGRAM_WEBHOOK_SECRET or not token or not hmac.compare_digest(token, settings.TELEGRAM_WEBHOOK_SECRET):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Webhook do Telegram não autorizado.")


@router.post("/webhook")
async def processar_webhook_telegram(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_db_session),
    uc: ProcessarMensagemTelegramUseCase = Depends(telegram_uc),
):
    _validar_segredo(x_telegram_bot_api_secret_token)
    update: Dict[str, Any] = await request.json()

    try:
        callback = update.get("callback_query")
        if callback:
            resultado = await uc.processar_callback(CallbackTelegramInputDTO(
                telegram_user_id=str(callback["from"]["id"]),
                chat_id=callback.get("message", {}).get("chat", {}).get("id", callback["from"]["id"]),
                callback_query_id=str(callback["id"]),
                dados=callback.get("data", ""),
            ))
            return {"ok": True, "acao": "callback", "mensagem": resultado.mensagem}

        mensagem = update.get("message") or {}
        audio = mensagem.get("voice") or mensagem.get("audio")
        if not audio:
            return {"ok": True, "ignorado": "Somente mensagens de voz abrem Ordens de Serviço."}

        os_criada = await uc.processar_audio(AudioTelegramInputDTO(
            telegram_user_id=str(mensagem["from"]["id"]),
            chat_id=mensagem["chat"]["id"],
            file_id=audio["file_id"],
            nome_arquivo=audio.get("file_name") or "audio.oga",
        ))
    except DomainException as exc:
        await session.rollback()
        logger.warning("Mensagem do Telegram não processada: %s", exc.mensagem)
        return {"ok": True, "ignorado": exc.mensagem}
    except (KeyError, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update do Telegram malformado.") from exc

    await manager.broadcast("OS_CRIADA_VOZ", {
        "os_id": str(os_criada.id), "numero_os": os_criada.numero_os, "cliente": os_criada.nome_cliente,
        "carro": os_criada.descricao_carro, "sintomas": os_criada.sintomas, "status": os_criada.status,
        "prioridade": os_criada.prioridade,
    })
    return {"ok": True, "acao": "os_criada", "os": os_criada}
