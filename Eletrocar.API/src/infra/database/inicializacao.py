"""
Inicialização do banco na subida da API:
1. migrações Alembic (esquema versionado);
2. carga de demonstração (somente com SEED_DADOS_DEMO=true, PostgreSQL e banco sem usuários);
3. administrador inicial a partir de ADMIN_EMAIL/ADMIN_SENHA_INICIAL quando ainda não há usuários.
"""
import logging
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker
from src.infra.config import Settings
from src.infra.database.models import UsuarioModel
from src.infra.database.migracoes_runner import executar_migracoes
from src.infra.security.security import BcryptPasswordHasher
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.application.use_cases.inicializar_administrador_use_case import InicializarAdministradorUseCase

logger = logging.getLogger("eletrocar.inicializacao")


async def aplicar_seed_demo(engine: AsyncEngine, caminho: Path) -> bool:
    if engine.dialect.name != "postgresql":
        logger.warning("Carga de demonstração disponível apenas para PostgreSQL.")
        return False
    if not caminho.exists():
        logger.warning("Arquivo de carga de demonstração não encontrado: %s", caminho)
        return False
    async with engine.connect() as conexao:
        total = (await conexao.execute(select(func.count(UsuarioModel.id)))).scalar_one()
        await conexao.rollback()
        if total > 0:
            return False
        bruta = await conexao.get_raw_connection()
        # Protocolo simples do PostgreSQL: o script inteiro roda em uma única transação implícita
        await bruta.driver_connection.execute(caminho.read_text(encoding="utf-8"))
    logger.info("Carga de demonstração aplicada (%s).", caminho.name)
    return True


async def inicializar_banco(engine: AsyncEngine, fabrica: async_sessionmaker, config: Settings) -> None:
    config.validar()
    if config.MIGRAR_NA_INICIALIZACAO:
        await executar_migracoes(config.DATABASE_URL)
    if config.SEED_DADOS_DEMO:
        await aplicar_seed_demo(engine, config.SEED_SQL_PATH)

    async with fabrica() as session:
        criado = await InicializarAdministradorUseCase(
            UsuarioRepositorySQLAlchemy(session), BcryptPasswordHasher(config.BCRYPT_CUSTO)
        ).executar(config.ADMIN_NOME, config.ADMIN_EMAIL, config.ADMIN_SENHA_INICIAL, config.ADMIN_USERNAME or None)
        await session.commit()
        if criado:
            logger.warning("Administrador inicial criado para %s. Altere a senha no primeiro acesso.", config.ADMIN_EMAIL)
