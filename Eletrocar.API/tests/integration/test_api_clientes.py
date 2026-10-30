"""
Testes de integração: Cadastro simplificado de clientes e carros (Módulo 5).
"""
from httpx import AsyncClient
from src.domain.value_objects.enums import Papel


async def test_cadastro_busca_e_inclusao_de_carro(client: AsyncClient, criar_usuario):
    _, balconista = await criar_usuario(Papel.BALCONISTA)

    criado = await client.post("/api/v1/clientes", json={
        "nome": "João Paulo da Silva", "cpf_cnpj": "123.456.789-09", "telefone": "(11) 98765-1122",
        "carros": [{"modelo": "Gol 1.6 MSI", "marca": "Volkswagen", "placa": "bra-2e19", "ano": "2020"}]
    }, headers=balconista)
    assert criado.status_code == 201, criado.text
    cliente = criado.json()
    assert cliente["cpf_cnpj"] == "12345678909"
    assert cliente["carros"][0]["placa"] == "BRA2E19"

    for termo in ("joão", "gol", "BRA2E19", "123456789"):
        res = await client.get("/api/v1/clientes/search", params={"q": termo}, headers=balconista)
        assert [c["id"] for c in res.json()] == [cliente["id"]], termo

    com_carro = await client.post(f"/api/v1/clientes/{cliente['id']}/carros", json={
        "modelo": "Hilux 2.8", "marca": "Toyota", "placa": "HLX1A23"
    }, headers=balconista)
    assert com_carro.status_code == 201
    assert len(com_carro.json()["carros"]) == 2

    obtido = await client.get(f"/api/v1/clientes/{cliente['id']}", headers=balconista)
    assert obtido.json()["nome"] == "João Paulo da Silva"


async def test_regras_de_cadastro_de_cliente(client: AsyncClient, criar_usuario):
    _, eletricista = await criar_usuario(Papel.ELETRICISTA)
    await client.post("/api/v1/clientes", json={
        "nome": "Maria", "cpf_cnpj": "23456789092", "carros": [{"modelo": "HB20", "marca": "Hyundai", "placa": "RIO1A23"}]
    }, headers=eletricista)

    cpf_invalido = await client.post("/api/v1/clientes", json={"nome": "X", "cpf_cnpj": "111.111.111-11"}, headers=eletricista)
    assert cpf_invalido.status_code == 400
    cpf_duplicado = await client.post("/api/v1/clientes", json={"nome": "Y", "cpf_cnpj": "23456789092"}, headers=eletricista)
    assert cpf_duplicado.status_code == 400
    placa_duplicada = await client.post("/api/v1/clientes", json={
        "nome": "Z", "carros": [{"modelo": "Onix", "marca": "Chevrolet", "placa": "RIO-1A23"}]
    }, headers=eletricista)
    assert placa_duplicada.status_code == 400
    sem_nome = await client.post("/api/v1/clientes", json={"nome": "  "}, headers=eletricista)
    assert sem_nome.status_code == 400

    assert (await client.get("/api/v1/clientes/00000000-0000-4000-8000-000000000000", headers=eletricista)).status_code == 404
    assert (await client.post("/api/v1/clientes/00000000-0000-4000-8000-000000000000/carros",
                              json={"modelo": "A", "marca": "B"}, headers=eletricista)).status_code == 404
