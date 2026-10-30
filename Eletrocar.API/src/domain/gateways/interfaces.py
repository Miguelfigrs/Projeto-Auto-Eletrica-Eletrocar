"""
Interfaces de Gateways externos (Domain Layer).
Telegram, ASR (Whisper), extrator LLM e provedor PIX são acessados apenas através destas portas (DIP).
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional
from src.domain.value_objects.dados_os_extraidos import DadosOSExtraidos


@dataclass(frozen=True)
class BotaoInline:
    texto: str
    callback_data: Optional[str] = None
    url: Optional[str] = None


@dataclass(frozen=True)
class CobrancaPixGerada:
    copia_e_cola: str


class TranscricaoAudioGateway(ABC):
    @abstractmethod
    async def transcrever(self, audio: bytes, nome_arquivo: str) -> str:
        """Transcreve áudio em PT-BR (Whisper ASR)."""


class ExtratorDadosOSGateway(ABC):
    @abstractmethod
    async def extrair(self, transcricao: str) -> DadosOSExtraidos:
        """Extrai o JSON estruturado da OS a partir do texto transcrito (LLM)."""


class TelegramBotGateway(ABC):
    @abstractmethod
    async def baixar_arquivo(self, file_id: str) -> bytes:
        pass

    @abstractmethod
    async def enviar_mensagem(self, chat_id: int, texto: str, botoes: Optional[List[BotaoInline]] = None) -> None:
        pass

    @abstractmethod
    async def responder_callback(self, callback_query_id: str, texto: str) -> None:
        pass


class PixGateway(ABC):
    @abstractmethod
    async def criar_cobranca(self, txid: str, valor: Decimal, descricao: str, expiracao_segundos: int) -> CobrancaPixGerada:
        pass
