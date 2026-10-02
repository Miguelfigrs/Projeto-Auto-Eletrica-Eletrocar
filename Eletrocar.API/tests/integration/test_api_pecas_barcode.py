"""
Testes de integração: Leitor de Código de Barras USB/BT e Catálogo de Peças.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
import uuid
from src.domain.entities.peca import Peca
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Role
from src.infra.security.security import TokenService, BcryptPasswordHasher
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy


@pytest.mark.asyncio
async def test_leitura_codigo_barras_usb_bluetooth(client: AsyncClient, db_session: AsyncSession):
    peca_repo = PecaRepositorySQLAlchemy(db_session)
    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7898887776665",
        sku="BOSCH-REG-99",
        descricao="Regulador Alternador Gol G5",
        preco_custo=Decimal("80.00"),
        preco_venda=Decimal("150.00"),
        estoque_atual=8,
        estoque_minimo=2
    )
    await peca_repo.salvar(peca)
    await db_session.commit()

    # O leitor de código de barras faz GET direto pelo código lido
    res = await client.get(f"/api/v1/pecas/barcode/7898887776665")
    assert res.status_code == 200
    data = res.json()
    assert data["codigo_barras"] == "7898887776665"
    assert data["descricao"] == "Regulador Alternador Gol G5"
    assert float(data["preco_venda"]) == 150.00


@pytest.mark.asyncio
async def test_cadastrar_e_buscar_peca(client: AsyncClient, db_session: AsyncSession):
    # Gera token de admin
    user_repo = UsuarioRepositorySQLAlchemy(db_session)
    hasher = BcryptPasswordHasher()
    admin = Usuario(
        id=uuid.uuid4(),
        nome="Admin Pecas",
        email="admin_pecas@eletrocar.com.br",
        senha_hash=hasher.hash("senha"),
        role=Role.ADMIN
    )
    await user_repo.salvar(admin)
    await db_session.commit()

    token = TokenService.criar_access_token({"sub": str(admin.id), "role": "ADMIN"})
    headers = {"Authorization": f"Bearer {token}"}

    # Cadastro
    res_cad = await client.post("/api/v1/pecas", json={
        "codigo_barras": "7891234567890",
        "sku": "LAMP-OSRAM-H4",
        "descricao": "Lâmpada Super Branca Osram H4",
        "preco_custo": "25.00",
        "preco_venda": "45.00",
        "estoque_atual": 20,
        "estoque_minimo": 5,
        "unidade_medida": "UN"
    }, headers=headers)
    assert res_cad.status_code == 201

    # Busca por termo
    res_search = await client.get("/api/v1/pecas/search?q=Osram")
    assert res_search.status_code == 200
    itens = res_search.json()
    assert len(itens) >= 1
    assert itens[0]["sku"] == "LAMP-OSRAM-H4"
