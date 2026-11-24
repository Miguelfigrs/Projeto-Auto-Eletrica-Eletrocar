"""
Gerenciamento assíncrono de sessões com o banco de dados (SQLAlchemy 2.0).
Cada requisição HTTP roda em uma única transação: commit ao final ou rollback em qualquer erro (ACID).
PostgreSQL 16 (asyncpg) em produção/Docker; SQLite assíncrono apenas em desenvolvimento leve e testes.
"""
from typing import AsyncGenerator
import uuid
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from src.infra.config import eh_pooler_transacional, normalizar_url_banco, settings


def argumentos_conexao_postgres(url: str) -> dict:
    """Pooler em modo transação (Neon "-pooler"/PgBouncer): sem cache de prepared statements no asyncpg."""
    if not eh_pooler_transacional(url):
        return {}
    return {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",
    }


def criar_engine(url: str) -> AsyncEngine:
    url = normalizar_url_banco(url)
    if url.startswith("sqlite"):
        engine = create_async_engine(url, future=True, connect_args={"timeout": 15})
        _habilitar_integridade_sqlite(engine.sync_engine)
        return engine
    connect_args = argumentos_conexao_postgres(url)
    # READ COMMITTED (padrão do PostgreSQL) + SELECT ... FOR UPDATE nas linhas de estoque.
    # pool_pre_ping/pool_recycle: o Neon suspende o banco ocioso e encerra conexões antigas.
    return create_async_engine(
        url, future=True, pool_pre_ping=True, pool_recycle=300,
        pool_size=settings.DB_POOL_SIZE, max_overflow=settings.DB_MAX_OVERFLOW, connect_args=connect_args,
    )


def _habilitar_integridade_sqlite(engine: Engine):
    @event.listens_for(engine, "connect")
    def _pragmas(conexao, _):
        cursor = conexao.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


def criar_fabrica_sessoes(engine: AsyncEngine) -> async_sessionmaker:
    return async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)


if settings.DATABASE_URL.startswith("sqlite"):
    settings.DATABASE_MODULE_DIR.mkdir(parents=True, exist_ok=True)

engine = criar_engine(settings.DATABASE_URL)
AsyncSessionLocal = criar_fabrica_sessoes(engine)


def get_fabrica_sessoes() -> async_sessionmaker:
    """Fábrica de sessões curtas (ex.: autenticação do WebSocket), substituível nos testes."""
    return AsyncSessionLocal


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection para os controllers: uma transação por requisição."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
