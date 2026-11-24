"""
Testes de integração: checklist elétrico editável e dados do carro separados na OS (tela de oficina).
"""
from httpx import AsyncClient
from src.domain.value_objects.enums import Papel


async def test_checklist_da_os_e_dados_do_carro(client: AsyncClient, criar_usuario):
    _, eletricista = await criar_usuario(Papel.ELETRICISTA)
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    cliente = (await client.post("/api/v1/clientes", json={
        "nome": "Carlos Alberto", "carros": [{"modelo": "Gol 1.6", "marca": "Volkswagen", "placa": "BRA2E19"}]
    }, headers=balconista)).json()

    os_criada = await client.post("/api/v1/ordens-servico", json={
        "cliente_id": cliente["id"], "carro_id": cliente["carros"][0]["id"], "sintomas": "Bateria não carrega",
        "checklist_eletrico": {"bateria": False},
    }, headers=eletricista)
    assert os_criada.status_code == 201, os_criada.text
    dados = os_criada.json()
    assert dados["modelo_carro"] == "Volkswagen Gol 1.6"
    assert dados["placa_carro"] == "BRA2E19"

    marcado = await client.patch(f"/api/v1/ordens-servico/{dados['id']}/checklist",
                                 json={"checklist_eletrico": {"bateria": True, "alternador": False}}, headers=eletricista)
    assert marcado.status_code == 200, marcado.text
    assert marcado.json()["checklist_eletrico"] == {"bateria": True, "alternador": False}
    obtido = (await client.get(f"/api/v1/ordens-servico/{dados['id']}", headers=eletricista)).json()
    assert obtido["checklist_eletrico"]["bateria"] is True

    assert (await client.patch(f"/api/v1/ordens-servico/{dados['id']}/status", json={"novo_status": "CANCELADO"},
                               headers=eletricista)).status_code == 200
    bloqueado = await client.patch(f"/api/v1/ordens-servico/{dados['id']}/checklist",
                                   json={"checklist_eletrico": {"bateria": False}}, headers=eletricista)
    assert bloqueado.status_code == 400
    assert "checklist" in bloqueado.json()["erro"]
