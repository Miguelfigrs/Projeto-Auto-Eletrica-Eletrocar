"""
Testes de integração: PDV, alçada gerencial, fechamento cego, relatório gerencial e cancelamento de venda.
"""
from httpx import AsyncClient
from src.domain.value_objects.enums import Papel


async def _peca(client, admin, estoque=10, preco="35.00", barcode="7890001112223"):
    res = await client.post("/api/v1/pecas", json={
        "codigo_barras": barcode, "sku": f"SKU-{barcode}", "descricao": "Relé Auxiliar de Partida 12V 40A",
        "preco_custo": "15.00", "preco_venda": preco, "estoque_atual": estoque, "estoque_minimo": 2,
    }, headers=admin)
    assert res.status_code == 201, res.text
    return res.json()


async def test_venda_exige_caixa_aberto(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    peca = await _peca(client, admin)
    res = await client.post("/api/v1/vendas", json={"itens": [{"peca_id": peca["id"], "quantidade": 1}]}, headers=balconista)
    assert res.status_code == 409
    assert res.json()["tipo"] == "CaixaFechado"


async def test_fluxo_completo_venda_alcada_e_fechamento_cego(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN, email="gestor@eletrocar.com.br", pin="9090")
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    peca = await _peca(client, admin)

    abertura = await client.post("/api/v1/caixa/abrir", json={"saldo_inicial": "100.00"}, headers=balconista)
    assert abertura.status_code == 201
    caixa_id = abertura.json()["id"]

    # 3 x 35 = 105; desconto de 5,00 (4,76%) cabe na alçada do balconista
    venda = await client.post("/api/v1/vendas", json={
        "itens": [{"peca_id": peca["id"], "quantidade": 3}], "desconto": "5.00", "forma_pagamento": "DINHEIRO"
    }, headers=balconista)
    assert venda.status_code == 201, venda.text
    assert venda.json()["valor_total"] == "100.00"
    assert venda.json()["numero_venda"].startswith("VB-")

    # Desconto de 20% exige gestor
    sem_gestor = await client.post("/api/v1/vendas", json={
        "itens": [{"peca_id": peca["id"], "quantidade": 1}], "desconto_percentual": "20", "forma_pagamento": "PIX"
    }, headers=balconista)
    assert sem_gestor.status_code == 403
    assert sem_gestor.json()["tipo"] == "AutorizacaoGerencialNecessaria"

    com_gestor = await client.post("/api/v1/vendas", json={
        "itens": [{"peca_id": peca["id"], "quantidade": 1}], "desconto_percentual": "20", "forma_pagamento": "PIX",
        "autorizacao": {"identificador_gestor": "gestor@eletrocar.com.br", "pin": "9090"}
    }, headers=balconista)
    assert com_gestor.status_code == 201
    assert com_gestor.json()["valor_total"] == "28.00"

    # O operador não enxerga saldo teórico em nenhum momento
    status_caixa = await client.get("/api/v1/caixa/status", headers=balconista)
    assert "saldo_teorico" not in status_caixa.text

    fechamento = await client.post("/api/v1/caixa/fechamento-cego", json={
        "valores_contados": {"DINHEIRO": "195.00", "PIX": "28.00"}
    }, headers=balconista)
    assert fechamento.status_code == 200
    assert "saldo_teorico" not in fechamento.text and "diferenca" not in fechamento.text

    # Gerência: dinheiro teórico 200,00 x contado 195,00 -> quebra de 5,00
    relatorio = await client.get(f"/api/v1/caixa/{caixa_id}/relatorio-fechamento", headers=admin)
    assert relatorio.status_code == 200
    dados = relatorio.json()
    assert dados["status"] == "QUEBRA_DE_CAIXA"
    assert dados["diferenca_total"] == "-5.00"
    dinheiro = next(f for f in dados["formas"] if f["forma_pagamento"] == "DINHEIRO")
    assert (dinheiro["teorico"], dinheiro["contado"]) == ("200.00", "195.00")

    restante = await client.get(f"/api/v1/pecas/barcode/{peca['codigo_barras']}", headers=balconista)
    assert restante.json()["estoque_atual"] == 6


async def test_cancelamento_de_venda_pelo_admin_estorna_estoque_e_caixa(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    peca = await _peca(client, admin, estoque=5)
    await client.post("/api/v1/caixa/abrir", json={"saldo_inicial": "50.00"}, headers=balconista)
    venda = (await client.post("/api/v1/vendas", json={"itens": [{"peca_id": peca["id"], "quantidade": 2}]}, headers=balconista)).json()

    assert (await client.post(f"/api/v1/vendas/{venda['id']}/cancelar", json={"motivo": "Erro de digitação"}, headers=balconista)).status_code == 403
    cancelada = await client.post(f"/api/v1/vendas/{venda['id']}/cancelar", json={"motivo": "Erro de digitação"}, headers=admin)
    assert cancelada.status_code == 200
    assert cancelada.json()["status"] == "CANCELADA"

    gerencial = (await client.get("/api/v1/caixa/gerencial", headers=admin)).json()
    assert gerencial["saldo_teorico_dinheiro"] == "50.00"
    assert (await client.get(f"/api/v1/pecas/barcode/{peca['codigo_barras']}", headers=admin)).json()["estoque_atual"] == 5


async def test_balconista_lista_apenas_as_proprias_vendas_e_emite_recibo(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    _, carlos = await criar_usuario(Papel.BALCONISTA)
    _, juliana = await criar_usuario(Papel.BALCONISTA)
    peca = await _peca(client, admin)
    await client.post("/api/v1/caixa/abrir", json={}, headers=carlos)
    venda = (await client.post("/api/v1/vendas", json={"itens": [{"peca_id": peca["id"], "quantidade": 1}]}, headers=carlos)).json()
    await client.post("/api/v1/vendas", json={"itens": [{"peca_id": peca["id"], "quantidade": 1}]}, headers=juliana)

    assert len((await client.get("/api/v1/vendas", headers=carlos)).json()) == 1
    assert len((await client.get("/api/v1/vendas", headers=admin)).json()) == 2

    pdf = await client.get(f"/api/v1/vendas/{venda['id']}/recibo?largura=58", headers=carlos)
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF-1.4")
    texto = await client.get(f"/api/v1/vendas/{venda['id']}/recibo?formato=texto", headers=carlos)
    assert venda["numero_venda"] in texto.text
