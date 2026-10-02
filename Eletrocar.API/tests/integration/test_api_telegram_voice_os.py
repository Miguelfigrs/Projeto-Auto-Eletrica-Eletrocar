"""
Testes de integração: Webhook do Telegram Voice Bot e Ciclo de Vida da OS.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.entities.peca import Peca
from src.domain.value_objects.enums import Role
from src.infra.security.security import TokenService, BcryptPasswordHasher
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy


@pytest.mark.asyncio
async def test_pipeline_telegram_voice_e_ciclo_os(client: AsyncClient, db_session: AsyncSession):
    # Setup de eletricista com Telegram User ID 123456
    user_repo = UsuarioRepositorySQLAlchemy(db_session)
    hasher = BcryptPasswordHasher()
    eletricista = Usuario(
        id=uuid.uuid4(),
        nome="José Auto Elétrica",
        email="jose@eletrocar.com.br",
        senha_hash=hasher.hash("senha"),
        role=Role.ELETRICISTA,
        telegram_user_id="123456"
    )
    await user_repo.salvar(eletricista)

    # Setup de peça em estoque
    peca_repo = PecaRepositorySQLAlchemy(db_session)
    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7897778889991",
        sku="BOSCH-REG-GOL",
        descricao="Regulador Bosch 14V Gol",
        preco_custo=Decimal("70.00"),
        preco_venda=Decimal("130.00"),
        estoque_atual=5,
        estoque_minimo=1
    )
    await peca_repo.salvar(peca)
    await db_session.commit()

    # 1. Eletricista envia áudio pelo Telegram (Webhook)
    res_webhook = await client.post("/api/v1/telegram/webhook", json={
        "telegram_user_id": "123456",
        "nome_cliente": "Fernando Mendes",
        "carro_modelo": "Fiat Uno Mille",
        "carro_marca": "Fiat",
        "carro_placa": "UNO1A23",
        "sintomas_relatados": "Motor de partida pesado de manhã e bateria descarrega",
        "hipotese_diagnostica": "Escovas do motor de arranque gastas e fuga de corrente",
        "checklist_eletrico": {
            "bateria": "12.2V em repouso",
            "alternador": "carregando a 13.8V",
            "motor_partida": "escovas com desgaste excessivo"
        }
    })
    assert res_webhook.status_code == 200
    webhook_data = res_webhook.json()
    assert webhook_data["ok"] is True
    os_info = webhook_data["os"]
    os_id = os_info["id"]
    assert os_info["status"] == "TRIAGEM"
    assert os_info["origem"] == "TELEGRAM_VOICE"

    # Token para operações de balcão
    token = TokenService.criar_access_token({"sub": str(eletricista.id), "role": "ELETRICISTA"})
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Transição de Triagem para Orçamento Pendente
    res_trans1 = await client.patch(f"/api/v1/ordens-servico/{os_id}/status", json={
        "novo_status": "ORCAMENTO_PENDENTE"
    }, headers=headers)
    assert res_trans1.status_code == 200
    assert res_trans1.json()["status"] == "ORCAMENTO_PENDENTE"

    # 3. Adicionar mão de obra e alocar peça
    res_srv = await client.post(f"/api/v1/ordens-servico/{os_id}/servicos", json={
        "descricao": "Mão de obra de revisão do motor de arranque",
        "valor": "120.00",
        "eletricista_id": str(eletricista.id)
    }, headers=headers)
    assert res_srv.status_code == 200

    res_peca = await client.post(f"/api/v1/ordens-servico/{os_id}/pecas", json={
        "peca_id": str(peca.id),
        "quantidade": 1
    }, headers=headers)
    assert res_peca.status_code == 200
    os_com_peca = res_peca.json()
    assert float(os_com_peca["valor_total"]) == 250.00 # 120 + 130 = 250

    # 4. Transição para APROVADO e depois EM_EXECUCAO
    await client.patch(f"/api/v1/ordens-servico/{os_id}/status", json={"novo_status": "APROVADO"}, headers=headers)
    res_exec = await client.patch(f"/api/v1/ordens-servico/{os_id}/status", json={"novo_status": "EM_EXECUCAO"}, headers=headers)
    assert res_exec.status_code == 200
    assert res_exec.json()["status"] == "EM_EXECUCAO"
