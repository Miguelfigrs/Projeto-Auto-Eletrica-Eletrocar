"""
Testes dos Use Cases financeiros (TDD): contas a pagar/receber com inadimplência e cobrança PIX dinâmica.
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
import uuid
from src.domain.value_objects.enums import (
    TipoTitulo, CategoriaTitulo, FormaPagamento, StatusTitulo, StatusCobrancaPix, TipoMovimentacaoCaixa
)
from src.domain.exceptions.domain_exceptions import RegraNegocioException, EntidadeNaoEncontradaException
from src.application.dtos.financeiro_dtos import (
    CriarTituloInputDTO, BaixarTituloInputDTO, GerarCobrancaPixInputDTO, LiquidacaoPixInputDTO
)
from src.application.use_cases.gerenciar_titulos_use_case import GerenciarTitulosUseCase
from src.application.use_cases.pagamento_pix_use_case import PagamentoPixUseCase
from tests.application.conftest import Cenario, AGORA
from tests.fakes.fake_servicos import FakePixGateway

HOJE = date(2026, 10, 13)


def _titulos(c: Cenario) -> GerenciarTitulosUseCase:
    return GerenciarTitulosUseCase(c.titulos, c.caixas, c.auditoria, hoje=lambda: HOJE)


def _receber(valor="1200.00", vencimento=date(2026, 10, 10), cliente_id=None) -> CriarTituloInputDTO:
    return CriarTituloInputDTO(
        tipo=TipoTitulo.RECEBER, descricao="Frota TransRápido - outubro", valor=Decimal(valor),
        data_vencimento=vencimento, categoria=CategoriaTitulo.VENDA_A_PRAZO, cliente_id=cliente_id
    )


@pytest.mark.asyncio
async def test_relatorio_de_inadimplencia_lista_titulos_vencidos(cenario: Cenario):
    uc = _titulos(cenario)
    vencido = await uc.criar(_receber(), executor_id=uuid.uuid4())
    await uc.criar(_receber(vencimento=date(2026, 11, 10)), executor_id=uuid.uuid4())
    await uc.criar(CriarTituloInputDTO(
        tipo=TipoTitulo.PAGAR, descricao="Aluguel", valor=Decimal("3000.00"),
        data_vencimento=date(2026, 10, 1), categoria=CategoriaTitulo.DESPESA_FIXA
    ), executor_id=uuid.uuid4())

    relatorio = await uc.relatorio_inadimplencia()

    assert relatorio.quantidade == 1
    assert relatorio.valor_total == Decimal("1200.00")
    assert relatorio.titulos[0].id == vencido.id
    assert relatorio.titulos[0].dias_em_atraso == 3


@pytest.mark.asyncio
async def test_baixa_de_conta_a_receber_em_dinheiro_entra_no_caixa(cenario: Cenario):
    caixa = await cenario.caixa_aberto(saldo="100.00")
    uc = _titulos(cenario)
    titulo = await uc.criar(_receber(), executor_id=uuid.uuid4())

    baixado = await uc.baixar(BaixarTituloInputDTO(
        titulo_id=titulo.id, data_pagamento=HOJE, forma_pagamento=FormaPagamento.DINHEIRO, executor_id=uuid.uuid4()
    ))

    assert baixado.status == StatusTitulo.PAGO.value
    assert caixa.movimentacoes[-1].tipo == TipoMovimentacaoCaixa.ENTRADA_TITULO
    assert caixa.saldo_teorico == Decimal("1300.00")
    assert "TITULO_BAIXADO" in cenario.auditoria.acoes()


@pytest.mark.asyncio
async def test_baixa_de_conta_a_pagar_nao_movimenta_caixa(cenario: Cenario):
    caixa = await cenario.caixa_aberto()
    uc = _titulos(cenario)
    titulo = await uc.criar(CriarTituloInputDTO(
        tipo=TipoTitulo.PAGAR, descricao="Energia", valor=Decimal("200.00"),
        data_vencimento=HOJE, categoria=CategoriaTitulo.DESPESA_VARIAVEL
    ), executor_id=uuid.uuid4())
    await uc.baixar(BaixarTituloInputDTO(
        titulo_id=titulo.id, data_pagamento=HOJE, forma_pagamento=FormaPagamento.PIX, executor_id=uuid.uuid4()
    ))
    assert caixa.movimentacoes == []


@pytest.mark.asyncio
async def test_cancelar_titulo_inexistente(cenario: Cenario):
    with pytest.raises(EntidadeNaoEncontradaException):
        await _titulos(cenario).cancelar(uuid.uuid4(), executor_id=uuid.uuid4())


def _pix(c: Cenario) -> PagamentoPixUseCase:
    return PagamentoPixUseCase(c.cobrancas, FakePixGateway(), c.auditoria, expiracao_minutos=30, relogio=lambda: AGORA)


@pytest.mark.asyncio
async def test_gerar_cobranca_pix_dinamica(cenario: Cenario):
    cobranca = await _pix(cenario).gerar_cobranca(GerarCobrancaPixInputDTO(
        valor=Decimal("489.00"), descricao="Venda balcão", operador_id=uuid.uuid4()
    ))
    assert cobranca.status == StatusCobrancaPix.PENDENTE.value
    assert len(cobranca.txid) == 25
    assert cobranca.copia_e_cola.startswith("000201")
    assert cobranca.expira_em == AGORA + timedelta(minutes=30)


@pytest.mark.asyncio
async def test_webhook_de_liquidacao_confirma_pagamento_automaticamente(cenario: Cenario):
    uc = _pix(cenario)
    cobranca = await uc.gerar_cobranca(GerarCobrancaPixInputDTO(valor=Decimal("489.00"), descricao="x", operador_id=uuid.uuid4()))

    liquidada = await uc.liquidar(LiquidacaoPixInputDTO(txid=cobranca.txid, valor_pago=Decimal("489.00"), end_to_end_id="E1"))
    assert liquidada.status == StatusCobrancaPix.LIQUIDADA.value
    assert "PIX_LIQUIDADO" in cenario.auditoria.acoes()

    with pytest.raises(EntidadeNaoEncontradaException):
        await uc.liquidar(LiquidacaoPixInputDTO(txid="X" * 30, valor_pago=Decimal("1.00"), end_to_end_id="E2"))


@pytest.mark.asyncio
async def test_consulta_de_cobranca_expirada(cenario: Cenario):
    cobranca = await cenario.cobranca_pix("50.00", liquidada=False)
    uc = PagamentoPixUseCase(cenario.cobrancas, FakePixGateway(), cenario.auditoria, expiracao_minutos=30,
                             relogio=lambda: AGORA + timedelta(hours=1))
    consultada = await uc.consultar(cobranca.id)
    assert consultada.status == StatusCobrancaPix.EXPIRADA.value
