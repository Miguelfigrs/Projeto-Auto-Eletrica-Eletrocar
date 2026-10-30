"""
Fixtures dos testes de integração (API HTTP + repositórios SQLAlchemy).
O banco de teste é criado pelas MIGRAÇÕES ALEMBIC reais (garante que esquema e modelos estão alinhados).
Por padrão usa SQLite temporário; com TEST_POSTGRES_URL definido roda contra o PostgreSQL 16.
"""
import os
import tempfile
from pathlib import Path
from typing import Tuple
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from src.infra.database.session import criar_engine, criar_fabrica_sessoes, get_db_session, get_fabrica_sessoes
from src.infra.database.migracoes_runner import migrar_para_ultima_versao
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.adapters.controllers.dependencies import get_limitador, get_token_service, get_password_hasher
from src.main import app

TEST_POSTGRES_URL = os.getenv("TEST_POSTGRES_URL")
_TMP_DIR = Path(tempfile.mkdtemp(prefix="eletrocar_testes_"))
TEST_DATABASE_URL = TEST_POSTGRES_URL or f"sqlite+aiosqlite:///{(_TMP_DIR / 'teste.db').as_posix()}"
USANDO_POSTGRES = TEST_DATABASE_URL.startswith("postgresql")

TABELAS_DADOS = [
    "logs_auditoria", "titulos_financeiros", "cobrancas_pix", "movimentacoes_caixa", "caixas_diario",
    "itens_venda", "vendas_balcao", "itens_os", "servicos_os", "ordens_servico", "carros", "clientes",
    "pecas", "sessoes_refresh", "usuarios_papeis", "usuarios", "contadores_sequenciais",
]


@pytest.fixture(scope="session")
def banco_migrado() -> str:
    migrar_para_ultima_versao(TEST_DATABASE_URL)
    return TEST_DATABASE_URL


@pytest.fixture(scope="session")
async def engine_teste(banco_migrado):
    engine = criar_engine(banco_migrado)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
def fabrica_teste(engine_teste):
    return criar_fabrica_sessoes(engine_teste)


@pytest.fixture(autouse=True)
async def banco_limpo(engine_teste):
    """Isola os testes: limpa os dados (mantendo o catálogo de papéis) e zera o limitador de tentativas."""
    async with engine_teste.begin() as conexao:
        if USANDO_POSTGRES:
            await conexao.execute(text("ALTER TABLE logs_auditoria DISABLE TRIGGER trg_auditoria_imutavel"))
        for tabela in TABELAS_DADOS:
            await conexao.execute(text(f"DELETE FROM {tabela}"))
        if USANDO_POSTGRES:
            await conexao.execute(text("ALTER TABLE logs_auditoria ENABLE TRIGGER trg_auditoria_imutavel"))
    get_limitador().resetar()
    yield


@pytest.fixture
async def db_session(fabrica_teste):
    async with fabrica_teste() as session:
        yield session
        await session.commit()


@pytest.fixture
async def client(fabrica_teste):
    async def override_get_db():
        async with fabrica_teste() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = override_get_db
    app.dependency_overrides[get_fabrica_sessoes] = lambda: fabrica_teste
    transport = ASGITransport(app=app, client=("192.168.1.50", 50000))
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def criar_usuario(fabrica_teste):
    """Cria usuário persistido e retorna (usuario, headers com Bearer token)."""
    async def _criar(*papeis: Papel, senha: str = "senhaForte123", pin: str = None, telegram: str = None,
                     username: str = None, email: str = None) -> Tuple[Usuario, dict]:
        hasher = get_password_hasher()
        usuario = Usuario(
            id=uuid.uuid4(),
            nome=f"Usuário {'/'.join(p.value for p in papeis)}",
            email=email or f"{uuid.uuid4().hex[:10]}@eletrocar.com.br",
            username=username,
            senha_hash=hasher.hash(senha),
            papeis=set(papeis),
            pin_hash=hasher.hash(pin) if pin else None,
            telegram_user_id=telegram,
        )
        async with fabrica_teste() as session:
            await UsuarioRepositorySQLAlchemy(session).salvar(usuario)
            await session.commit()
        token = get_token_service().criar_access_token(usuario.id, usuario.nome, [p.value for p in usuario.papeis])
        return usuario, {"Authorization": f"Bearer {token}"}
    return _criar
