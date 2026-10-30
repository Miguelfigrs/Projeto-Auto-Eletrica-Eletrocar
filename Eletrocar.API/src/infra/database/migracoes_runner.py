"""
Execução programática das migrações Alembic (usada na inicialização da API e nos testes).
"""
import asyncio
from pathlib import Path
from alembic import command
from alembic.config import Config

API_DIR = Path(__file__).resolve().parents[3]


def configuracao_alembic(url: str) -> Config:
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_DIR / "src" / "infra" / "database" / "migracoes"))
    cfg.set_main_option("sqlalchemy.url", url)
    cfg.attributes["configurar_log"] = False
    return cfg


def migrar_para_ultima_versao(url: str) -> None:
    command.upgrade(configuracao_alembic(url), "head")


async def executar_migracoes(url: str) -> None:
    # O env.py usa asyncio.run: executa em outra thread para não conflitar com o loop do FastAPI
    await asyncio.to_thread(migrar_para_ultima_versao, url)
