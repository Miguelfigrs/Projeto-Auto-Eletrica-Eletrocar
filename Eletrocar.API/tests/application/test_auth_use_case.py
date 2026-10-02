"""
Teste do Use Case: AutenticarUsuarioUseCase (TDD).
Testa autenticação por e-mail/senha e troca rápida de operador por PIN.
"""
import pytest
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Role
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException
from src.application.dtos.auth_dtos import LoginInputDTO, TrocaOperadorPinInputDTO
from src.application.use_cases.autenticar_usuario_use_case import AutenticarUsuarioUseCase
from tests.fakes.fake_repositories import FakeUsuarioRepository


class FakePasswordHasher:
    def hash(self, password: str) -> str:
        return f"hashed_{password}"

    def verify(self, password: str, hashed: str) -> bool:
        return hashed == f"hashed_{password}"


@pytest.mark.asyncio
async def test_autenticar_usuario_email_senha_sucesso():
    usuario_repo = FakeUsuarioRepository()
    hasher = FakePasswordHasher()

    usuario = Usuario(
        id=uuid.uuid4(),
        nome="Admin Principal",
        email="admin@eletrocar.com.br",
        senha_hash=hasher.hash("senha123"),
        role=Role.ADMIN,
        pin_caixa="1234"
    )
    await usuario_repo.salvar(usuario)

    use_case = AutenticarUsuarioUseCase(usuario_repo=usuario_repo, password_hasher=hasher)

    res = await use_case.login(LoginInputDTO(
        email="admin@eletrocar.com.br",
        senha="senha123"
    ))

    assert res.usuario_id == usuario.id
    assert res.nome == "Admin Principal"
    assert res.role == Role.ADMIN.value


@pytest.mark.asyncio
async def test_troca_rapida_operador_pin_sucesso():
    usuario_repo = FakeUsuarioRepository()
    hasher = FakePasswordHasher()

    usuario = Usuario(
        id=uuid.uuid4(),
        nome="Balconista Turno Tarde",
        email="balcao2@eletrocar.com.br",
        senha_hash=hasher.hash("senha456"),
        role=Role.BALCAO,
        pin_caixa="9876"
    )
    await usuario_repo.salvar(usuario)

    use_case = AutenticarUsuarioUseCase(usuario_repo=usuario_repo, password_hasher=hasher)

    res = await use_case.trocar_operador_por_pin(TrocaOperadorPinInputDTO(
        usuario_id=usuario.id,
        pin="9876"
    ))

    assert res.usuario_id == usuario.id
    assert res.nome == "Balconista Turno Tarde"


@pytest.mark.asyncio
async def test_login_senha_incorreta_falha():
    usuario_repo = FakeUsuarioRepository()
    hasher = FakePasswordHasher()

    usuario = Usuario(
        id=uuid.uuid4(),
        nome="Balconista",
        email="balcao@eletrocar.com.br",
        senha_hash=hasher.hash("senhaCorreta"),
        role=Role.BALCAO
    )
    await usuario_repo.salvar(usuario)

    use_case = AutenticarUsuarioUseCase(usuario_repo=usuario_repo, password_hasher=hasher)

    with pytest.raises(CredenciaisInvalidasException):
        await use_case.login(LoginInputDTO(
            email="balcao@eletrocar.com.br",
            senha="senhaErrada"
        ))
