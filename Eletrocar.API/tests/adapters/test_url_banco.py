"""
Testes: a string de conexão entregue pelo Neon/Render vira uma URL asyncpg válida.
"""
import pytest
from src.infra.config import eh_pooler_transacional, normalizar_url_banco
from src.infra.database.session import argumentos_conexao_postgres, criar_engine

NEON = ("postgresql://eletrocar_owner:s3nh4@ep-cool-sky-a1b2c3.sa-east-1.aws.neon.tech/neondb"
        "?sslmode=require&channel_binding=require")


@pytest.mark.parametrize("entrada,esperado", [
    (NEON, "postgresql+asyncpg://eletrocar_owner:s3nh4@ep-cool-sky-a1b2c3.sa-east-1.aws.neon.tech/neondb?ssl=require"),
    ("postgres://u:p@host:5432/db", "postgresql+asyncpg://u:p@host:5432/db"),
    ("postgresql+asyncpg://u:p@postgres:5432/eletrocar_db", "postgresql+asyncpg://u:p@postgres:5432/eletrocar_db"),
    ("postgresql://u:p@h/db?sslmode=verify-full", "postgresql+asyncpg://u:p@h/db?ssl=require"),
    ("postgresql://u:p@h/db?sslmode=disable", "postgresql+asyncpg://u:p@h/db?ssl=disable"),
    ("sqlite+aiosqlite:///tmp/x.db", "sqlite+aiosqlite:///tmp/x.db"),
    ("mysql://u:p@h/db", "mysql://u:p@h/db"),
    ("", ""),
])
def test_normaliza_url_do_provedor(entrada, esperado):
    assert normalizar_url_banco(entrada) == esperado


def test_detecta_pooler_transacional():
    assert eh_pooler_transacional("postgresql+asyncpg://u:p@ep-x-pooler.sa-east-1.aws.neon.tech/db?ssl=require")
    assert eh_pooler_transacional("postgresql+asyncpg://u:p@h/db?pgbouncer=true")
    assert not eh_pooler_transacional(normalizar_url_banco(NEON))


def test_engine_do_pooler_desliga_cache_de_prepared_statements():
    pooler = NEON.replace("ep-cool-sky-a1b2c3", "ep-cool-sky-a1b2c3-pooler")
    args = argumentos_conexao_postgres(normalizar_url_banco(pooler))
    assert args["statement_cache_size"] == 0
    assert args["prepared_statement_cache_size"] == 0
    assert args["prepared_statement_name_func"]().startswith("__asyncpg_")
    assert argumentos_conexao_postgres(normalizar_url_banco(NEON)) == {}

    engine = criar_engine(pooler)  # aceita a URL crua do provedor
    try:
        assert engine.url.drivername == "postgresql+asyncpg"
        assert engine.url.query["ssl"] == "require"
    finally:
        engine.sync_engine.dispose()


def test_producao_recusa_sqlite(monkeypatch):
    from src.infra.config import Settings
    config = Settings()
    monkeypatch.setattr(config, "AMBIENTE", "producao")
    monkeypatch.setattr(config, "DATABASE_URL", "sqlite+aiosqlite:///x.db")
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        config.validar()
