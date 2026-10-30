"""
Fakes de portas de segurança e gateways externos (Telegram, Whisper, LLM, PIX) para testes.
"""
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Tuple
import uuid
from src.application.ports.seguranca import PasswordHasher, TokenService, LimitadorTentativas
from src.domain.gateways.interfaces import (
    TranscricaoAudioGateway,
    ExtratorDadosOSGateway,
    TelegramBotGateway,
    PixGateway,
    BotaoInline,
    CobrancaPixGerada
)
from src.domain.value_objects.dados_os_extraidos import DadosOSExtraidos
from src.domain.exceptions.domain_exceptions import (
    CredenciaisInvalidasException,
    LimiteTentativasExcedidoException
)


class FakePasswordHasher(PasswordHasher):
    def hash(self, valor: str) -> str:
        return f"hashed_{valor}"

    def verify(self, valor: str, hashed: str) -> bool:
        return hashed == f"hashed_{valor}"


class FakeTokenService(TokenService):
    """Tokens legíveis: 'access|<uid>|<papeis>' e 'refresh|<uid>|<sessao>'."""

    def criar_access_token(self, usuario_id: uuid.UUID, nome: str, papeis: Iterable[str]) -> str:
        return f"access|{usuario_id}|{','.join(sorted(papeis))}"

    def criar_refresh_token(self, usuario_id: uuid.UUID, sessao_id: uuid.UUID, expira_em: datetime) -> str:
        return f"refresh|{usuario_id}|{sessao_id}"

    def decodificar(self, token: str, tipo_esperado: str) -> Dict[str, Any]:
        partes = token.split("|")
        if len(partes) != 3 or partes[0] != tipo_esperado:
            raise CredenciaisInvalidasException("Token inválido.")
        dados = {"sub": partes[1], "tipo": partes[0]}
        if tipo_esperado == "refresh":
            dados["jti"] = partes[2]
        else:
            dados["papeis"] = partes[2].split(",")
        return dados


class FakeLimitadorTentativas(LimitadorTentativas):
    def __init__(self, maximo: int = 5):
        self.maximo = maximo
        self.falhas: Dict[str, int] = {}

    def verificar(self, chave: str) -> None:
        if self.falhas.get(chave, 0) >= self.maximo:
            raise LimiteTentativasExcedidoException(segundos_restantes=900)

    def registrar_falha(self, chave: str) -> None:
        self.falhas[chave] = self.falhas.get(chave, 0) + 1

    def limpar(self, chave: str) -> None:
        self.falhas.pop(chave, None)


class FakeTranscricaoGateway(TranscricaoAudioGateway):
    def __init__(self, texto: str = "Gol do seu Carlos, alternado não tá carregando a bateria"):
        self.texto = texto
        self.chamadas: List[Tuple[bytes, str]] = []

    async def transcrever(self, audio: bytes, nome_arquivo: str) -> str:
        self.chamadas.append((audio, nome_arquivo))
        return self.texto


class FakeExtratorGateway(ExtratorDadosOSGateway):
    def __init__(self, dados: Optional[DadosOSExtraidos] = None):
        self.dados = dados or DadosOSExtraidos(
            nome_cliente="Carlos Silva",
            carro_modelo="Gol 1.6",
            carro_marca="Volkswagen",
            sintomas_relatados="Bateria descarregando e luz da bateria acesa no painel",
            hipotese_diagnostica="Possível defeito no alternador",
            servicos_sugeridos=["Diagnóstico de alternador"],
            checklist_eletrico={"alternador": "Apresenta falha de geração"},
        )
        self.textos_recebidos: List[str] = []

    async def extrair(self, transcricao: str) -> DadosOSExtraidos:
        self.textos_recebidos.append(transcricao)
        return self.dados


class FakeTelegramGateway(TelegramBotGateway):
    def __init__(self):
        self.mensagens: List[Tuple[int, str, Optional[List[BotaoInline]]]] = []
        self.callbacks: List[Tuple[str, str]] = []
        self.downloads: List[str] = []

    async def baixar_arquivo(self, file_id: str) -> bytes:
        self.downloads.append(file_id)
        return b"OggS-audio-fake"

    async def enviar_mensagem(self, chat_id: int, texto: str, botoes: Optional[List[BotaoInline]] = None) -> None:
        self.mensagens.append((chat_id, texto, botoes))

    async def responder_callback(self, callback_query_id: str, texto: str) -> None:
        self.callbacks.append((callback_query_id, texto))


class FakePixGateway(PixGateway):
    async def criar_cobranca(self, txid: str, valor: Decimal, descricao: str, expiracao_segundos: int) -> CobrancaPixGerada:
        return CobrancaPixGerada(copia_e_cola=f"00020126PIX{txid}{valor}")
