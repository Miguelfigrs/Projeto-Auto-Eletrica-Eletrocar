"""
Gateway: Telegram Bot API (download de áudio, envio de card com botões inline e resposta de callbacks).
"""
import logging
from typing import List, Optional
import httpx
from src.domain.gateways.interfaces import TelegramBotGateway, BotaoInline
from src.domain.exceptions.domain_exceptions import IntegracaoExternaException

API_TELEGRAM = "https://api.telegram.org"
logger = logging.getLogger("eletrocar.telegram")


class TelegramBotHttpGateway(TelegramBotGateway):
    def __init__(self, token: str, timeout: float = 10.0, transport: httpx.AsyncBaseTransport = None):
        self.token = token
        self.timeout = timeout
        self.transport = transport

    def _cliente(self) -> httpx.AsyncClient:
        if not self.token:
            raise IntegracaoExternaException("TELEGRAM_BOT_TOKEN não configurado.")
        return httpx.AsyncClient(timeout=self.timeout, transport=self.transport)

    async def baixar_arquivo(self, file_id: str) -> bytes:
        try:
            async with self._cliente() as cliente:
                info = await cliente.get(f"{API_TELEGRAM}/bot{self.token}/getFile", params={"file_id": file_id})
                info.raise_for_status()
                caminho = info.json()["result"]["file_path"]
                arquivo = await cliente.get(f"{API_TELEGRAM}/file/bot{self.token}/{caminho}")
                arquivo.raise_for_status()
                return arquivo.content
        except (httpx.HTTPError, KeyError) as exc:
            raise IntegracaoExternaException("Falha ao baixar o áudio do Telegram.") from exc

    async def enviar_mensagem(self, chat_id: int, texto: str, botoes: Optional[List[BotaoInline]] = None) -> None:
        corpo = {"chat_id": chat_id, "text": texto}
        if botoes:
            corpo["reply_markup"] = {"inline_keyboard": [[self._botao(b) for b in botoes]]}
        await self._post("sendMessage", corpo)

    async def responder_callback(self, callback_query_id: str, texto: str) -> None:
        await self._post("answerCallbackQuery", {"callback_query_id": callback_query_id, "text": texto[:200]})

    async def _post(self, metodo: str, corpo: dict) -> None:
        try:
            async with self._cliente() as cliente:
                resposta = await cliente.post(f"{API_TELEGRAM}/bot{self.token}/{metodo}", json=corpo)
                resposta.raise_for_status()
        except httpx.HTTPError as exc:
            raise IntegracaoExternaException(f"Falha ao chamar o Telegram ({metodo}).") from exc

    @staticmethod
    def _botao(botao: BotaoInline) -> dict:
        dados = {"text": botao.texto}
        if botao.url:
            dados["url"] = botao.url
        else:
            dados["callback_data"] = botao.callback_data
        return dados


class TelegramConsoleGateway(TelegramBotGateway):
    """
    Modo de desenvolvimento sem bot configurado (TELEGRAM_BOT_TOKEN vazio): as mensagens que seriam
    enviadas ao Telegram são registradas no log da API. Nunca é usado em produção.
    """

    async def baixar_arquivo(self, file_id: str) -> bytes:
        raise IntegracaoExternaException("TELEGRAM_BOT_TOKEN não configurado: não é possível baixar o áudio.")

    async def enviar_mensagem(self, chat_id: int, texto: str, botoes: Optional[List[BotaoInline]] = None) -> None:
        logger.info("[Telegram simulado] chat %s: %s | botões: %s", chat_id, texto, [b.texto for b in botoes or []])

    async def responder_callback(self, callback_query_id: str, texto: str) -> None:
        logger.info("[Telegram simulado] callback %s: %s", callback_query_id, texto)
