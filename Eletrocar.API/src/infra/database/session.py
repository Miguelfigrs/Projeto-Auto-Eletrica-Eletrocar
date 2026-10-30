"""
Gerenciamento assíncrono de sessões com o banco de dados (SQLAlchemy 2.0).
Cada requisição HTTP roda em uma única transação: commit ao final ou rollback em qualquer erro (ACID).
PostgreSQL 16 (asyncpg) em produção/Docker; SQLite assíncrono apenas em desenvolvimento leve e testes.
"""
from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from src.infra.config import settings


def criar_engine(url: str) -> AsyncEngine:
    if url.startswith("sqlite"):
        engine = create_async_engine(url, future=True, connect_args={"timeout": 15})
        _habilitar_integridade_sqlite(engine.sync_engine)
        return engine
    # READ COMMITTED (padrão do PostgreSQL) + SELECT ... FOR UPDATE nas linhas de estoque
    return create_async_engine(url, future=True, pool_pre_ping=True, pool_recycle=300, pool_size=10, max_overflow=10)


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
