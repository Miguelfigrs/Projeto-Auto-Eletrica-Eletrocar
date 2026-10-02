"""
Gerenciamento assíncrono de sessões e conexões com o banco de dados SQLAlchemy.
Suporte híbrido: SQLite assíncrono (dev/testes rápidos) e PostgreSQL 16 (produção).
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.infra.config import settings
from src.infra.database.models import Base

# Garante a existência do diretório externo se for SQLite
if "sqlite" in settings.DATABASE_URL:
    try:
        settings.DATABASE_MODULE_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

# Engine assíncrono SQLAlchemy
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

# Fabrica de sessões assíncronas
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


async def init_db():
    """Inicializa as tabelas do banco de dados na inicialização da aplicação."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection para FastAPI controllers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
