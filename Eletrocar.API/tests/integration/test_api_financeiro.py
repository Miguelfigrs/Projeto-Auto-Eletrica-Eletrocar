"""
Testes de integração: PIX com webhook de liquidação, contas a pagar/receber, inadimplência e DRE.
"""
from datetime import date, timedelta
import pytest
from httpx import AsyncClient
from src.infra.config import settings
from src.domain.value_objects.tempo import hoje_local
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
    hoje = hoje_local(settings.FUSO_HORARIO)

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


async def test_dre_filtros_mes_ano_e_lucros_prejuizos(client: AsyncClient, criar_usuario):
    """Valida filtros mes/ano em /relatorios/dre e /relatorios/dre/mensal (TODOS, LUCROS, PREJUIZOS)."""
    _, admin = await criar_usuario(Papel.ADMIN, Papel.BALCONISTA)
    ano_teste = 2025

    peca = (
        await client.post(
            "/api/v1/pecas",
            json={
                "codigo_barras": "7891112223334",
                "sku": "ALT-BOSCH-90A",
                "descricao": "Alternador Bosch 90A",
                "preco_custo": "200.00",
                "preco_venda": "600.00",
                "estoque_atual": 10,
            },
            headers=admin,
        )
    ).json()

    await client.post("/api/v1/caixa/abrir", json={}, headers=admin)

    # Mês de prejuízo (Jan/2025): despesa fixa paga de R$ 1.200,00 sem vendas no mês
    despesa_jan = await client.post(
        "/api/v1/financeiro/titulos",
        json={
            "tipo": "PAGAR",
            "descricao": "Energia Jan/2025",
            "valor": "1200.00",
            "data_vencimento": f"{ano_teste}-01-15",
            "categoria": "DESPESA_FIXA",
        },
        headers=admin,
    )
    assert despesa_jan.status_code == 201
    baixa_jan = await client.post(
        f"/api/v1/financeiro/titulos/{despesa_jan.json()['id']}/baixa",
        json={"data_pagamento": f"{ano_teste}-01-15", "forma_pagamento": "PIX"},
        headers=admin,
    )
    assert baixa_jan.status_code == 200

    # Mês de lucro (Fev/2025): venda de R$ 600,00 com CMV R$ 200,00 -> lucro líquido R$ 400,00
    # Nota: vendas via endpoint registram data_hora atual; então testamos o mês atual como lucro se necessário
    # e Jan/2025 como prejuízo, ou garantimos despesa paga no ano de teste + filtro anual.
    venda_atual = await client.post(
        "/api/v1/vendas",
        json={"itens": [{"peca_id": peca["id"], "quantidade": 1}]},
        headers=admin,
    )
    assert venda_atual.status_code == 201
    hoje = hoje_local(settings.FUSO_HORARIO)

    # Consulta específica por mes e ano (Janeiro/2025 -> prejuízo de -1200.00)
    dre_jan = await client.get(
        "/api/v1/relatorios/dre",
        params={"mes": 1, "ano": ano_teste},
        headers=admin,
    )
    assert dre_jan.status_code == 200
    assert dre_jan.json()["despesas_operacionais_fixas"] == "1200.00"
    assert dre_jan.json()["lucro_liquido"] == "-1200.00"

    # Consulta mensal filtrada por PREJUIZOS em 2025
    mensal_prejuizos = await client.get(
        "/api/v1/relatorios/dre/mensal",
        params={"ano": ano_teste, "resultado": "PREJUIZOS"},
        headers=admin,
    )
    assert mensal_prejuizos.status_code == 200
    dados_prej = mensal_prejuizos.json()
    assert dados_prej["ano"] == ano_teste
    assert dados_prej["filtro_resultado"] == "PREJUIZOS"
    assert any(item["mes"] == 1 and item["eh_prejuizo"] is True for item in dados_prej["meses"])
    assert dados_prej["soma_prejuizos"] == "1200.00"

    # Consulta mensal filtrada por LUCROS no ano corrente (contém mês da venda acima)
    mensal_lucros = await client.get(
        "/api/v1/relatorios/dre/mensal",
        params={"ano": hoje.year, "resultado": "LUCROS"},
        headers=admin,
    )
    assert mensal_lucros.status_code == 200
    dados_lucros = mensal_lucros.json()
    assert dados_lucros["filtro_resultado"] == "LUCROS"
    assert any(item["mes"] == hoje.month and item["eh_lucro"] is True for item in dados_lucros["meses"])

    # Consulta consolidada anual (apenas ano, sem mes)
    dre_anual = await client.get(
        "/api/v1/relatorios/dre",
        params={"ano": ano_teste},
        headers=admin,
    )
    assert dre_anual.status_code == 200
    assert dre_anual.json()["despesas_operacionais_fixas"] == "1200.00"


async def test_detalhamento_dre_e_historico_de_estoque(client: AsyncClient, criar_usuario):
    """Fluxo real: cadastro -> entrada -> venda -> cancelamento -> ajuste, refletido nos dois relatórios."""
    admin_usuario, admin = await criar_usuario(Papel.ADMIN, Papel.BALCONISTA)
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    hoje = hoje_local(settings.FUSO_HORARIO)

    peca = (await client.post("/api/v1/pecas", json={
        "codigo_barras": "7891234500017", "sku": "FUS-30A", "descricao": "Fusível 30A",
        "preco_custo": "1.00", "preco_venda": "3.00", "estoque_atual": 10
    }, headers=admin)).json()
    assert (await client.post(f"/api/v1/pecas/{peca['id']}/entrada", json={"quantidade": 5, "observacao": "NF 77"},
                              headers=admin)).status_code == 200
    await client.post("/api/v1/caixa/abrir", json={}, headers=admin)
    venda = (await client.post("/api/v1/vendas", json={"itens": [{"peca_id": peca["id"], "quantidade": 2}]},
                               headers=admin)).json()
    cancelada = (await client.post("/api/v1/vendas", json={"itens": [{"peca_id": peca["id"], "quantidade": 1}]},
                                   headers=admin)).json()
    assert (await client.post(f"/api/v1/vendas/{cancelada['id']}/cancelar", json={"motivo": "Desistiu"},
                              headers=admin)).status_code == 200
    assert (await client.post(f"/api/v1/pecas/{peca['id']}/ajuste", json={"novo_saldo": 10, "motivo": "Inventário"},
                              headers=admin)).status_code == 200

    detalhe = await client.get("/api/v1/relatorios/dre/detalhes",
                               params={"data_inicio": hoje.isoformat(), "data_fim": hoje.isoformat()}, headers=admin)
    assert detalhe.status_code == 200, detalhe.text
    dados = detalhe.json()
    assert [v["numero"] for v in dados["vendas"]] == [venda["numero_venda"]]
    assert dados["vendas"][0]["operador"] == admin_usuario.nome
    assert dados["vendas"][0]["itens"][0]["descricao"] == "Fusível 30A"
    assert dados["total_vendas"] == "6.00"
    assert (await client.get("/api/v1/relatorios/dre/detalhes", params={"ano": hoje.year},
                             headers=admin)).status_code == 200

    historico = await client.get("/api/v1/pecas/movimentacoes", params={"peca_id": peca["id"]}, headers=admin)
    assert historico.status_code == 200, historico.text
    movs = historico.json()
    origens = sorted((m["origem"], m["tipo"], m["quantidade"]) for m in movs["movimentacoes"])
    assert origens == [
        ("AJUSTE_INVENTARIO", "SAIDA", 3),   # 10 + 5 - 2 - 1 + 1 = 13 -> 10
        ("CADASTRO", "ENTRADA", 10),
        ("CANCELAMENTO_VENDA", "ENTRADA", 1),
        ("ENTRADA_FORNECEDOR", "ENTRADA", 5),
        ("VENDA", "SAIDA", 1),
        ("VENDA", "SAIDA", 2),
    ]
    assert (movs["total_entradas"], movs["total_saidas"]) == (16, 6)

    so_saidas = (await client.get("/api/v1/pecas/movimentacoes", params={"peca_id": peca["id"], "tipo": "SAIDA"},
                                  headers=admin)).json()
    assert so_saidas["total_entradas"] == 0 and so_saidas["total_saidas"] == 6

    assert (await client.get("/api/v1/pecas/movimentacoes", params={"tipo": "OUTRO"}, headers=admin)).status_code == 422
    assert (await client.get("/api/v1/pecas/movimentacoes", headers=balconista)).status_code == 403
    assert (await client.get("/api/v1/relatorios/dre/detalhes", headers=balconista)).status_code == 403


async def test_listar_catalogo_de_pecas(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    _, eletricista = await criar_usuario(Papel.ELETRICISTA)
    for sku, descricao, barras in (("Z-01", "Zebra relé", "7891111100013"), ("A-01", "Alternador 90A", "7891111100020")):
        assert (await client.post("/api/v1/pecas", json={
            "codigo_barras": barras, "sku": sku, "descricao": descricao,
            "preco_custo": "1.00", "preco_venda": "2.00", "estoque_atual": 1
        }, headers=admin)).status_code == 201

    resposta = await client.get("/api/v1/pecas", headers=eletricista)
    assert resposta.status_code == 200
    descricoes = [p["descricao"] for p in resposta.json()]
    assert descricoes.index("Alternador 90A") < descricoes.index("Zebra relé")
    assert (await client.get("/api/v1/pecas")).status_code == 401
