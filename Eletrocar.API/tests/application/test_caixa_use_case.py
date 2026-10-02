"""
Teste do Use Case: OperarCaixaUseCase (TDD).
Testa abertura, sangrias, suprimentos e fechamento cego de turno.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.value_objects.enums import FormaPagamento, StatusCaixa
from src.domain.exceptions.domain_exceptions import RegraNegocioException, CaixaFechadoException
from src.application.dtos.caixa_dtos import (
    AbrirCaixaInputDTO,
    MovimentarCaixaInputDTO,
    FechamentoCegoInputDTO
)
from src.application.use_cases.operar_caixa_use_case import OperarCaixaUseCase
from tests.fakes.fake_repositories import FakeCaixaRepository, FakeAuditoriaRepository


@pytest.mark.asyncio
async def test_ciclo_completo_caixa_e_fechamento_cego():
    caixa_repo = FakeCaixaRepository()
    audit_repo = FakeAuditoriaRepository()
    operador_id = uuid.uuid4()

    use_case = OperarCaixaUseCase(caixa_repo=caixa_repo, audit_repo=audit_repo)

    # 1. Abertura de caixa com R$ 150,00 de fundo de troco
    abertura_dto = AbrirCaixaInputDTO(
        operador_id=operador_id,
        saldo_inicial=Decimal("150.00")
    )
    caixa = await use_case.abrir_caixa(abertura_dto)
    assert caixa.status == StatusCaixa.ABERTO.value
    assert caixa.saldo_teorico == Decimal("150.00")

    # 2. Suprimento de R$ 50,00
    mov_suprimento = await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
        operador_id=operador_id,
        tipo="SUPRIMENTO",
        valor=Decimal("50.00"),
        forma_pagamento=FormaPagamento.DINHEIRO,
        descricao="Reforço de moedas"
    ))
    assert mov_suprimento.sucesso is True

    # 3. Sangria de R$ 70,00
    mov_sangria = await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
        operador_id=operador_id,
        tipo="SANGRIA",
        valor=Decimal("70.00"),
        forma_pagamento=FormaPagamento.DINHEIRO,
        descricao="Recolhimento para cofre"
    ))
    assert mov_sangria.sucesso is True

    # Saldo teórico atual: 150 + 50 - 70 = 130
    status_caixa = await use_case.consultar_caixa_aberto()
    assert status_caixa.saldo_teorico == Decimal("130.00")

    # 4. Fechamento cego: operador informa que contou R$ 130,00
    fechamento = await use_case.fechar_caixa_cego(FechamentoCegoInputDTO(
        operador_id=operador_id,
        valores_contados={
            FormaPagamento.DINHEIRO: Decimal("130.00")
        }
    ))
    assert fechamento.sucesso is True
    assert fechamento.diferenca_total == Decimal("0.00")
    assert fechamento.quebra_ou_sobra == "CORRETO"

    # Tentativa de movimentar caixa após fechado deve falhar
    with pytest.raises(CaixaFechadoException):
        await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
            operador_id=operador_id,
            tipo="SUPRIMENTO",
            valor=Decimal("20.00"),
            forma_pagamento=FormaPagamento.DINHEIRO,
            descricao="Tenta após fechar"
        ))
