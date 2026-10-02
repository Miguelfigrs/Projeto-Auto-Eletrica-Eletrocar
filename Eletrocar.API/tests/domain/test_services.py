"""
Testes dos Domain Services (TDD).
Testa regras contábeis do DRE e conciliação cega de múltiplos meios de pagamento.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.services.calculadora_dre_service import CalculadoraDREService
from src.domain.services.conciliador_caixa_service import ConciliadorCaixaService
from src.domain.value_objects.enums import FormaPagamento


def test_calculadora_dre_service():
    service = CalculadoraDREService()
    
    dre = service.calcular(
        receita_vendas_produtos=Decimal("15000.00"),
        receita_servicos_os=Decimal("25000.00"),
        custo_mercadorias_vendidas=Decimal("8000.00"),
        custo_mao_obra_direta=Decimal("6000.00"),
        despesas_operacionais_fixas=Decimal("4500.00"),
        despesas_variaveis=Decimal("1500.00")
    )
    
    assert dre.receita_bruta_total == Decimal("40000.00")
    assert dre.custos_diretos_total == Decimal("14000.00")
    assert dre.lucro_bruto == Decimal("26000.00")
    assert dre.despesas_totais == Decimal("6000.00")
    assert dre.lucro_liquido == Decimal("20000.00")
    assert dre.margem_lucro_liquido_percentual == Decimal("50.00")


def test_conciliador_caixa_quebra_de_caixa():
    service = ConciliadorCaixaService()
    
    saldo_teorico = {
        FormaPagamento.DINHEIRO: Decimal("500.00"),
        FormaPagamento.PIX: Decimal("1200.00"),
        FormaPagamento.CARTAO_CREDITO: Decimal("800.00")
    }
    
    saldo_contado = {
        FormaPagamento.DINHEIRO: Decimal("480.00"), # Falta 20 reais (Quebra)
        FormaPagamento.PIX: Decimal("1200.00"),
        FormaPagamento.CARTAO_CREDITO: Decimal("800.00")
    }
    
    conciliacao = service.conciliar(saldo_teorico, saldo_contado)
    assert conciliacao.houve_divergencia is True
    assert conciliacao.diferenca_total == Decimal("-20.00")
    assert conciliacao.status == "QUEBRA_DE_CAIXA"
