"""
Teste do Use Case: GerenciarUsuariosUseCase (TDD).
Criação, edição, papéis, ativação/desativação, redefinição de senha e PIN — tudo auditado.
"""
import pytest
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.application.dtos.auth_dtos import CriarUsuarioInputDTO, AtualizarUsuarioInputDTO
from src.application.use_cases.gerenciar_usuarios_use_case import GerenciarUsuariosUseCase
from tests.fakes.fake_repositories import FakeUsuarioRepository, FakeAuditoriaRepository
from tests.fakes.fake_servicos import FakePasswordHasher


async def _cenario():
    repo = FakeUsuarioRepository()
    audit = FakeAuditoriaRepository()
    hasher = FakePasswordHasher()
    admin = Usuario(id=uuid.uuid4(), nome="Admin", email="admin@eletrocar.com.br",
                    senha_hash="x", papeis={Papel.ADMIN})
    await repo.salvar(admin)
    return GerenciarUsuariosUseCase(repo, hasher, audit), repo, audit, admin


def _novo(**kwargs) -> CriarUsuarioInputDTO:
    dados = dict(
        nome="Roberto Eletro", email="roberto@eletrocar.com.br", senha="senhaForte1",
        papeis=["ELETRICISTA"], username="roberto", pin="5566", telegram_user_id="987654322"
    )
    dados.update(kwargs)
    return CriarUsuarioInputDTO(**dados)


@pytest.mark.asyncio
async def test_criar_usuario_com_senha_e_pin_em_hash():
    use_case, repo, audit, admin = await _cenario()

    criado = await use_case.criar(_novo(), executor_id=admin.id)

    salvo = await repo.buscar_por_id(criado.id)
    assert salvo.senha_hash == "hashed_senhaForte1"
    assert salvo.pin_hash == "hashed_5566"
    assert criado.papeis == ["ELETRICISTA"]
    assert "USUARIO_CRIADO" in audit.acoes()
    # Segredos nunca aparecem no log de auditoria
    assert "senhaForte1" not in str(audit.logs[-1])


@pytest.mark.asyncio
async def test_nao_permite_email_username_ou_telegram_duplicado():
    use_case, _, _, admin = await _cenario()
    await use_case.criar(_novo(), executor_id=admin.id)
    for duplicado in (
        _novo(username="outro", telegram_user_id=None),
        _novo(email="outro@eletrocar.com.br", telegram_user_id=None),
        _novo(email="outro@eletrocar.com.br", username="outro"),
    ):
        with pytest.raises(RegraNegocioException):
            await use_case.criar(duplicado, executor_id=admin.id)


@pytest.mark.asyncio
async def test_senha_curta_e_rejeitada():
    use_case, _, _, admin = await _cenario()
    with pytest.raises(RegraNegocioException):
        await use_case.criar(_novo(senha="123"), executor_id=admin.id)


@pytest.mark.asyncio
async def test_definir_papeis_e_registrar_antes_depois():
    use_case, _, audit, admin = await _cenario()
    criado = await use_case.criar(_novo(), executor_id=admin.id)

    atualizado = await use_case.definir_papeis(criado.id, ["ELETRICISTA", "BALCONISTA"], executor_id=admin.id)

    assert set(atualizado.papeis) == {"ELETRICISTA", "BALCONISTA"}
    log = audit.logs[-1]
    assert log.acao == "USUARIO_PAPEIS_ALTERADOS"
    assert log.payload_antes == {"papeis": ["ELETRICISTA"]}
    assert log.payload_depois == {"papeis": ["BALCONISTA", "ELETRICISTA"]}


@pytest.mark.asyncio
async def test_admin_nao_pode_remover_o_proprio_papel_admin_nem_se_desativar():
    use_case, _, _, admin = await _cenario()
    with pytest.raises(RegraNegocioException):
        await use_case.definir_papeis(admin.id, ["BALCONISTA"], executor_id=admin.id)
    with pytest.raises(RegraNegocioException):
        await use_case.alterar_status(admin.id, ativo=False, executor_id=admin.id)


@pytest.mark.asyncio
async def test_desativar_redefinir_senha_e_pin():
    use_case, repo, audit, admin = await _cenario()
    criado = await use_case.criar(_novo(), executor_id=admin.id)

    await use_case.alterar_status(criado.id, ativo=False, executor_id=admin.id)
    await use_case.redefinir_senha(criado.id, "novaSenha123", executor_id=admin.id)
    await use_case.definir_pin(criado.id, "9090", executor_id=admin.id)

    salvo = await repo.buscar_por_id(criado.id)
    assert salvo.ativo is False
    assert salvo.senha_hash == "hashed_novaSenha123"
    assert salvo.pin_hash == "hashed_9090"
    assert {"USUARIO_DESATIVADO", "USUARIO_SENHA_REDEFINIDA", "USUARIO_PIN_DEFINIDO"} <= set(audit.acoes())


@pytest.mark.asyncio
async def test_atualizar_dados_cadastrais():
    use_case, _, _, admin = await _cenario()
    criado = await use_case.criar(_novo(), executor_id=admin.id)
    atualizado = await use_case.atualizar(
        AtualizarUsuarioInputDTO(usuario_id=criado.id, nome="Roberto Sênior", telegram_user_id="111"),
        executor_id=admin.id
    )
    assert atualizado.nome == "Roberto Sênior"
    assert atualizado.telegram_user_id == "111"
