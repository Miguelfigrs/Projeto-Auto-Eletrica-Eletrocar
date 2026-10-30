"""
Testes de integração: Leitor de código de barras, catálogo, preço auditado, entrada/ajuste e desempenho.
"""
import time
from httpx import AsyncClient
from src.domain.value_objects.enums import Papel

PECA = {
    "codigo_barras": "7891234567890",
    "sku": "alt-bosch-12v",
    "descricao": "Alternador Bosch 12V 90A",
    "preco_custo": "450.00",
    "preco_venda": "680.00",
    "estoque_atual": 5,
    "estoque_minimo": 2,
    "codigo_original_fabricante": "F000BL0662",
    "fabricante": "Bosch",
    "aplicacao_veicular": "Gol G5 1.6, Fox 1.6",
}


async def _cadastrar(client, headers, **extra):
    res = await client.post("/api/v1/pecas", json={**PECA, **extra}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


async def test_cadastro_e_leitura_pelo_leitor(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    peca = await _cadastrar(client, admin)
    assert peca["sku"] == "ALT-BOSCH-12V"

    lida = await client.get("/api/v1/pecas/barcode/7891234567890%0D", headers=balconista)
    assert lida.status_code == 200
    assert lida.json()["id"] == peca["id"]

    por_sku = await client.get("/api/v1/pecas/barcode/alt-bosch-12v", headers=balconista)
    assert por_sku.json()["id"] == peca["id"]

    assert (await client.get("/api/v1/pecas/barcode/0000000000000", headers=balconista)).status_code == 404


async def test_busca_por_aplicacao_veicular_e_codigo_original(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    alvo = await _cadastrar(client, admin)
    await _cadastrar(client, admin, codigo_barras="7894059681042", sku="ALT-VALEO-110A", descricao="Alternador Valeo 110A",
                     codigo_original_fabricante="439894", fabricante="Valeo", aplicacao_veicular="Onix, Prisma")

    res = await client.get("/api/v1/pecas/search", params={"q": "alternador gol 1.6"}, headers=admin)
    assert [p["id"] for p in res.json()] == [alvo["id"]]
    res = await client.get("/api/v1/pecas/search", params={"q": "f000bl0662"}, headers=admin)
    assert [p["id"] for p in res.json()] == [alvo["id"]]


async def test_codigo_de_barras_duplicado_e_rejeitado(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    await _cadastrar(client, admin)
    assert (await client.post("/api/v1/pecas", json={**PECA, "sku": "OUTRO"}, headers=admin)).status_code == 400


async def test_alteracao_de_preco_entrada_e_ajuste_sao_auditados(client: AsyncClient, criar_usuario):
    _, admin = await criar_usuario(Papel.ADMIN)
    peca = await _cadastrar(client, admin)

    preco = await client.patch(f"/api/v1/pecas/{peca['id']}", json={"preco_venda": "699.90"}, headers=admin)
    assert preco.json()["preco_venda"] == "699.90"
    entrada = await client.post(f"/api/v1/pecas/{peca['id']}/entrada", json={"quantidade": 10, "observacao": "NF 991"}, headers=admin)
    assert entrada.json()["estoque_atual"] == 15
    ajuste = await client.post(f"/api/v1/pecas/{peca['id']}/ajuste", json={"novo_saldo": 14, "motivo": "Avaria no transporte"}, headers=admin)
    assert ajuste.json()["estoque_atual"] == 14

    logs = (await client.get("/api/v1/auditoria", headers=admin)).json()
    acoes = {l["acao"]: l for l in logs}
    assert acoes["PRECO_ALTERADO"]["payload_antes"]["preco_venda"] == "680.00"
    assert acoes["PRECO_ALTERADO"]["payload_depois"]["preco_venda"] == "699.90"
    assert acoes["ESTOQUE_AJUSTADO"]["payload_depois"] == {"estoque_atual": 14}
    assert "ESTOQUE_ENTRADA" in acoes


async def test_benchmark_item_add_latency(client: AsyncClient, criar_usuario):
    """RNF01: leitura óptica + resposta da peça em menos de 150 ms."""
    _, admin = await criar_usuario(Papel.ADMIN)
    await _cadastrar(client, admin)
    await client.get("/api/v1/pecas/barcode/7891234567890", headers=admin)  # aquecimento

    amostras = []
    for _ in range(20):
        inicio = time.perf_counter()
        res = await client.get("/api/v1/pecas/barcode/7891234567890", headers=admin)
        amostras.append(time.perf_counter() - inicio)
        assert res.status_code == 200
    amostras.sort()
    p95 = amostras[int(len(amostras) * 0.95) - 1]
    assert p95 < 0.150, f"p95 da leitura = {p95 * 1000:.1f} ms"
