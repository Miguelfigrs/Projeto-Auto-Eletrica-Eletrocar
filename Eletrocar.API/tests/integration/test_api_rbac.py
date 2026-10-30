"""
Testes de integração: Matriz RBAC (slide 26) e gestão de usuários pelo Administrador.
"""
from httpx import AsyncClient
from src.domain.value_objects.enums import Papel


async def test_endpoints_exigem_autenticacao(client: AsyncClient):
    for metodo, rota in (
        ("get", "/api/v1/pecas/barcode/7891049281023"),
        ("get", "/api/v1/pecas/search?q=bosch"),
        ("get", "/api/v1/ordens-servico"),
        ("get", "/api/v1/caixa/status"),
        ("get", "/api/v1/clientes/search?q=joao"),
    ):
        assert (await getattr(client, metodo)(rota)).status_code == 401, rota


async def test_eletricista_nao_vende_nem_acessa_caixa_ou_financeiro(client: AsyncClient, criar_usuario):
    _, eletricista = await criar_usuario(Papel.ELETRICISTA)
    assert (await client.post("/api/v1/vendas", json={"itens": [{"peca_id": "00000000-0000-4000-8000-000000000000", "quantidade": 1}]},
                              headers=eletricista)).status_code == 403
    assert (await client.post("/api/v1/caixa/abrir", json={}, headers=eletricista)).status_code == 403
    assert (await client.get("/api/v1/relatorios/dre", headers=eletricista)).status_code == 403
    # Pode consultar peças (leitura de saldo) e OS
    assert (await client.get("/api/v1/pecas/search?q=x", headers=eletricista)).status_code == 200
    assert (await client.get("/api/v1/ordens-servico", headers=eletricista)).status_code == 200


async def test_balconista_nao_altera_estoque_preco_usuarios_nem_ve_dre_ou_auditoria(client: AsyncClient, criar_usuario):
    _, balconista = await criar_usuario(Papel.BALCONISTA)
    peca = {"codigo_barras": "7890000000001", "sku": "X-1", "descricao": "Teste", "preco_custo": "1", "preco_venda": "2", "estoque_atual": 1}
    assert (await client.post("/api/v1/pecas", json=peca, headers=balconista)).status_code == 403
    assert (await client.get("/api/v1/usuarios", headers=balconista)).status_code == 403
    assert (await client.get("/api/v1/relatorios/dre", headers=balconista)).status_code == 403
    assert (await client.get("/api/v1/auditoria", headers=balconista)).status_code == 403
    assert (await client.get("/api/v1/caixa/gerencial", headers=balconista)).status_code == 403
    assert (await client.get("/api/v1/financeiro/titulos", headers=balconista)).status_code == 403


async def test_dono_multi_perfil_acessa_balcao_oficina_e_gestao(client: AsyncClient, criar_usuario):
    _, dono = await criar_usuario(Papel.ADMIN, Papel.BALCONISTA, Papel.ELETRICISTA)
    assert (await client.post("/api/v1/caixa/abrir", json={"saldo_inicial": "100.00"}, headers=dono)).status_code == 201
    assert (await client.get("/api/v1/ordens-servico", headers=dono)).status_code == 200
    assert (await client.get("/api/v1/relatorios/dre", headers=dono)).status_code == 200


async def test_admin_gerencia_usuarios_e_papeis(client: AsyncClient, criar_usuario):
    admin, headers = await criar_usuario(Papel.ADMIN)

    criado = await client.post("/api/v1/usuarios", json={
        "nome": "Roberto Sênior", "email": "roberto@eletrocar.com.br", "username": "roberto",
        "senha": "senhaRoberto1", "papeis": ["ELETRICISTA"], "pin": "5566", "telegram_user_id": "987654322"
    }, headers=headers)
    assert criado.status_code == 201
    usuario_id = criado.json()["id"]

    papeis = await client.put(f"/api/v1/usuarios/{usuario_id}/papeis", json={"papeis": ["ELETRICISTA", "BALCONISTA"]}, headers=headers)
    assert sorted(papeis.json()["papeis"]) == ["BALCONISTA", "ELETRICISTA"]

    login = await client.post("/api/v1/auth/login", json={"username": "roberto", "password": "senhaRoberto1"})
    assert login.status_code == 200

    assert (await client.patch(f"/api/v1/usuarios/{usuario_id}/status", json={"ativo": False}, headers=headers)).status_code == 200
    assert (await client.post("/api/v1/auth/login", json={"username": "roberto", "password": "senhaRoberto1"})).status_code == 401

    # O administrador não pode se rebaixar nem se desativar (evita perder o acesso de gestão)
    assert (await client.put(f"/api/v1/usuarios/{admin.id}/papeis", json={"papeis": ["BALCONISTA"]}, headers=headers)).status_code == 400
    assert (await client.patch(f"/api/v1/usuarios/{admin.id}/status", json={"ativo": False}, headers=headers)).status_code == 400

    duplicado = await client.post("/api/v1/usuarios", json={
        "nome": "Outro", "email": "roberto@eletrocar.com.br", "senha": "senhaOutro12", "papeis": ["BALCONISTA"]
    }, headers=headers)
    assert duplicado.status_code == 400


async def test_auditoria_registra_ip_e_estado_antes_depois(client: AsyncClient, criar_usuario):
    _, headers = await criar_usuario(Papel.ADMIN)
    await client.post("/api/v1/usuarios", json={
        "nome": "Carlos", "email": "carlos@eletrocar.com.br", "senha": "senhaCarlos1", "papeis": ["BALCONISTA"]
    }, headers=headers)

    logs = (await client.get("/api/v1/auditoria?acao=USUARIO_CRIADO", headers=headers)).json()
    assert len(logs) == 1
    assert logs[0]["ip_address"] == "192.168.1.50"
    assert logs[0]["payload_depois"]["papeis"] == ["BALCONISTA"]
    assert "senhaCarlos1" not in str(logs[0])
