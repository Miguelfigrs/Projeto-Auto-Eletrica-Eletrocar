"""
Teste do Use Case: CancelarVendaUseCase (TDD).
Cancelamento (exclusão lógica) com estorno de estoque, estorno no caixa e log antes/depois.
"""
import pytest
from decimal import Decimal
from src.domain.value_objects.enums import Papel, FormaPagamento, StatusVenda, StatusTitulo, TipoMovimentacaoCaixa
from src.domain.exceptions.domain_exceptions import RegraNegocioException, CaixaFechadoException
from src.application.dtos.venda_dtos import ItemVendaInputDTO, RealizarVendaInputDTO, CancelarVendaInputDTO
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from src.application.use_cases.cancelar_venda_use_case import CancelarVendaUseCase
from tests.application.conftest import Cenario


async def _vender(c: Cenario, operador, peca, forma=FormaPagamento.DINHEIRO, cliente_id=None, qtd=2):
    use_case = RealizarVendaBalcaoUseCase(
        c.pecas, c.vendas, c.caixas, c.auditoria, c.usuarios, c.titulos, c.cobrancas, c.validador,
        limite_desconto_percentual=Decimal("5"), prazo_faturado_dias=30
    )
    return await use_case.executar(RealizarVendaInputDTO(
        operador_id=operador.id, cliente_id=cliente_id,
        itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=qtd)], forma_pagamento=forma
    ))


def _cancelar(c: Cenario) -> CancelarVendaUseCase:
    return CancelarVendaUseCase(c.vendas, c.pecas, c.caixas, c.titulos, c.auditoria)


@pytest.mark.asyncio
async def test_cancelamento_estorna_estoque_e_caixa(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    admin = await cenario.usuario(Papel.ADMIN)
    caixa = await cenario.caixa_aberto(operador.id, saldo="100.00")
    peca = await cenario.peca(estoque=10, preco_venda="50.00")
    venda = await _vender(cenario, operador, peca)

    resultado = await _cancelar(cenario).executar(CancelarVendaInputDTO(
        venda_id=venda.id, motivo="Peça errada para o veículo", executor_id=admin.id
    ))

    assert resultado.status == StatusVenda.CANCELADA.value
    assert (await cenario.pecas.buscar_por_id(peca.id)).estoque_atual == 10
    assert caixa.saldo_teorico == Decimal("100.00")
    assert caixa.movimentacoes[-1].tipo == TipoMovimentacaoCaixa.ESTORNO_VENDA
    log = cenario.auditoria.logs[-1]
    assert log.acao == "VENDA_CANCELADA"
    assert log.usuario_id == admin.id
    assert log.payload_antes["status"] == "CONCLUIDA"
    assert log.payload_depois["status"] == "CANCELADA"


@pytest.mark.asyncio
async def test_cancelamento_de_venda_faturada_cancela_titulo_em_aberto(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    cliente = await cenario.cliente()
    peca = await cenario.peca(estoque=10)
    venda = await _vender(cenario, operador, peca, FormaPagamento.FATURADO, cliente.id)

    await _cancelar(cenario).executar(CancelarVendaInputDTO(venda_id=venda.id, motivo="Erro", executor_id=operador.id))

    titulo = await cenario.titulos.buscar_por_venda(venda.id)
    assert titulo.status == StatusTitulo.CANCELADO


@pytest.mark.asyncio
async def test_cancelamento_exige_caixa_aberto_para_estorno(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    caixa = await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=10)
    venda = await _vender(cenario, operador, peca)
    caixa.fechar_cego({FormaPagamento.DINHEIRO: caixa.saldo_teorico})

    with pytest.raises(CaixaFechadoException):
        await _cancelar(cenario).executar(CancelarVendaInputDTO(venda_id=venda.id, motivo="Erro", executor_id=operador.id))
    assert (await cenario.vendas.buscar_por_id(venda.id)).status == StatusVenda.CONCLUIDA
    assert (await cenario.pecas.buscar_por_id(peca.id)).estoque_atual == 8


@pytest.mark.asyncio
async def test_venda_cancelada_nao_pode_ser_cancelada_novamente(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=10)
    venda = await _vender(cenario, operador, peca)
    dto = CancelarVendaInputDTO(venda_id=venda.id, motivo="Erro", executor_id=operador.id)
    await _cancelar(cenario).executar(dto)
    with pytest.raises(RegraNegocioException):
        await _cancelar(cenario).executar(dto)
    assert (await cenario.pecas.buscar_por_id(peca.id)).estoque_atual == 10
