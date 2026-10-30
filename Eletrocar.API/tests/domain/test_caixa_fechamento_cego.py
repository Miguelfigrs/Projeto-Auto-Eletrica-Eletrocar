"""
Testes unitários: Caixa Diário, conciliação por meio de pagamento e fechamento cego.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.entities.caixa import CaixaDiario
from src.domain.value_objects.enums import FormaPagamento, TipoMovimentacaoCaixa, StatusCaixa
from src.domain.exceptions.domain_exceptions import RegraNegocioException, CaixaFechadoException


def _caixa(saldo_inicial="200.00") -> CaixaDiario:
    return CaixaDiario(id=uuid.uuid4(), operador_id=uuid.uuid4(), saldo_inicial=Decimal(saldo_inicial))


def test_caixa_diario_sangria_suprimento_fechamento_cego():
    caixa = _caixa()
    assert caixa.status == StatusCaixa.ABERTO
    assert caixa.saldo_teorico == Decimal("200.00")

    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.SUPRIMENTO, Decimal("100.00"), FormaPagamento.DINHEIRO, "Troco")
    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.ENTRADA_VENDA, Decimal("150.00"), FormaPagamento.DINHEIRO, "VB-1")
    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.SANGRIA, Decimal("200.00"), FormaPagamento.DINHEIRO, "Cofre")
    assert caixa.saldo_teorico == Decimal("250.00")

    resultado = caixa.fechar_cego({FormaPagamento.DINHEIRO: Decimal("250.00")})

    assert caixa.status == StatusCaixa.FECHADO
    assert resultado.diferenca_total == Decimal("0.00")
    assert resultado.status == "CORRETO"


def test_fechamento_cego_concilia_cada_meio_de_pagamento():
    caixa = _caixa("100.00")
    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.ENTRADA_VENDA, Decimal("300.00"), FormaPagamento.PIX, "VB-1")
    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.ENTRADA_OS, Decimal("500.00"), FormaPagamento.CARTAO_CREDITO, "OS-1")
    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.ENTRADA_VENDA, Decimal("50.00"), FormaPagamento.DINHEIRO, "VB-2")

    resultado = caixa.fechar_cego({
        FormaPagamento.DINHEIRO: Decimal("145.00"),  # faltam 5,00
        FormaPagamento.PIX: Decimal("300.00"),
        FormaPagamento.CARTAO_CREDITO: Decimal("500.00"),
    })

    assert resultado.diferencas_por_forma[FormaPagamento.DINHEIRO] == Decimal("-5.00")
    assert resultado.diferencas_por_forma[FormaPagamento.PIX] == Decimal("0.00")
    assert resultado.diferenca_total == Decimal("-5.00")
    assert resultado.status == "QUEBRA_DE_CAIXA"
    assert caixa.diferenca_fechamento == Decimal("-5.00")

    # Relatório gerencial é reconstruído a partir dos valores contados persistidos
    relatorio = caixa.relatorio_fechamento()
    assert relatorio.status == "QUEBRA_DE_CAIXA"
    assert relatorio.saldo_teorico_por_forma[FormaPagamento.DINHEIRO] == Decimal("150.00")


def test_relatorio_de_fechamento_so_existe_apos_fechar():
    caixa = _caixa()
    with pytest.raises(RegraNegocioException):
        caixa.relatorio_fechamento()


def test_estorno_de_venda_reduz_saldo_e_nao_pode_exceder_dinheiro_disponivel():
    caixa = _caixa("50.00")
    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.ENTRADA_VENDA, Decimal("30.00"), FormaPagamento.DINHEIRO, "VB-1")
    caixa.registrar_movimentacao(TipoMovimentacaoCaixa.ESTORNO_VENDA, Decimal("30.00"), FormaPagamento.DINHEIRO, "Estorno VB-1")
    assert caixa.saldo_teorico == Decimal("50.00")

    with pytest.raises(RegraNegocioException):
        caixa.registrar_movimentacao(TipoMovimentacaoCaixa.SANGRIA, Decimal("60.00"), FormaPagamento.DINHEIRO, "Excesso")


def test_formas_a_prazo_nao_entram_no_caixa():
    caixa = _caixa()
    for forma in (FormaPagamento.FATURADO, FormaPagamento.BOLETO):
        with pytest.raises(RegraNegocioException):
            caixa.registrar_movimentacao(TipoMovimentacaoCaixa.ENTRADA_VENDA, Decimal("10.00"), forma, "a prazo")


def test_nao_movimenta_caixa_fechado():
    caixa = _caixa()
    caixa.fechar_cego({FormaPagamento.DINHEIRO: Decimal("200.00")})
    with pytest.raises(CaixaFechadoException):
        caixa.registrar_movimentacao(TipoMovimentacaoCaixa.SUPRIMENTO, Decimal("1.00"), FormaPagamento.DINHEIRO, "x")
