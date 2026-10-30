"""
Domain Service: CalculadoraDREService
Calcula o DRE Gerencial (Demonstrativo do Resultado do Exercício) da oficina:
Receita Bruta - Deduções (descontos) = Receita Líquida - (CMV + Mão de Obra) = Lucro Bruto
- Despesas Operacionais = Lucro Líquido.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

CENTAVO = Decimal("0.01")


@dataclass(frozen=True)
class ResultadoDRE:
    receita_vendas_produtos: Decimal
    receita_servicos_os: Decimal
    receita_bruta_total: Decimal
    deducoes_descontos: Decimal
    receita_liquida: Decimal
    custo_mercadorias_vendidas: Decimal
    custo_mao_obra_direta: Decimal
    custos_diretos_total: Decimal
    lucro_bruto: Decimal
    margem_bruta_percentual: Decimal
    despesas_operacionais_fixas: Decimal
    despesas_variaveis: Decimal
    despesas_totais: Decimal
    lucro_liquido: Decimal
    margem_lucro_liquido_percentual: Decimal


def _percentual(parte: Decimal, total: Decimal) -> Decimal:
    if total <= Decimal("0.00"):
        return Decimal("0.00")
    return (parte / total * Decimal("100")).quantize(CENTAVO, rounding=ROUND_HALF_UP)


class CalculadoraDREService:
    """Calcula indicadores contábeis e de rentabilidade para gestão gerencial."""

    @staticmethod
    def calcular(
        receita_vendas_produtos: Decimal,
        receita_servicos_os: Decimal,
        custo_mercadorias_vendidas: Decimal,
        custo_mao_obra_direta: Decimal,
        despesas_operacionais_fixas: Decimal = Decimal("0.00"),
        despesas_variaveis: Decimal = Decimal("0.00"),
        deducoes_descontos: Decimal = Decimal("0.00"),
    ) -> ResultadoDRE:
        receita_bruta = (receita_vendas_produtos + receita_servicos_os).quantize(CENTAVO)
        receita_liquida = (receita_bruta - deducoes_descontos).quantize(CENTAVO)
        custos_diretos = (custo_mercadorias_vendidas + custo_mao_obra_direta).quantize(CENTAVO)
        lucro_bruto = (receita_liquida - custos_diretos).quantize(CENTAVO)
        despesas_totais = (despesas_operacionais_fixas + despesas_variaveis).quantize(CENTAVO)
        lucro_liquido = (lucro_bruto - despesas_totais).quantize(CENTAVO)

        return ResultadoDRE(
            receita_vendas_produtos=receita_vendas_produtos.quantize(CENTAVO),
            receita_servicos_os=receita_servicos_os.quantize(CENTAVO),
            receita_bruta_total=receita_bruta,
            deducoes_descontos=deducoes_descontos.quantize(CENTAVO),
            receita_liquida=receita_liquida,
            custo_mercadorias_vendidas=custo_mercadorias_vendidas.quantize(CENTAVO),
            custo_mao_obra_direta=custo_mao_obra_direta.quantize(CENTAVO),
            custos_diretos_total=custos_diretos,
            lucro_bruto=lucro_bruto,
            margem_bruta_percentual=_percentual(lucro_bruto, receita_liquida),
            despesas_operacionais_fixas=despesas_operacionais_fixas.quantize(CENTAVO),
            despesas_variaveis=despesas_variaveis.quantize(CENTAVO),
            despesas_totais=despesas_totais,
            lucro_liquido=lucro_liquido,
            margem_lucro_liquido_percentual=_percentual(lucro_liquido, receita_liquida),
        )
