"""
Testes de integração: Autenticação, sessão com refresh rotativo, força bruta e troca de operador por PIN.
"""
import pytest
from httpx import AsyncClient
from src.domain.value_objects.enums import Papel


async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


async def test_auth_multi_role_success(client: AsyncClient, criar_usuario):
    await criar_usuario(Papel.ADMIN, Papel.BALCONISTA, Papel.ELETRICISTA,
                        email="dono@eletrocar.com.br", username="dono", senha="senhaDono123")

    res = await client.post("/api/v1/auth/login", json={"username": "dono", "password": "senhaDono123"})

    assert res.status_code == 200
    dados = res.json()
    assert dados["token_type"] == "bearer"
    assert set(dados["usuario"]["papeis"]) == {"ADMIN", "BALCONISTA", "ELETRICISTA"}
    # Redirecionamento automático por perfil: o dono (Admin) cai no Dashboard financeiro
    assert dados["usuario"]["tela_inicial"] == "DASHBOARD_FINANCEIRO"
    assert {"BALCAO_PDV", "FILA_OS", "USUARIOS"} <= set(dados["usuario"]["modulos"])
    assert dados["expira_em_segundos"] > 0
    assert "eletrocar_refresh" in res.cookies
    assert "httponly" in res.headers["set-cookie"].lower()

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {dados['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "dono@eletrocar.com.br"


async def test_login_redireciona_cada_perfil_para_sua_tela(client: AsyncClient, criar_usuario):
    await criar_usuario(Papel.BALCONISTA, username="carlos", senha="senhaCarlos1")
    await criar_usuario(Papel.ELETRICISTA, username="marcio", senha="senhaMarcio1")
    carlos = (await client.post("/api/v1/auth/login", json={"username": "carlos", "password": "senhaCarlos1"})).json()
    marcio = (await client.post("/api/v1/auth/login", json={"username": "marcio", "password": "senhaMarcio1"})).json()
    assert carlos["usuario"]["tela_inicial"] == "BALCAO_PDV"
    assert marcio["usuario"]["tela_inicial"] == "FILA_OS"
    assert "BALCAO_PDV" not in marcio["usuario"]["modulos"]


async def test_login_por_email_e_formulario_oauth2(client: AsyncClient, criar_usuario):
    await criar_usuario(Papel.BALCONISTA, email="carlos@eletrocar.com.br", senha="senhaCarlos1")
    assert (await client.post("/api/v1/auth/login", json={"email": "CARLOS@eletrocar.com.br", "senha": "senhaCarlos1"})).status_code == 200
    form = await client.post("/api/v1/auth/token", data={"username": "carlos@eletrocar.com.br", "password": "senhaCarlos1"})
    assert form.status_code == 200


async def test_login_senha_invalida(client: AsyncClient):
    res = await client.post("/api/v1/auth/login", json={"email": "admin@inexistente.com", "senha": "123"})
    assert res.status_code == 401


async def test_nao_existem_atalhos_de_login_embutidos(client: AsyncClient, criar_usuario):
    await criar_usuario(Papel.ADMIN, email="admin@eletrocar.com.br", username="admin", senha="admin123")
    res = await client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 401


async def test_forca_bruta_bloqueia_login_com_429(client: AsyncClient, criar_usuario):
    await criar_usuario(Papel.BALCONISTA, username="juliana", senha="senhaJuliana1")
    for _ in range(5):
        res = await client.post("/api/v1/auth/login", json={"username": "juliana", "password": "errada"})
        assert res.status_code == 401
    bloqueado = await client.post("/api/v1/auth/login", json={"username": "juliana", "password": "senhaJuliana1"})
    assert bloqueado.status_code == 429
    assert int(bloqueado.headers["Retry-After"]) > 0


async def test_refresh_token_rotativo_via_cookie_e_logout(client: AsyncClient, criar_usuario):
    await criar_usuario(Papel.BALCONISTA, username="carlos", senha="senhaCarlos1")
    login = await client.post("/api/v1/auth/login", json={"username": "carlos", "password": "senhaCarlos1"})
    primeiro_refresh = login.json()["refresh_token"]

    renovado = await client.post("/api/v1/auth/refresh")  # usa o cookie HTTP-Only
    assert renovado.status_code == 200
    assert renovado.json()["refresh_token"] != primeiro_refresh

    # Reapresentar o refresh antigo (já rotacionado) derruba a sessão
    reuso = await client.post("/api/v1/auth/refresh", json={"refresh_token": primeiro_refresh})
    assert reuso.status_code == 401
    client.cookies.clear()
    assert (await client.post("/api/v1/auth/refresh", json={"refresh_token": renovado.json()["refresh_token"]})).status_code == 401


async def test_refresh_token_nao_serve_como_access_token(client: AsyncClient, criar_usuario):
    await criar_usuario(Papel.BALCONISTA, username="carlos", senha="senhaCarlos1")
    login = await client.post("/api/v1/auth/login", json={"username": "carlos", "password": "senhaCarlos1"})
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login.json()['refresh_token']}"})
    assert res.status_code == 401


async def test_troca_de_operador_por_pin_exige_terminal_autenticado(client: AsyncClient, criar_usuario):
    juliana, _ = await criar_usuario(Papel.BALCONISTA, pin="3344")
    _, terminal = await criar_usuario(Papel.BALCONISTA, pin="1122")

    sem_sessao = await client.post("/api/v1/auth/pin-switch", json={"usuario_id": str(juliana.id), "pin": "3344"})
    assert sem_sessao.status_code == 401

    troca = await client.post("/api/v1/auth/pin-switch", json={"usuario_id": str(juliana.id), "pin": "3344"}, headers=terminal)
    assert troca.status_code == 200
    assert troca.json()["usuario"]["id"] == str(juliana.id)


async def test_pin_bloqueado_apos_5_erros(client: AsyncClient, criar_usuario):
    juliana, _ = await criar_usuario(Papel.BALCONISTA, pin="3344")
    _, terminal = await criar_usuario(Papel.BALCONISTA)
    for _ in range(5):
        res = await client.post("/api/v1/auth/pin-switch", json={"usuario_id": str(juliana.id), "pin": "0000"}, headers=terminal)
        assert res.status_code == 401
    res = await client.post("/api/v1/auth/pin-switch", json={"usuario_id": str(juliana.id), "pin": "3344"}, headers=terminal)
    assert res.status_code == 429


async def test_websocket_exige_token(client: AsyncClient):
    from fastapi.testclient import TestClient
    from starlette.websockets import WebSocketDisconnect
    from src.main import app
    with pytest.raises(WebSocketDisconnect) as exc:
        with TestClient(app).websocket_connect("/api/v1/ws/notificacoes") as ws:
            ws.receive_text()
    assert exc.value.code == 4401
