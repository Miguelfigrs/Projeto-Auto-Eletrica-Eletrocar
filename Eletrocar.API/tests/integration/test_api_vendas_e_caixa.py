"""
Testes de integração: PDV Rápido, Vendas no Balcão, Caixa Diário e DRE.
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
async def test_fluxo_completo_venda_caixa_e_fechamento_cego(client: AsyncClient, db_session: AsyncSession):
    # Setup de operador e token
    user_repo = UsuarioRepositorySQLAlchemy(db_session)
    hasher = BcryptPasswordHasher()
    operador = Usuario(
        id=uuid.uuid4(),
        nome="Balconista Caixa",
        email="caixa@eletrocar.com.br",
        senha_hash=hasher.hash("senha"),
        role=Role.BALCAO,
        pin_caixa="1111"
    )
    await user_repo.salvar(operador)

    # Setup de peça
    peca_repo = PecaRepositorySQLAlchemy(db_session)
    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7890001112223",
        sku="RELE-AUX-12V",
        descricao="Relé Auxiliar de Partida 12V 40A",
        preco_custo=Decimal("15.00"),
        preco_venda=Decimal("35.00"),
        estoque_atual=10,
        estoque_minimo=2
    )
    await peca_repo.salvar(peca)
    await db_session.commit()

    token = TokenService.criar_access_token({"sub": str(operador.id), "role": "BALCAO"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Abertura do Caixa Diário com R$ 100,00 de troco
    res_abrir = await client.post("/api/v1/caixa/abrir", json={"saldo_inicial": "100.00"}, headers=headers)
    assert res_abrir.status_code == 201

    # 2. Realização de venda no balcão de 3 relés
    res_venda = await client.post("/api/v1/vendas", json={
        "itens": [
            {"peca_id": str(peca.id), "quantidade": 3}
        ],
        "desconto": "5.00",
        "forma_pagamento": "DINHEIRO"
    }, headers=headers)
    assert res_venda.status_code == 201
    venda_data = res_venda.json()
    assert float(venda_data["valor_total"]) == 100.00 # (3 * 35) - 5 = 100.00

    # 3. Consulta de status do caixa: 100 inicial + 100 da venda = 200 teórico
    res_status = await client.get("/api/v1/caixa/status", headers=headers)
    assert res_status.status_code == 200
    caixa_info = res_status.json()
    assert float(caixa_info["saldo_teorico"]) == 200.00

    # 4. Fechamento cego de caixa: operador informa que contou R$ 200,00 em dinheiro físico
    res_fechar = await client.post("/api/v1/caixa/fechamento-cego", json={
        "valores_contados": {"DINHEIRO": "200.00"}
    }, headers=headers)
    assert res_fechar.status_code == 200
    fechamento_data = res_fechar.json()
    assert fechamento_data["quebra_ou_sobra"] == "CORRETO"
    assert float(fechamento_data["diferenca_total"]) == 0.00
