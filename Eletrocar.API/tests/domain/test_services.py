"""
Testes unitários dos Domain Services (TDD).
"""
import pytest
from decimal import Decimal
from src.domain.services.calculadora_dre_service import CalculadoraDREService
from src.domain.services.conciliador_caixa_service import ConciliadorCaixaService
from src.domain.services.politica_alcada_service import PoliticaAlcadaService
from src.domain.services.sugestao_compra_service import SugestaoCompraService
from src.domain.services.normalizador_termos_eletricos_service import NormalizadorTermosEletricosService
from src.domain.value_objects.enums import FormaPagamento


def test_calculadora_dre_service():
    resultado = CalculadoraDREService.calcular(
        receita_vendas_produtos=Decimal("10000.00"),
        receita_servicos_os=Decimal("5000.00"),
        custo_mercadorias_vendidas=Decimal("6000.00"),
        custo_mao_obra_direta=Decimal("1500.00"),
        despesas_operacionais_fixas=Decimal("2000.00"),
        despesas_variaveis=Decimal("500.00")
    )

    assert resultado.receita_bruta_total == Decimal("15000.00")
    assert resultado.custos_diretos_total == Decimal("7500.00")
    assert resultado.lucro_bruto == Decimal("7500.00")
    assert resultado.margem_bruta_percentual == Decimal("50.00")
    assert resultado.despesas_totais == Decimal("2500.00")
    assert resultado.lucro_liquido == Decimal("5000.00")
    assert resultado.margem_lucro_liquido_percentual == Decimal("33.33")


def test_conciliador_caixa_quebra_de_caixa():
    teorico = {FormaPagamento.DINHEIRO: Decimal("500.00"), FormaPagamento.PIX: Decimal("1200.00")}
    contado = {FormaPagamento.DINHEIRO: Decimal("490.00"), FormaPagamento.PIX: Decimal("1200.00")}

    resultado = ConciliadorCaixaService.conciliar(teorico, contado)

    assert resultado.houve_divergencia is True
    assert resultado.diferenca_total == Decimal("-10.00")
    assert resultado.status == "QUEBRA_DE_CAIXA"
    assert resultado.diferencas_por_forma[FormaPagamento.DINHEIRO] == Decimal("-10.00")
    assert resultado.diferencas_por_forma[FormaPagamento.PIX] == Decimal("0.00")


def test_politica_alcada_desconto_dentro_do_limite_nao_exige_gerente():
    assert not PoliticaAlcadaService.exige_autorizacao(
        subtotal=Decimal("200.00"), desconto=Decimal("10.00"),
        limite_percentual=Decimal("5"), houve_alteracao_preco=False
    )


def test_politica_alcada_desconto_acima_do_limite_exige_gerente():
    assert PoliticaAlcadaService.exige_autorizacao(
        subtotal=Decimal("200.00"), desconto=Decimal("10.01"),
        limite_percentual=Decimal("5"), houve_alteracao_preco=False
    )


def test_politica_alcada_qualquer_alteracao_de_preco_exige_gerente():
    assert PoliticaAlcadaService.exige_autorizacao(
        subtotal=Decimal("200.00"), desconto=Decimal("0.00"),
        limite_percentual=Decimal("5"), houve_alteracao_preco=True
    )


def test_sugestao_de_compra_por_giro_medio():
    # 90 unidades consumidas em 90 dias = giro de 1/dia; cobertura de 30 dias + mínimo 5 - disponível 10 = 25
    sugestao = SugestaoCompraService.calcular(
        estoque_disponivel=10, estoque_minimo=5,
        consumo_periodo=90, dias_periodo=90, dias_cobertura=30
    )
    assert sugestao.giro_medio_diario == Decimal("1.00")
    assert sugestao.quantidade_sugerida == 25


def test_sugestao_de_compra_nao_sugere_quando_estoque_cobre_demanda():
    sugestao = SugestaoCompraService.calcular(
        estoque_disponivel=100, estoque_minimo=5,
        consumo_periodo=9, dias_periodo=90, dias_cobertura=30
    )
    assert sugestao.quantidade_sugerida == 0


def test_normalizador_corrige_termos_tecnicos_comuns_do_asr():
    texto = "o bendis travou e o alternado não carrega, rele de partida e xicote queimado"
    normalizado = NormalizadorTermosEletricosService.normalizar(texto)
    assert "bendix" in normalizado
    assert "alternador" in normalizado
    assert "relé" in normalizado
    assert "chicote" in normalizado
