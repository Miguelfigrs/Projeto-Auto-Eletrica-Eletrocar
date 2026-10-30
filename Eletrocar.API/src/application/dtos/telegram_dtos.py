"""
DTOs do Telegram Voice Bot (mensagens de voz e botões inline).
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class AudioTelegramInputDTO:
    telegram_user_id: str
    chat_id: int
    file_id: str
    nome_arquivo: str = "audio.oga"


@dataclass
class CallbackTelegramInputDTO:
    telegram_user_id: str
    chat_id: int
    callback_query_id: str
    dados: str  # ex: "confirmar:<os_id>" ou "editar:<os_id>"


@dataclass
class ResultadoTelegramDTO:
    ok: bool
    mensagem: str
    os_id: Optional[str] = None
