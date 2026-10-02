"""
Domain Service: CalculadoraDREService
Calcula o DRE Gerencial (Demonstrativo do Resultado do Exercício) da oficina mecânica.
"""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True)
class ResultadoDRE:
    receita_vendas_produtos: Decimal
    receita_servicos_os: Decimal
    receita_bruta_total: Decimal
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


class CalculadoraDREService:
    """Calcula indicadores contábeis e de rentabilidade para gestão gerencial."""

    @staticmethod
    def calcular(
        receita_vendas_produtos: Decimal,
        receita_servicos_os: Decimal,
        custo_mercadorias_vendidas: Decimal,
        custo_mao_obra_direta: Decimal,
        despesas_operacionais_fixas: Decimal = Decimal("0.00"),
        despesas_variaveis: Decimal = Decimal("0.00")
    ) -> ResultadoDRE:
        receita_bruta = (receita_vendas_produtos + receita_servicos_os).quantize(Decimal("0.01"))
        custos_diretos = (custo_mercadorias_vendidas + custo_mao_obra_direta).quantize(Decimal("0.01"))
        lucro_bruto = (receita_bruta - custos_diretos).quantize(Decimal("0.01"))

        if receita_bruta > Decimal("0.00"):
            margem_bruta = ((lucro_bruto / receita_bruta) * Decimal("100.00")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            margem_bruta = Decimal("0.00")

        despesas_totais = (despesas_operacionais_fixas + despesas_variaveis).quantize(Decimal("0.01"))
        lucro_liquido = (lucro_bruto - despesas_totais).quantize(Decimal("0.01"))

        if receita_bruta > Decimal("0.00"):
            margem_liquida = ((lucro_liquido / receita_bruta) * Decimal("100.00")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            margem_liquida = Decimal("0.00")

        return ResultadoDRE(
            receita_vendas_produtos=receita_vendas_produtos.quantize(Decimal("0.01")),
            receita_servicos_os=receita_servicos_os.quantize(Decimal("0.01")),
            receita_bruta_total=receita_bruta,
            custo_mercadorias_vendidas=custo_mercadorias_vendidas.quantize(Decimal("0.01")),
            custo_mao_obra_direta=custo_mao_obra_direta.quantize(Decimal("0.01")),
            custos_diretos_total=custos_diretos,
            lucro_bruto=lucro_bruto,
            margem_bruta_percentual=margem_bruta,
            despesas_operacionais_fixas=despesas_operacionais_fixas.quantize(Decimal("0.01")),
            despesas_variaveis=despesas_variaveis.quantize(Decimal("0.01")),
            despesas_totais=despesas_totais,
            lucro_liquido=lucro_liquido,
            margem_lucro_liquido_percentual=margem_liquida
        )
