"""
Testes de integração: PIX com webhook de liquidação, contas a pagar/receber, inadimplência e DRE.
"""
from datetime import date, timedelta
import pytest
from httpx import AsyncClient
from src.infra.config import settings
from src.domain.value_objects.enums import Papel
from src.adapters.controllers.fabricas import get_pix_gateway
from src.adapters.gateways.pix_brcode_gateway import PixBrCodeGateway
from src.main import app


@pytest.fixture
def pix_configurado():
    app.dependency_overrides[get_pix_gateway] = lambda: PixBrCodeGateway("pix@eletrocar.com.br", "Auto Elétrica Eletrocar", "São Paulo")


async def test_venda_pix_com_confirmacao_automatica_de_liquidacao(client: AsyncClient, criar_usuario, pix_configurado):
    _, admin = await criar_usuario(Papel.ADMIN)
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    peca = (await client.post("/api/v1/pecas", json={
        "codigo_barras": "7892019482014", "sku": "BAT-MOURA-60AH", "descricao": "Bateria Moura 60Ah",
        "preco_custo": "340.00", "preco_venda": "489.00", "estoque_atual": 3
    }, headers=admin)).json()
    await client.post("/api/v1/caixa/abrir", json={}, headers=balconista)

    cobranca = await client.post("/api/v1/pagamentos/pix/cobrancas", json={"valor": "489.00", "descricao": "Venda balcão"}, headers=balconista)
    assert cobranca.status_code == 201
    dados = cobranca.json()
    assert dados["status"] == "PENDENTE"
    assert dados["copia_e_cola"].startswith("000201") and "br.gov.bcb.pix" in dados["copia_e_cola"]

    venda_antes = await client.post("/api/v1/vendas", json={
        "itens": [{"peca_id": peca["id"], "quantidade": 1}], "forma_pagamento": "PIX", "cobranca_pix_id": dados["id"]
    }, headers=balconista)
    assert venda_antes.status_code == 400  # ainda não liquidada

    sem_segredo = await client.post("/api/v1/pagamentos/pix/webhook", json={"txid": dados["txid"], "valor": "489.00", "end_to_end_id": "E1"})
    assert sem_segredo.status_code == 401
    liquidada = await client.post("/api/v1/pagamentos/pix/webhook", json={"txid": dados["txid"], "valor": "489.00", "end_to_end_id": "E1"},
                                  headers={"X-Webhook-Secret": settings.PIX_WEBHOOK_SECRET})
    assert liquidada.json()["status"] == "LIQUIDADA"

    venda = await client.post("/api/v1/vendas", json={
        "itens": [{"peca_id": peca["id"], "quantidade": 1}], "forma_pagamento": "PIX", "cobranca_pix_id": dados["id"]
    }, headers=balconista)
    assert venda.status_code == 201, venda.text
    consulta = await client.get(f"/api/v1/pagamentos/pix/cobrancas/{dados['id']}", headers=balconista)
    assert consulta.json()["referencia_uso"] == venda.json()["numero_venda"]


async def test_contas_inadimplencia_e_dre(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN, Papel.BALCONISTA)
    hoje = date.today()

    receber = await client.post("/api/v1/financeiro/titulos", json={
        "tipo": "RECEBER", "descricao": "Frota TransRápido", "valor": "1450.00",
        "data_vencimento": (hoje - timedelta(days=5)).isoformat(), "categoria": "SERVICO_A_PRAZO"
    }, headers=admin)
    assert receber.status_code == 201
    aluguel = await client.post("/api/v1/financeiro/titulos", json={
        "tipo": "PAGAR", "descricao": "Aluguel", "valor": "3500.00", "data_vencimento": hoje.isoformat(), "categoria": "DESPESA_FIXA"
    }, headers=admin)
    assert (await client.post(f"/api/v1/financeiro/titulos/{aluguel.json()['id']}/baixa", json={
        "data_pagamento": hoje.isoformat(), "forma_pagamento": "PIX"
    }, headers=admin)).status_code == 200

    inadimplencia = (await client.get("/api/v1/financeiro/inadimplencia", headers=admin)).json()
    assert inadimplencia["quantidade"] == 1
    assert inadimplencia["valor_total"] == "1450.00"
    assert inadimplencia["titulos"][0]["dias_em_atraso"] == 5

    # Venda real com custo congelado alimenta o DRE do período
    peca = (await client.post("/api/v1/pecas", json={
        "codigo_barras": "7896079881080", "sku": "RELE-AUX-4P", "descricao": "Relé Auxiliar",
        "preco_custo": "12.00", "preco_venda": "25.00", "estoque_atual": 10
    }, headers=admin)).json()
    await client.post("/api/v1/caixa/abrir", json={}, headers=admin)
    await client.post("/api/v1/vendas", json={"itens": [{"peca_id": peca["id"], "quantidade": 4}]}, headers=admin)

    dre = await client.get("/api/v1/relatorios/dre", params={"data_inicio": hoje.replace(day=1).isoformat(),
                                                             "data_fim": hoje.isoformat()}, headers=admin)
    assert dre.status_code == 200
    dados = dre.json()
    assert dados["receita_vendas_produtos"] == "100.00"
    assert dados["custo_mercadorias_vendidas"] == "48.00"
    assert dados["despesas_operacionais_fixas"] == "3500.00"
    assert dados["lucro_liquido"] == "-3448.00"
    assert dados["quantidade_vendas"] == 1
