"""
Testes unitários: Contas a Pagar/Receber (inadimplência) e Cobrança PIX dinâmica.
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
import uuid
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.entities.cobranca_pix import CobrancaPix
from src.domain.value_objects.enums import (
    TipoTitulo,
    StatusTitulo,
    CategoriaTitulo,
    FormaPagamento,
    StatusCobrancaPix
)
from src.domain.exceptions.domain_exceptions import RegraNegocioException


def _titulo(**kwargs) -> TituloFinanceiro:
    dados = dict(
        id=uuid.uuid4(),
        tipo=TipoTitulo.RECEBER,
        descricao="Venda faturada frota TransRápido",
        valor=Decimal("1200.00"),
        data_vencimento=date(2026, 10, 10),
        categoria=CategoriaTitulo.VENDA_A_PRAZO,
    )
    dados.update(kwargs)
    return TituloFinanceiro(**dados)


def test_titulo_a_receber_vencido_gera_inadimplencia():
    titulo = _titulo()
    hoje = date(2026, 10, 13)
    assert titulo.esta_vencido(hoje)
    assert titulo.dias_em_atraso(hoje) == 3


def test_baixa_de_titulo_encerra_inadimplencia():
    titulo = _titulo()
    titulo.baixar(date(2026, 10, 12), FormaPagamento.PIX)
    assert titulo.status == StatusTitulo.PAGO
    assert not titulo.esta_vencido(date(2026, 10, 13))

    with pytest.raises(RegraNegocioException):
        titulo.baixar(date(2026, 10, 12), FormaPagamento.PIX)


def test_baixa_nao_aceita_forma_a_prazo():
    with pytest.raises(RegraNegocioException):
        _titulo().baixar(date(2026, 10, 12), FormaPagamento.BOLETO)


def test_titulo_valida_valor_e_categoria_coerente_com_tipo():
    with pytest.raises(RegraNegocioException):
        _titulo(valor=Decimal("0.00"))
    with pytest.raises(RegraNegocioException):
        _titulo(tipo=TipoTitulo.PAGAR, categoria=CategoriaTitulo.VENDA_A_PRAZO)
    despesa = _titulo(tipo=TipoTitulo.PAGAR, categoria=CategoriaTitulo.DESPESA_FIXA, descricao="Aluguel")
    assert despesa.eh_despesa_operacional()


def test_titulo_cancelado_nao_pode_ser_baixado():
    titulo = _titulo()
    titulo.cancelar()
    assert titulo.status == StatusTitulo.CANCELADO
    with pytest.raises(RegraNegocioException):
        titulo.baixar(date(2026, 10, 12), FormaPagamento.DINHEIRO)


def _cobranca(**kwargs) -> CobrancaPix:
    agora = datetime(2026, 10, 13, 10, 0, 0)
    dados = dict(
        id=uuid.uuid4(),
        txid="ELETROCAR" + "A" * 20,
        valor=Decimal("489.00"),
        copia_e_cola="000201...",
        criada_em=agora,
        expira_em=agora + timedelta(minutes=30),
    )
    dados.update(kwargs)
    return CobrancaPix(**dados)


def test_cobranca_pix_liquidada_pelo_valor_exato_e_idempotente():
    cobranca = _cobranca()
    cobranca.liquidar(Decimal("489.00"), "E123", datetime(2026, 10, 13, 10, 5))
    assert cobranca.status == StatusCobrancaPix.LIQUIDADA

    # Reentrega do mesmo webhook não gera erro
    cobranca.liquidar(Decimal("489.00"), "E123", datetime(2026, 10, 13, 10, 6))
    assert cobranca.end_to_end_id == "E123"


def test_cobranca_pix_rejeita_valor_divergente():
    with pytest.raises(RegraNegocioException):
        _cobranca().liquidar(Decimal("400.00"), "E999", datetime(2026, 10, 13, 10, 5))


def test_cobranca_pix_so_pode_ser_usada_uma_vez_apos_liquidada():
    cobranca = _cobranca()
    with pytest.raises(RegraNegocioException):
        cobranca.consumir("VB-2026-0001", datetime(2026, 10, 13, 10, 1))

    cobranca.liquidar(Decimal("489.00"), "E1", datetime(2026, 10, 13, 10, 5))
    cobranca.consumir("VB-2026-0001", datetime(2026, 10, 13, 10, 6))
    with pytest.raises(RegraNegocioException):
        cobranca.consumir("VB-2026-0002", datetime(2026, 10, 13, 10, 7))


def test_txid_pix_deve_seguir_padrao_bacen():
    with pytest.raises(RegraNegocioException):
        _cobranca(txid="curto")
