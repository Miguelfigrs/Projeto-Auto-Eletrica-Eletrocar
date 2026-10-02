"""
DTOs para relatório de DRE Gerencial.
"""
from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass
class PeriodoDREInputDTO:
    data_inicio: date
    data_fim: date
    despesas_fixas: Decimal = Decimal("0.00")
    despesas_variaveis: Decimal = Decimal("0.00")


@dataclass
class RelatorioDREOutputDTO:
    periodo: str
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
