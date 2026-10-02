"""
Teste do Use Case: RealizarVendaBalcaoUseCase (TDD).
Testa baixa atômica de estoque, movimentação no caixa e auditoria imutável.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.entities.peca import Peca
from src.domain.entities.caixa import CaixaDiario
from src.domain.value_objects.enums import Role, FormaPagamento, StatusCaixa
from src.domain.exceptions.domain_exceptions import EstoqueInsuficienteException, RegraNegocioException
from src.application.dtos.venda_dtos import ItemVendaInputDTO, RealizarVendaInputDTO
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from tests.fakes.fake_repositories import (
    FakePecaRepository,
    FakeVendaBalcaoRepository,
    FakeCaixaRepository,
    FakeAuditoriaRepository
)


@pytest.mark.asyncio
async def test_realizar_venda_balcao_sucesso():
    peca_repo = FakePecaRepository()
    venda_repo = FakeVendaBalcaoRepository()
    caixa_repo = FakeCaixaRepository()
    audit_repo = FakeAuditoriaRepository()

    # Setup: Peça com estoque inicial 10
    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7891049281023",
        sku="BOSCH-REG-12V",
        descricao="Regulador Bosch 12V",
        preco_custo=Decimal("100.00"),
        preco_venda=Decimal("180.00"),
        estoque_atual=10,
        estoque_minimo=2
    )
    await peca_repo.salvar(peca)

    # Setup: Caixa aberto com R$ 100
    operador_id = uuid.uuid4()
    caixa = CaixaDiario(
        id=uuid.uuid4(),
        operador_id=operador_id,
        saldo_inicial=Decimal("100.00"),
        status=StatusCaixa.ABERTO
    )
    await caixa_repo.salvar(caixa)

    use_case = RealizarVendaBalcaoUseCase(
        peca_repo=peca_repo,
        venda_repo=venda_repo,
        caixa_repo=caixa_repo,
        audit_repo=audit_repo
    )

    input_dto = RealizarVendaInputDTO(
        operador_id=operador_id,
        itens=[
            ItemVendaInputDTO(peca_id=peca.id, quantidade=2)
        ],
        desconto=Decimal("10.00"),
        forma_pagamento=FormaPagamento.DINHEIRO
    )

    output = await use_case.executar(input_dto)

    assert output.sucesso is True
    assert output.valor_total == Decimal("350.00") # (2 * 180) - 10 = 350
    assert output.numero_venda.startswith("VND-")

    # Verifica que o estoque baixou de 10 para 8
    peca_atualizada = await peca_repo.buscar_por_id(peca.id)
    assert peca_atualizada.estoque_atual == 8

    # Verifica que o caixa recebeu R$ 350, ficando com R$ 450
    caixa_atualizado = await caixa_repo.buscar_por_id(caixa.id)
    assert caixa_atualizado.saldo_teorico == Decimal("450.00")

    # Verifica que auditoria foi gravada
    logs = await audit_repo.listar_ultimos()
    assert len(logs) == 1
    assert logs[0].acao == "VENDA_BALCAO_FINALIZADA"


@pytest.mark.asyncio
async def test_realizar_venda_estoque_insuficiente_lanca_excecao():
    peca_repo = FakePecaRepository()
    venda_repo = FakeVendaBalcaoRepository()
    caixa_repo = FakeCaixaRepository()
    audit_repo = FakeAuditoriaRepository()

    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7891049281023",
        sku="BOSCH-REG-12V",
        descricao="Regulador Bosch 12V",
        preco_custo=Decimal("100.00"),
        preco_venda=Decimal("180.00"),
        estoque_atual=2,
        estoque_minimo=1
    )
    await peca_repo.salvar(peca)

    use_case = RealizarVendaBalcaoUseCase(
        peca_repo=peca_repo,
        venda_repo=venda_repo,
        caixa_repo=caixa_repo,
        audit_repo=audit_repo
    )

    # Tenta comprar 5 peças quando só tem 2
    input_dto = RealizarVendaInputDTO(
        operador_id=uuid.uuid4(),
        itens=[
            ItemVendaInputDTO(peca_id=peca.id, quantidade=5)
        ],
        forma_pagamento=FormaPagamento.PIX
    )

    with pytest.raises(EstoqueInsuficienteException):
        await use_case.executar(input_dto)

    # Garante que estoque continuou intacto (2)
    peca_intacta = await peca_repo.buscar_por_id(peca.id)
    assert peca_intacta.estoque_atual == 2
