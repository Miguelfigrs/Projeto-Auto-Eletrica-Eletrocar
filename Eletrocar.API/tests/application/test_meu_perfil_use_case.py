"""
Testes: "Meu perfil" — o próprio usuário edita nome/e-mail/usuário, troca senha e PIN
(senha e PIN exigem a senha atual, com limite de tentativas).
"""
import uuid
import pytest
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.domain.exceptions.domain_exceptions import (
    CredenciaisInvalidasException, LimiteTentativasExcedidoException, RegraNegocioException,
)
from src.application.use_cases.gerenciar_usuarios_use_case import GerenciarUsuariosUseCase
from tests.fakes.fake_repositories import FakeAuditoriaRepository, FakeUsuarioRepository
from tests.fakes.fake_servicos import FakeLimitadorTentativas, FakePasswordHasher


async def _cenario(com_limitador=True):
    repo, audit = FakeUsuarioRepository(), FakeAuditoriaRepository()
    carlos = Usuario(id=uuid.uuid4(), nome="Carlos", email="carlos@eletrocar.com.br", username="carlos",
                     senha_hash="hashed_senhaAtual1", papeis={Papel.BALCONISTA}, telegram_user_id="123")
    outro = Usuario(id=uuid.uuid4(), nome="Juliana", email="juliana@eletrocar.com.br", username="juliana",
                    senha_hash="x", papeis={Papel.BALCONISTA})
    for u in (carlos, outro):
        await repo.salvar(u)
    limitador = FakeLimitadorTentativas(maximo=3) if com_limitador else None
    uc = GerenciarUsuariosUseCase(repo, FakePasswordHasher(), audit, limitador)
    return uc, repo, audit, carlos


async def test_atualiza_os_proprios_dados_sem_mexer_em_papeis_nem_telegram():
    uc, repo, audit, carlos = await _cenario()

    dto = await uc.atualizar_proprio_perfil(carlos.id, "Carlos Eduardo", "carlos.eduardo@eletrocar.com.br", "carlos.e")

    salvo = await repo.buscar_por_id(carlos.id)
    assert (salvo.nome, salvo.email, salvo.username) == ("Carlos Eduardo", "carlos.eduardo@eletrocar.com.br", "carlos.e")
    assert salvo.papeis == {Papel.BALCONISTA}
    assert salvo.telegram_user_id == "123"
    assert dto.nome == "Carlos Eduardo"
    assert audit.logs[-1].acao == "USUARIO_ATUALIZADO" and audit.logs[-1].usuario_id == carlos.id


async def test_campos_nao_informados_ficam_como_estao_e_unicidade_e_validada():
    uc, repo, _, carlos = await _cenario()
    await uc.atualizar_proprio_perfil(carlos.id, "Carlos E.", None, None)
    salvo = await repo.buscar_por_id(carlos.id)
    assert (salvo.nome, salvo.email, salvo.username) == ("Carlos E.", "carlos@eletrocar.com.br", "carlos")

    with pytest.raises(RegraNegocioException, match="e-mail"):
        await uc.atualizar_proprio_perfil(carlos.id, None, "juliana@eletrocar.com.br", None)


async def test_troca_a_senha_com_a_senha_atual():
    uc, repo, audit, carlos = await _cenario()
    await uc.trocar_propria_senha(carlos.id, "senhaAtual1", "novaSenha123")
    assert (await repo.buscar_por_id(carlos.id)).senha_hash == "hashed_novaSenha123"
    assert audit.logs[-1].acao == "USUARIO_SENHA_ALTERADA_PELO_PROPRIO"
    assert "novaSenha123" not in str(audit.logs[-1])


async def test_recusa_senha_atual_errada_senha_curta_e_senha_igual():
    uc, _, _, carlos = await _cenario()
    with pytest.raises(CredenciaisInvalidasException, match="Senha atual incorreta"):
        await uc.trocar_propria_senha(carlos.id, "errada", "novaSenha123")
    with pytest.raises(RegraNegocioException, match="8 caracteres"):
        await uc.trocar_propria_senha(carlos.id, "senhaAtual1", "curta")
    with pytest.raises(RegraNegocioException, match="diferente"):
        await uc.trocar_propria_senha(carlos.id, "senhaAtual1", "senhaAtual1")


async def test_bloqueia_apos_muitas_tentativas_de_senha_atual():
    uc, _, _, carlos = await _cenario()
    for _ in range(3):
        with pytest.raises(CredenciaisInvalidasException):
            await uc.definir_proprio_pin(carlos.id, "errada", "4321")
    with pytest.raises(LimiteTentativasExcedidoException):
        await uc.definir_proprio_pin(carlos.id, "senhaAtual1", "4321")


async def test_define_o_proprio_pin_e_funciona_sem_limitador():
    uc, repo, audit, carlos = await _cenario(com_limitador=False)
    await uc.definir_proprio_pin(carlos.id, "senhaAtual1", "4321")
    assert (await repo.buscar_por_id(carlos.id)).pin_hash == "hashed_4321"
    assert audit.logs[-1].acao == "USUARIO_PIN_ALTERADO_PELO_PROPRIO"
    with pytest.raises(Exception):
        await uc.definir_proprio_pin(carlos.id, "senhaAtual1", "12")  # PIN inválido
    with pytest.raises(CredenciaisInvalidasException):
        await uc.definir_proprio_pin(carlos.id, "", "4321")
