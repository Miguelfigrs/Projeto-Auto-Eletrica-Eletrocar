"""
Testes dos adaptadores de gateways externos (Telegram, Whisper, extrator LLM, PIX BR Code, PDF térmico).
As chamadas HTTP são interceptadas com httpx.MockTransport e o cliente da IA é substituído por um dublê.
"""
import json
from decimal import Decimal
from types import SimpleNamespace
import httpx
import pytest
from src.domain.gateways.interfaces import BotaoInline
from src.domain.exceptions.domain_exceptions import IntegracaoExternaException, RegraNegocioException
from src.domain.value_objects.enums import PrioridadeOS
from src.adapters.gateways.telegram_gateway import TelegramBotHttpGateway
from src.adapters.gateways.whisper_gateway import WhisperTranscricaoGateway
from src.adapters.gateways.extrator_os_claude_gateway import ClaudeExtratorDadosOSGateway, ESQUEMA_OS
from src.adapters.gateways.pix_brcode_gateway import PixBrCodeGateway, crc16_ccitt, gerar_br_code
from src.adapters.gateways.pdf_termico import renderizar_pdf_termico


# ---------------------------------------------------------------- Telegram

async def test_telegram_baixa_audio_e_envia_card_com_botoes():
    chamadas = []

    def responder(request: httpx.Request) -> httpx.Response:
        chamadas.append(request)
        if request.url.path.endswith("/getFile"):
            return httpx.Response(200, json={"ok": True, "result": {"file_path": "voice/file_1.oga"}})
        if "/file/bot" in request.url.path:
            return httpx.Response(200, content=b"OggS-bytes")
        return httpx.Response(200, json={"ok": True})

    gateway = TelegramBotHttpGateway("123:ABC", transport=httpx.MockTransport(responder))

    assert await gateway.baixar_arquivo("voice-id") == b"OggS-bytes"
    await gateway.enviar_mensagem(42, "Nova OS", [
        BotaoInline(texto="✅ Confirmar", callback_data="confirmar:1"),
        BotaoInline(texto="📋 Ver", url="https://painel/os/1"),
    ])
    await gateway.responder_callback("cb-1", "ok")

    envio = json.loads(chamadas[2].content)
    assert envio["chat_id"] == 42
    assert envio["reply_markup"]["inline_keyboard"][0] == [
        {"text": "✅ Confirmar", "callback_data": "confirmar:1"},
        {"text": "📋 Ver", "url": "https://painel/os/1"},
    ]
    assert chamadas[3].url.path.endswith("/answerCallbackQuery")


async def test_telegram_sem_token_ou_com_erro_http():
    with pytest.raises(IntegracaoExternaException):
        await TelegramBotHttpGateway("").enviar_mensagem(1, "x")

    falha = TelegramBotHttpGateway("123:ABC", transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    with pytest.raises(IntegracaoExternaException):
        await falha.baixar_arquivo("x")
    with pytest.raises(IntegracaoExternaException):
        await falha.responder_callback("cb", "x")


# ---------------------------------------------------------------- Whisper

async def test_whisper_envia_audio_em_portugues_com_vocabulario_tecnico():
    recebido = {}

    def responder(request: httpx.Request) -> httpx.Response:
        recebido["auth"] = request.headers.get("authorization")
        recebido["corpo"] = request.read()
        return httpx.Response(200, json={"text": " Gol do seu Carlos, alternador não carrega "})

    gateway = WhisperTranscricaoGateway("https://asr.local/v1/audio/transcriptions", "chave", transport=httpx.MockTransport(responder))
    texto = await gateway.transcrever(b"OggS", "audio.oga")

    assert texto == "Gol do seu Carlos, alternador não carrega"
    assert recebido["auth"] == "Bearer chave"
    assert b'name="language"' in recebido["corpo"] and b"pt" in recebido["corpo"]
    assert "bendix".encode() in recebido["corpo"]


async def test_whisper_falhas_viram_erro_de_integracao():
    vazio = WhisperTranscricaoGateway("https://asr.local", "", transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"text": ""})))
    with pytest.raises(IntegracaoExternaException):
        await vazio.transcrever(b"x", "a.oga")
    erro = WhisperTranscricaoGateway("https://asr.local", "", transport=httpx.MockTransport(lambda r: httpx.Response(503)))
    with pytest.raises(IntegracaoExternaException):
        await erro.transcrever(b"x", "a.oga")
    with pytest.raises(IntegracaoExternaException):
        await WhisperTranscricaoGateway("", "").transcrever(b"x", "a.oga")


# ---------------------------------------------------------------- Extrator LLM (Claude)

class ClienteIAFalso:
    def __init__(self, resposta):
        self.resposta = resposta
        self.parametros = None
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    async def _create(self, **parametros):
        self.parametros = parametros
        return self.resposta


def _resposta(texto: str, stop_reason: str = "end_turn"):
    return SimpleNamespace(stop_reason=stop_reason, content=[
        SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=texto)
    ])


DADOS_IA = {
    "nome_cliente": "Carlos", "carro_modelo": "Gol 1.6", "carro_marca": "Volkswagen", "carro_placa": None,
    "carro_ano": None, "telefone_cliente": None, "sintomas_relatados": "Bateria descarregando",
    "hipotese_diagnostica": "Alternador sem carga", "servicos_sugeridos": ["Diagnóstico de alternador"],
    "checklist_eletrico": {"bateria": "teste de carga", "alternador": "falha", "motor_partida": None,
                           "iluminacao": None, "injecao": None},
    "prioridade": "ALTA",
}


async def test_extrator_usa_saida_estruturada_esforco_baixo_e_fallback():
    cliente = ClienteIAFalso(_resposta(json.dumps(DADOS_IA)))
    dados = await ClaudeExtratorDadosOSGateway(cliente, "claude-opus-5-5", "low").extrair("Gol do seu Carlos...")

    assert dados.nome_cliente == "Carlos" and dados.prioridade == PrioridadeOS.ALTA
    assert dados.checklist_eletrico == {"bateria": "teste de carga", "alternador": "falha"}
    p = cliente.parametros
    assert p["model"] == "claude-opus-5-5"
    assert p["fallbacks"] == "default" and p["betas"] == ["server-side-fallback-2026-07-01"]
    assert p["output_config"] == {"effort": "low", "format": {"type": "json_schema", "schema": ESQUEMA_OS}}
    assert "<transcricao>" in p["messages"][0]["content"]


async def test_extrator_trata_recusa_truncamento_e_json_invalido():
    for resposta in (_resposta("", "refusal"), _resposta("{", "max_tokens"), _resposta("não é json")):
        with pytest.raises(IntegracaoExternaException):
            await ClaudeExtratorDadosOSGateway(ClienteIAFalso(resposta)).extrair("x")


async def test_extrator_sem_cliente_identificado_pede_novo_audio():
    dados = {**DADOS_IA, "nome_cliente": ""}
    with pytest.raises(RegraNegocioException):
        await ClaudeExtratorDadosOSGateway(ClienteIAFalso(_resposta(json.dumps(dados)))).extrair("x")


# ---------------------------------------------------------------- PIX BR Code

def test_crc16_ccitt_vetor_de_referencia():
    assert crc16_ccitt("123456789") == "29B1"


async def test_br_code_pix_com_valor_txid_e_crc_valido():
    payload = (await PixBrCodeGateway("pix@eletrocar.com.br", "Auto Elétrica Eletrocar", "São Paulo")
               .criar_cobranca("ELC" + "a" * 22, Decimal("489.00"), "Venda balcão", 1800)).copia_e_cola

    assert payload.startswith("000201010212")
    assert "br.gov.bcb.pix" in payload and "pix@eletrocar.com.br" in payload
    assert "5406489.00" in payload and "5802BR" in payload
    assert "AUTO ELETRICA ELETROCAR" in payload and "SAO PAULO" in payload
    assert payload[-8:-4] == "6304" and crc16_ccitt(payload[:-4]) == payload[-4:]


async def test_br_code_exige_chave_e_txid_curto():
    with pytest.raises(IntegracaoExternaException):
        await PixBrCodeGateway("", "X", "Y").criar_cobranca("A" * 25, Decimal("1"), "x", 60)
    with pytest.raises(IntegracaoExternaException):
        await PixBrCodeGateway("chave", "X", "Y").criar_cobranca("A" * 30, Decimal("1"), "x", 60)
    assert gerar_br_code("chave", Decimal("1"), "T" * 25, "N", "C").startswith("000201")


# ---------------------------------------------------------------- PDF térmico

def test_pdf_termico_valido_com_altura_proporcional():
    curto = renderizar_pdf_termico(["AUTO ELETRICA", "Total (R$) 10,00"], 80)
    longo = renderizar_pdf_termico(["linha ção"] * 40, 58)
    for pdf in (curto, longo):
        assert pdf.startswith(b"%PDF-1.4") and pdf.rstrip().endswith(b"%%EOF") and b"/Courier" in pdf
    assert b"\\(R$\\)" in curto  # parênteses escapados no fluxo de texto
    assert b"MediaBox [0 0 164.41" in longo  # 58 mm em pontos


async def test_telegram_simulado_em_desenvolvimento_sem_token(monkeypatch, caplog):
    from src.infra.config import settings
    from src.adapters.controllers.fabricas import get_telegram_gateway
    from src.adapters.gateways.telegram_gateway import TelegramConsoleGateway

    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "")
    monkeypatch.setattr(settings, "AMBIENTE", "desenvolvimento")
    gateway = get_telegram_gateway()
    assert isinstance(gateway, TelegramConsoleGateway)

    caplog.set_level("INFO", logger="eletrocar.telegram")
    await gateway.enviar_mensagem(42, "Nova OS", [BotaoInline(texto="✅ Confirmar", callback_data="c")])
    await gateway.responder_callback("cb", "ok")
    assert "Nova OS" in caplog.text and "cb" in caplog.text
    with pytest.raises(IntegracaoExternaException):
        await gateway.baixar_arquivo("x")

    monkeypatch.setattr(settings, "AMBIENTE", "producao")
    assert isinstance(get_telegram_gateway(), TelegramBotHttpGateway)
