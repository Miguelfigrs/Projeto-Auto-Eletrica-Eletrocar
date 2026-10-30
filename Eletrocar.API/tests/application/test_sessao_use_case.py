"""
Teste do Use Case: GerenciarSessaoUseCase (TDD).
Access token + refresh token com rotação e detecção de reuso de token revogado.
"""
import pytest
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException
from src.application.use_cases.gerenciar_sessao_use_case import GerenciarSessaoUseCase
from tests.fakes.fake_repositories import FakeUsuarioRepository, FakeSessaoRepository
from tests.fakes.fake_servicos import FakeTokenService


async def _cenario():
    usuario_repo = FakeUsuarioRepository()
    sessao_repo = FakeSessaoRepository()
    usuario = Usuario(
        id=uuid.uuid4(), nome="Juliana", email="juliana@eletrocar.com.br",
        senha_hash="x", papeis={Papel.BALCONISTA}
    )
    await usuario_repo.salvar(usuario)
    use_case = GerenciarSessaoUseCase(usuario_repo, sessao_repo, FakeTokenService(), validade_refresh_dias=7)
    return use_case, usuario, sessao_repo


@pytest.mark.asyncio
async def test_iniciar_sessao_emite_access_e_refresh():
    use_case, usuario, sessao_repo = await _cenario()
    tokens = await use_case.iniciar(usuario.id)

    assert tokens.access_token.startswith("access|")
    assert "BALCONISTA" in tokens.access_token
    assert tokens.refresh_token.startswith("refresh|")
    assert tokens.usuario.id == usuario.id
    assert len(sessao_repo.sessoes) == 1


@pytest.mark.asyncio
async def test_renovar_rotaciona_refresh_token():
    use_case, usuario, sessao_repo = await _cenario()
    primeira = await use_case.iniciar(usuario.id)

    segunda = await use_case.renovar(primeira.refresh_token)

    assert segunda.refresh_token != primeira.refresh_token
    antiga = [s for s in sessao_repo.sessoes.values() if s.revogada_em is not None]
    assert len(antiga) == 1


@pytest.mark.asyncio
async def test_reuso_de_refresh_revogado_derruba_todas_as_sessoes():
    use_case, usuario, sessao_repo = await _cenario()
    primeira = await use_case.iniciar(usuario.id)
    segunda = await use_case.renovar(primeira.refresh_token)

    with pytest.raises(CredenciaisInvalidasException):
        await use_case.renovar(primeira.refresh_token)

    # A sessão legítima também foi revogada por segurança
    with pytest.raises(CredenciaisInvalidasException):
        await use_case.renovar(segunda.refresh_token)
    assert all(s.revogada_em is not None for s in sessao_repo.sessoes.values())


@pytest.mark.asyncio
async def test_logout_revoga_refresh():
    use_case, usuario, _ = await _cenario()
    tokens = await use_case.iniciar(usuario.id)
    await use_case.encerrar(tokens.refresh_token)
    with pytest.raises(CredenciaisInvalidasException):
        await use_case.renovar(tokens.refresh_token)


@pytest.mark.asyncio
async def test_renovacao_negada_para_usuario_desativado():
    use_case, usuario, _ = await _cenario()
    tokens = await use_case.iniciar(usuario.id)
    usuario.desativar()
    with pytest.raises(CredenciaisInvalidasException):
        await use_case.renovar(tokens.refresh_token)
