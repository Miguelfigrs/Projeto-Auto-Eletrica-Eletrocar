"""
Gateway: transcrição de áudio PT-BR via Whisper ASR (endpoint compatível com /v1/audio/transcriptions,
na nuvem ou servidor Whisper self-hosted). O prompt com o vocabulário técnico melhora a precisão
em ambiente ruidoso de oficina.
"""
import httpx
from src.domain.gateways.interfaces import TranscricaoAudioGateway
from src.domain.services.normalizador_termos_eletricos_service import VOCABULARIO_AUTO_ELETRICA
from src.domain.exceptions.domain_exceptions import IntegracaoExternaException


class WhisperTranscricaoGateway(TranscricaoAudioGateway):
    def __init__(self, url: str, api_key: str, modelo: str = "whisper-1", timeout: float = 15.0,
                 transport: httpx.AsyncBaseTransport = None):
        self.url = url
        self.api_key = api_key
        self.modelo = modelo
        self.timeout = timeout
        self.transport = transport

    async def transcrever(self, audio: bytes, nome_arquivo: str) -> str:
        if not self.url:
            raise IntegracaoExternaException("WHISPER_API_URL não configurada.")
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as cliente:
                resposta = await cliente.post(
                    self.url,
                    headers=headers,
                    files={"file": (nome_arquivo, audio, "audio/ogg")},
                    data={
                        "model": self.modelo,
                        "language": "pt",
                        "response_format": "json",
                        "prompt": "Oficina de auto elétrica: " + ", ".join(VOCABULARIO_AUTO_ELETRICA),
                    },
                )
                resposta.raise_for_status()
        except httpx.HTTPError as exc:
            raise IntegracaoExternaException("Falha ao transcrever o áudio (Whisper).") from exc

        texto = (resposta.json().get("text") or "").strip()
        if not texto:
            raise IntegracaoExternaException("Não foi possível entender o áudio. Grave novamente.")
        return texto
