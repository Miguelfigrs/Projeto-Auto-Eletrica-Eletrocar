"""
Teste do Use Case: OperarCaixaUseCase (TDD).
Fechamento cego: o operador NUNCA vê o saldo teórico; o relatório de quebra é exclusivo da gerência.
"""
import pytest
from dataclasses import asdict
from decimal import Decimal
import uuid
from src.domain.value_objects.enums import FormaPagamento, StatusCaixa
from src.domain.exceptions.domain_exceptions import RegraNegocioException, CaixaFechadoException
from src.application.dtos.caixa_dtos import AbrirCaixaInputDTO, MovimentarCaixaInputDTO, FechamentoCegoInputDTO
from src.application.use_cases.operar_caixa_use_case import OperarCaixaUseCase
from tests.fakes.fake_repositories import FakeCaixaRepository, FakeAuditoriaRepository


def _uc():
    caixa_repo, audit = FakeCaixaRepository(), FakeAuditoriaRepository()
    return OperarCaixaUseCase(caixa_repo=caixa_repo, audit_repo=audit), caixa_repo, audit


def _sem_saldo_teorico(dto) -> bool:
    texto = str(asdict(dto))
    return "saldo_teorico" not in texto and "diferenca" not in texto


@pytest.mark.asyncio
async def test_ciclo_completo_caixa_e_fechamento_cego():
    use_case, _, audit = _uc()
    operador_id = uuid.uuid4()

    caixa = await use_case.abrir_caixa(AbrirCaixaInputDTO(operador_id=operador_id, saldo_inicial=Decimal("150.00")))
    assert caixa.status == StatusCaixa.ABERTO.value
    assert _sem_saldo_teorico(caixa)

    await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
        operador_id=operador_id, tipo="SUPRIMENTO", valor=Decimal("50.00"), descricao="Reforço de moedas"
    ))
    await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
        operador_id=operador_id, tipo="SANGRIA", valor=Decimal("70.00"), descricao="Recolhimento para cofre"
    ))

    status_operador = await use_case.consultar_caixa_aberto()
    assert _sem_saldo_teorico(status_operador)

    # Visão gerencial mostra o saldo teórico: 150 + 50 - 70 = 130
    gerencial = await use_case.consultar_caixa_gerencial(caixa.id)
    assert gerencial.saldo_teorico_dinheiro == Decimal("130.00")

    confirmacao = await use_case.fechar_caixa_cego(FechamentoCegoInputDTO(
        operador_id=operador_id, valores_contados={FormaPagamento.DINHEIRO: Decimal("125.00")}
    ))
    # O operador recebe apenas a confirmação, sem quebra/sobra nem saldo esperado
    assert confirmacao.caixa_id == caixa.id
    assert _sem_saldo_teorico(confirmacao)
    assert "quebra" not in str(asdict(confirmacao)).lower()

    relatorio = await use_case.relatorio_fechamento(caixa.id)
    assert relatorio.diferenca_total == Decimal("-5.00")
    assert relatorio.status == "QUEBRA_DE_CAIXA"
    dinheiro = next(f for f in relatorio.formas if f.forma_pagamento == "DINHEIRO")
    assert (dinheiro.teorico, dinheiro.contado, dinheiro.diferenca) == (
        Decimal("130.00"), Decimal("125.00"), Decimal("-5.00")
    )
    assert "CAIXA_FECHAMENTO_CEGO" in audit.acoes()

    with pytest.raises(CaixaFechadoException):
        await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
            operador_id=operador_id, tipo="SUPRIMENTO", valor=Decimal("20.00"), descricao="Após fechar"
        ))


@pytest.mark.asyncio
async def test_nao_abre_dois_caixas_simultaneos():
    use_case, _, _ = _uc()
    await use_case.abrir_caixa(AbrirCaixaInputDTO(operador_id=uuid.uuid4()))
    with pytest.raises(RegraNegocioException):
        await use_case.abrir_caixa(AbrirCaixaInputDTO(operador_id=uuid.uuid4()))


@pytest.mark.asyncio
async def test_movimentacao_manual_aceita_apenas_sangria_e_suprimento():
    use_case, _, _ = _uc()
    await use_case.abrir_caixa(AbrirCaixaInputDTO(operador_id=uuid.uuid4()))
    for tipo in ("ENTRADA_VENDA", "ESTORNO_VENDA", "QUALQUER"):
        with pytest.raises(RegraNegocioException):
            await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
                operador_id=uuid.uuid4(), tipo=tipo, valor=Decimal("10.00"), descricao="x"
            ))
