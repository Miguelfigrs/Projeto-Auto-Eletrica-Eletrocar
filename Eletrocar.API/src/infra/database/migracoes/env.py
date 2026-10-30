"""
Ambiente Alembic assíncrono (asyncpg / aiosqlite).
"""
import asyncio
from logging.config import fileConfig
from alembic import context
from sqlalchemy.engine import Connection
from src.infra.config import settings
from src.infra.database.models import Base
from src.infra.database.session import criar_engine

config = context.config
if config.config_file_name is not None and config.attributes.get("configurar_log", True):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def _url() -> str:
    return config.get_main_option("sqlalchemy.url") or settings.DATABASE_URL


def run_migrations_offline() -> None:
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True,
                      dialect_opts={"paramstyle": "named"}, render_as_batch=_url().startswith("sqlite"))
    with context.begin_transaction():
        context.run_migrations()


def _executar(conexao: Connection) -> None:
    context.configure(connection=conexao, target_metadata=target_metadata,
                      render_as_batch=conexao.dialect.name == "sqlite", compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = criar_engine(_url())
    async with engine.connect() as conexao:
        await conexao.run_sync(_executar)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
