"""
Teste do Use Case: CriarOSPorVozTelegramUseCase (TDD).
Pipeline de voz do eletricista via Telegram para abertura instantânea de OS.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Role, StatusOS, OrigemOS
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.application.dtos.os_dtos import CriarOSVozInputDTO
from src.application.use_cases.criar_os_voz_use_case import CriarOSPorVozTelegramUseCase
from tests.fakes.fake_repositories import (
    FakeUsuarioRepository,
    FakeClienteRepository,
    FakeOrdemServicoRepository,
    FakeAuditoriaRepository
)


@pytest.mark.asyncio
async def test_criar_os_por_voz_telegram_com_sucesso():
    usuario_repo = FakeUsuarioRepository()
    cliente_repo = FakeClienteRepository()
    os_repo = FakeOrdemServicoRepository()
    audit_repo = FakeAuditoriaRepository()

    # Eletricista autorizado com Telegram ID 987654321
    eletricista = Usuario(
        id=uuid.uuid4(),
        nome="Marcio Eletricista",
        email="marcio@eletrocar.com.br",
        senha_hash="hash_teste",
        role=Role.ELETRICISTA,
        telegram_user_id="987654321"
    )
    await usuario_repo.salvar(eletricista)

    use_case = CriarOSPorVozTelegramUseCase(
        usuario_repo=usuario_repo,
        cliente_repo=cliente_repo,
        os_repo=os_repo,
        audit_repo=audit_repo
    )

    input_dto = CriarOSVozInputDTO(
        telegram_user_id="987654321",
        nome_cliente="Carlos Silva",
        carro_modelo="Gol 1.6",
        carro_marca="Volkswagen",
        carro_placa="ABC1D23",
        carro_ano="2019",
        sintomas_relatados="Bateria descarregando e luz da bateria acesa no painel",
        hipotese_diagnostica="Falha de geração no alternador (regulador ou placa diodos)",
        checklist_eletrico={
            "bateria": "necessita teste de carga",
            "alternador": "falha na geracao",
            "motor_partida": "ok"
        }
    )

    os_criada = await use_case.executar(input_dto)

    assert os_criada.sucesso is True
    assert os_criada.numero_os.startswith("OS-2026-")
    assert os_criada.status == StatusOS.TRIAGEM.value
    assert os_criada.origem == OrigemOS.TELEGRAM_VOICE.value
    assert os_criada.nome_cliente == "Carlos Silva"

    # Verifica que o cliente e o carro foram criados e persistidos
    clientes = await cliente_repo.buscar_por_termo("Carlos")
    assert len(clientes) == 1
    assert len(clientes[0].carros) == 1
    assert clientes[0].carros[0].modelo == "Gol 1.6"


@pytest.mark.asyncio
async def test_criar_os_por_voz_telegram_usuario_nao_autorizado_rejeita():
    usuario_repo = FakeUsuarioRepository()
    cliente_repo = FakeClienteRepository()
    os_repo = FakeOrdemServicoRepository()
    audit_repo = FakeAuditoriaRepository()

    use_case = CriarOSPorVozTelegramUseCase(
        usuario_repo=usuario_repo,
        cliente_repo=cliente_repo,
        os_repo=os_repo,
        audit_repo=audit_repo
    )

    input_dto = CriarOSVozInputDTO(
        telegram_user_id="usuario_desconhecido_999",
        nome_cliente="Carlos Silva",
        carro_modelo="Gol 1.6",
        sintomas_relatados="Alternador"
    )

    with pytest.raises(RegraNegocioException) as exc:
        await use_case.executar(input_dto)
    assert "não autorizado" in str(exc.value).lower()
