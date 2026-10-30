"""
Testes de integração: Webhook do Telegram (Update oficial) e ciclo de vida da OS pela API
(reserva de peças, baixa na finalização e faturamento no caixa).
"""
import pytest
from httpx import AsyncClient
from src.infra.config import settings
from src.domain.value_objects.enums import Papel
from src.adapters.controllers.fabricas import get_telegram_gateway, get_transcricao_gateway, get_extrator_gateway
from src.main import app
from tests.fakes.fake_servicos import FakeTelegramGateway, FakeTranscricaoGateway, FakeExtratorGateway

SEGREDO = {"X-Telegram-Bot-Api-Secret-Token": settings.TELEGRAM_WEBHOOK_SECRET}


@pytest.fixture
def telegram_fake():
    telegram = FakeTelegramGateway()
    app.dependency_overrides[get_telegram_gateway] = lambda: telegram
    app.dependency_overrides[get_transcricao_gateway] = lambda: FakeTranscricaoGateway()
    app.dependency_overrides[get_extrator_gateway] = lambda: FakeExtratorGateway()
    return telegram


def _update_voz(telegram_id: int, chat_id: int = 42) -> dict:
    return {"update_id": 1, "message": {
        "message_id": 10, "from": {"id": telegram_id, "first_name": "Márcio"}, "chat": {"id": chat_id, "type": "private"},
        "voice": {"file_id": "AwACAgEAAxkBAAIB", "duration": 14, "mime_type": "audio/ogg"},
    }}


async def test_webhook_sem_segredo_e_recusado(client: AsyncClient, telegram_fake, criar_usuario):
    await criar_usuario(Papel.ELETRICISTA, telegram="987654321")
    res = await client.post("/api/v1/telegram/webhook", json=_update_voz(987654321))
    assert res.status_code == 401
    res = await client.post("/api/v1/telegram/webhook", json=_update_voz(987654321),
                            headers={"X-Telegram-Bot-Api-Secret-Token": "chute"})
    assert res.status_code == 401
    assert telegram_fake.downloads == []


async def test_usuario_fora_da_whitelist_nao_abre_os(client: AsyncClient, telegram_fake, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    res = await client.post("/api/v1/telegram/webhook", json=_update_voz(555), headers=SEGREDO)
    assert res.status_code == 200
    assert "não autorizado" in res.json()["ignorado"]
    assert (await client.get("/api/v1/ordens-servico", headers=admin)).json() == []


async def test_pipeline_telegram_voice_e_ciclo_os(client: AsyncClient, telegram_fake, criar_usuario):
    eletricista, headers_eletricista = await criar_usuario(Papel.ELETRICISTA, telegram="987654321")
    _, admin = await criar_usuario(Papel.ADMIN)
    _, balconista = await criar_usuario(Papel.BALCONISTA)

    # 1. Áudio do eletricista -> Whisper -> LLM -> OS em TRIAGEM
    res = await client.post("/api/v1/telegram/webhook", json=_update_voz(987654321), headers=SEGREDO)
    assert res.status_code == 200, res.text
    os_info = res.json()["os"]
    assert (os_info["status"], os_info["origem"]) == ("TRIAGEM", "TELEGRAM_VOICE")
    assert os_info["nome_cliente"] == "Carlos Silva"
    chat_id, card, botoes = telegram_fake.mensagens[-1]
    assert chat_id == 42 and os_info["numero_os"] in card
    os_id = os_info["id"]

    # 2. Botão [Confirmar] no Telegram -> ORCAMENTO_PENDENTE
    callback = {"update_id": 2, "callback_query": {
        "id": "cb-1", "from": {"id": 987654321}, "message": {"chat": {"id": 42}}, "data": f"confirmar:{os_id}"
    }}
    assert (await client.post("/api/v1/telegram/webhook", json=callback, headers=SEGREDO)).status_code == 200
    assert (await client.get(f"/api/v1/ordens-servico/{os_id}", headers=headers_eletricista)).json()["status"] == "ORCAMENTO_PENDENTE"

    # 3. Peça reservada + mão de obra
    peca = (await client.post("/api/v1/pecas", json={
        "codigo_barras": "7897778889991", "sku": "BOSCH-REG-GOL", "descricao": "Regulador Bosch 14V Gol",
        "preco_custo": "70.00", "preco_venda": "130.00", "estoque_atual": 5, "estoque_minimo": 1
    }, headers=admin)).json()
    assert (await client.post(f"/api/v1/ordens-servico/{os_id}/servicos", json={
        "descricao": "Revisão do motor de arranque", "valor": "120.00", "eletricista_id": str(eletricista.id)
    }, headers=headers_eletricista)).status_code == 200
    com_peca = await client.post(f"/api/v1/ordens-servico/{os_id}/pecas", json={"peca_id": peca["id"], "quantidade": 1},
                                 headers=headers_eletricista)
    assert com_peca.json()["valor_total"] == "250.00"
    reservada = (await client.get(f"/api/v1/pecas/barcode/7897778889991", headers=admin)).json()
    assert (reservada["estoque_atual"], reservada["estoque_reservado"], reservada["estoque_disponivel"]) == (5, 1, 4)

    # 4. Execução até a finalização -> baixa definitiva
    for status in ("APROVADO", "EM_EXECUCAO", "TESTES_ELETRICOS", "FINALIZADO"):
        r = await client.patch(f"/api/v1/ordens-servico/{os_id}/status", json={"novo_status": status}, headers=headers_eletricista)
        assert r.status_code == 200, r.text
    baixada = (await client.get(f"/api/v1/pecas/barcode/7897778889991", headers=admin)).json()
    assert (baixada["estoque_atual"], baixada["estoque_reservado"]) == (4, 0)

    # 5. ENTREGUE só por faturamento (balcão, com caixa aberto)
    direto = await client.patch(f"/api/v1/ordens-servico/{os_id}/status", json={"novo_status": "ENTREGUE"}, headers=headers_eletricista)
    assert direto.status_code == 400
    assert (await client.post(f"/api/v1/ordens-servico/{os_id}/faturar", json={"forma_pagamento": "PIX"},
                              headers=headers_eletricista)).status_code == 403
    await client.post("/api/v1/caixa/abrir", json={}, headers=balconista)
    faturada = await client.post(f"/api/v1/ordens-servico/{os_id}/faturar", json={"forma_pagamento": "CARTAO_DEBITO"}, headers=balconista)
    assert faturada.status_code == 200, faturada.text
    assert faturada.json()["status"] == "ENTREGUE"
    totais = (await client.get("/api/v1/caixa/gerencial", headers=admin)).json()["totais_por_forma"]
    assert totais["CARTAO_DEBITO"] == "250.00"

    orcamento = await client.get(f"/api/v1/ordens-servico/{os_id}/orcamento?formato=whatsapp", headers=balconista)
    assert os_info["numero_os"] in orcamento.json()["texto"]
