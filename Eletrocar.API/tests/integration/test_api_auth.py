"""
Testes de integração: Autenticação, Login e Troca rápida de Operador via PIN.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Role
from src.infra.security.security import BcryptPasswordHasher
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"


@pytest.mark.asyncio
async def test_login_sucesso_e_troca_pin(client: AsyncClient, db_session: AsyncSession):
    # Setup de usuário de teste
    user_repo = UsuarioRepositorySQLAlchemy(db_session)
    hasher = BcryptPasswordHasher()
    usuario_id = uuid.uuid4()
    usuario = Usuario(
        id=usuario_id,
        nome="Operador Teste",
        email="operador@eletrocar.com.br",
        senha_hash=hasher.hash("senhaSegura123"),
        role=Role.BALCAO,
        pin_caixa="2468"
    )
    await user_repo.salvar(usuario)
    await db_session.commit()

    # 1. Login com credenciais válidas
    res_login = await client.post("/api/v1/auth/login", json={
        "email": "operador@eletrocar.com.br",
        "senha": "senhaSegura123"
    })
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 2. Consulta de perfil do usuário logado via header Bearer
    res_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["email"] == "operador@eletrocar.com.br"
    assert me_data["role"] == "BALCAO"

    # 3. Troca rápida de operador por PIN no caixa
    res_pin = await client.post("/api/v1/auth/pin-switch", json={
        "usuario_id": str(usuario_id),
        "pin": "2468"
    })
    assert res_pin.status_code == 200
    pin_data = res_pin.json()
    assert "access_token" in pin_data


@pytest.mark.asyncio
async def test_login_senha_invalida(client: AsyncClient):
    res = await client.post("/api/v1/auth/login", json={
        "email": "admin@inexistente.com",
        "senha": "123"
    })
    assert res.status_code == 401
