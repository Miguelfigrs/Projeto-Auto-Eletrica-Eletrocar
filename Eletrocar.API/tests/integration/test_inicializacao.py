"""
Testes de integração: inicialização do banco (administrador inicial) e validação de configuração de produção.
"""
from types import SimpleNamespace
import pytest
from src.infra.config import Settings
from src.infra.database.inicializacao import inicializar_banco, aplicar_seed_demo
from tests.integration.conftest import USANDO_POSTGRES


def _config(**extra) -> SimpleNamespace:
    dados = dict(
        validar=lambda: None, MIGRAR_NA_INICIALIZACAO=False, SEED_DADOS_DEMO=False, BCRYPT_CUSTO=4,
        ADMIN_NOME="Dono da Oficina", ADMIN_EMAIL="dono@eletrocar.com.br", ADMIN_USERNAME="dono",
        ADMIN_SENHA_INICIAL="senhaInicial123", DATABASE_URL="", SEED_SQL_PATH=None,
    )
    dados.update(extra)
    return SimpleNamespace(**dados)


async def test_administrador_inicial_criado_uma_unica_vez_com_os_tres_papeis(engine_teste, fabrica_teste, client):
    await inicializar_banco(engine_teste, fabrica_teste, _config())
    await inicializar_banco(engine_teste, fabrica_teste, _config(ADMIN_EMAIL="outro@eletrocar.com.br"))

    login = await client.post("/api/v1/auth/login", json={"username": "dono", "password": "senhaInicial123"})
    assert login.status_code == 200
    assert sorted(login.json()["usuario"]["papeis"]) == ["ADMIN", "BALCONISTA", "ELETRICISTA"]
    assert (await client.post("/api/v1/auth/login", json={"email": "outro@eletrocar.com.br", "senha": "senhaInicial123"})).status_code == 401


async def test_sem_variaveis_de_admin_nenhum_usuario_e_criado(engine_teste, fabrica_teste, client):
    await inicializar_banco(engine_teste, fabrica_teste, _config(ADMIN_EMAIL="", ADMIN_SENHA_INICIAL=""))
    assert (await client.post("/api/v1/auth/login", json={"username": "dono", "password": "senhaInicial123"})).status_code == 401


@pytest.mark.skipif(USANDO_POSTGRES, reason="Comportamento específico do SQLite")
async def test_seed_demo_ignorado_fora_do_postgres(engine_teste, tmp_path):
    assert await aplicar_seed_demo(engine_teste, tmp_path / "inexistente.sql") is False


def test_configuracao_de_producao_recusa_segredos_de_desenvolvimento():
    config = Settings()
    config.SECRET_KEY, config.CORS_ORIGINS, config.BCRYPT_CUSTO, config.SEED_DADOS_DEMO = "curta", ["*"], 4, True
    config.AMBIENTE = "producao"
    with pytest.raises(RuntimeError) as erro:
        config.validar()
    for trecho in ("SECRET_KEY", "CORS_ORIGINS", "BCRYPT_CUSTO", "SEED_DADOS_DEMO"):
        assert trecho in str(erro.value)


def test_configuracao_de_desenvolvimento_nao_bloqueia():
    config = Settings()
    config.AMBIENTE = "desenvolvimento"
    config.validar()
