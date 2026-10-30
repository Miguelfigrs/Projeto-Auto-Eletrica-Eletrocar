"""
Teste do Use Case: AutenticarUsuarioUseCase (TDD).
Login por e-mail ou usuário, RBAC multi-papel, limite de tentativas e troca rápida de operador por PIN.
"""
import pytest
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.domain.exceptions.domain_exceptions import (
    CredenciaisInvalidasException,
    LimiteTentativasExcedidoException
)
from src.application.dtos.auth_dtos import LoginInputDTO, TrocaOperadorPinInputDTO
from src.application.use_cases.autenticar_usuario_use_case import AutenticarUsuarioUseCase
from tests.fakes.fake_repositories import FakeUsuarioRepository
from tests.fakes.fake_servicos import FakePasswordHasher, FakeLimitadorTentativas


async def _cenario(**kwargs):
    repo = FakeUsuarioRepository()
    hasher = FakePasswordHasher()
    limitador = FakeLimitadorTentativas(maximo=5)
    dados = dict(
        id=uuid.uuid4(),
        nome="Dono da Oficina",
        email="dono@eletrocar.com.br",
        username="dono",
        senha_hash=hasher.hash("senha123"),
        papeis={Papel.ADMIN, Papel.BALCONISTA, Papel.ELETRICISTA},
        pin_hash=hasher.hash("1234"),
    )
    dados.update(kwargs)
    usuario = Usuario(**dados)
    await repo.salvar(usuario)
    return AutenticarUsuarioUseCase(repo, hasher, limitador), usuario, limitador


@pytest.mark.asyncio
async def test_auth_multi_role_success():
    use_case, usuario, _ = await _cenario()

    res = await use_case.login(LoginInputDTO(identificador="dono@eletrocar.com.br", senha="senha123"))

    assert res.id == usuario.id
    assert set(res.papeis) == {"ADMIN", "BALCONISTA", "ELETRICISTA"}
    assert res.tem_pin is True


@pytest.mark.asyncio
async def test_login_por_nome_de_usuario():
    use_case, usuario, _ = await _cenario()
    res = await use_case.login(LoginInputDTO(identificador="  DONO ", senha="senha123"))
    assert res.id == usuario.id


@pytest.mark.asyncio
async def test_login_senha_incorreta_falha():
    use_case, _, _ = await _cenario()
    with pytest.raises(CredenciaisInvalidasException):
        await use_case.login(LoginInputDTO(identificador="dono", senha="senhaErrada"))


@pytest.mark.asyncio
async def test_login_usuario_inativo_falha():
    use_case, _, _ = await _cenario(ativo=False)
    with pytest.raises(CredenciaisInvalidasException):
        await use_case.login(LoginInputDTO(identificador="dono", senha="senha123"))


@pytest.mark.asyncio
async def test_login_bloqueado_apos_5_tentativas_incorretas():
    use_case, _, _ = await _cenario()
    for _ in range(5):
        with pytest.raises(CredenciaisInvalidasException):
            await use_case.login(LoginInputDTO(identificador="dono", senha="errada"))

    # Mesmo com a senha correta, a conta fica temporariamente bloqueada
    with pytest.raises(LimiteTentativasExcedidoException):
        await use_case.login(LoginInputDTO(identificador="dono", senha="senha123"))


@pytest.mark.asyncio
async def test_login_com_sucesso_zera_contador_de_falhas():
    use_case, _, limitador = await _cenario()
    with pytest.raises(CredenciaisInvalidasException):
        await use_case.login(LoginInputDTO(identificador="dono", senha="errada"))
    await use_case.login(LoginInputDTO(identificador="dono", senha="senha123"))
    assert limitador.falhas == {}


@pytest.mark.asyncio
async def test_troca_rapida_operador_pin_sucesso():
    use_case, usuario, _ = await _cenario()
    res = await use_case.trocar_operador_por_pin(TrocaOperadorPinInputDTO(usuario_id=usuario.id, pin="1234"))
    assert res.id == usuario.id


@pytest.mark.asyncio
async def test_pin_bloqueado_apos_5_tentativas_incorretas():
    use_case, usuario, _ = await _cenario()
    for _ in range(5):
        with pytest.raises(CredenciaisInvalidasException):
            await use_case.trocar_operador_por_pin(TrocaOperadorPinInputDTO(usuario_id=usuario.id, pin="0000"))
    with pytest.raises(LimiteTentativasExcedidoException):
        await use_case.trocar_operador_por_pin(TrocaOperadorPinInputDTO(usuario_id=usuario.id, pin="1234"))


@pytest.mark.asyncio
async def test_usuario_sem_pin_nao_troca_operador():
    use_case, usuario, _ = await _cenario(pin_hash=None)
    with pytest.raises(CredenciaisInvalidasException):
        await use_case.trocar_operador_por_pin(TrocaOperadorPinInputDTO(usuario_id=usuario.id, pin="1234"))
