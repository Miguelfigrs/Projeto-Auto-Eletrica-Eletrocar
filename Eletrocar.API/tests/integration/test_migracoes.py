"""
Testes de integração: migrações Alembic alinhadas aos modelos ORM e carga de demonstração.
"""
import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import text
from src.infra.config import settings
from src.infra.database.models import Base
from src.infra.database.inicializacao import aplicar_seed_demo
from tests.integration.conftest import USANDO_POSTGRES


async def test_migracoes_geram_exatamente_o_esquema_dos_modelos(engine_teste):
    def diferencas(conexao):
        contexto = MigrationContext.configure(conexao, opts={"compare_type": True})
        return compare_metadata(contexto, Base.metadata)

    async with engine_teste.connect() as conexao:
        diffs = await conexao.run_sync(diferencas)
    assert diffs == [], f"Modelos e migrações divergentes: {diffs}"


async def test_catalogo_de_papeis_criado_pela_migracao(engine_teste):
    async with engine_teste.connect() as conexao:
        codigos = (await conexao.execute(text("SELECT codigo FROM papeis ORDER BY id"))).scalars().all()
    assert codigos == ["ADMIN", "BALCONISTA", "ELETRICISTA"]


@pytest.mark.skipif(not USANDO_POSTGRES, reason="Carga de demonstração e trigger de auditoria exigem PostgreSQL")
async def test_seed_de_demonstracao_e_auditoria_imutavel_no_postgres(engine_teste, client):
    assert await aplicar_seed_demo(engine_teste, settings.SEED_SQL_PATH) is True

    login = await client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    ordens = (await client.get("/api/v1/ordens-servico", headers=headers)).json()
    assert len(ordens) == 8
    regulador = (await client.get("/api/v1/pecas/barcode/7891049281023", headers=headers)).json()
    assert regulador["estoque_reservado"] == 1  # reservado pela OS em testes elétricos

    async with engine_teste.connect() as conexao:
        with pytest.raises(Exception):
            await conexao.execute(text("UPDATE logs_auditoria SET acao = 'ADULTERADO'"))
