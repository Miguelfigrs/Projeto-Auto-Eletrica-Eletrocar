"""
DTOs para relatório de DRE Gerencial.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal


@dataclass
class PeriodoDREInputDTO:
    data_inicio: date
    data_fim: date
    percentual_custo_mao_obra: Decimal = Decimal("40")  # Repasse/comissão do eletricista sobre a mão de obra


@dataclass
class RelatorioDREOutputDTO:
    periodo: str
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
    quantidade_vendas: int
    quantidade_os: int


@dataclass
class ResumoMensalDREItemDTO:
    """Resumo mensal consolidado da DRE para análise de lucros e prejuízos."""

    ano: int
    mes: int
    competencia: str
    receita_bruta_total: Decimal
    receita_liquida: Decimal
    custos_diretos_total: Decimal
    despesas_totais: Decimal
    lucro_bruto: Decimal
    lucro_liquido: Decimal
    margem_lucro_liquido_percentual: Decimal
    eh_lucro: bool
    eh_prejuizo: bool
    quantidade_vendas: int
    quantidade_os: int


@dataclass
class ResumoMensalDREOutputDTO:
    """Lista mensal filtrada de resultados da DRE no ano selecionado."""

    ano: int
    filtro_resultado: str
    total_meses_filtrados: int
    soma_lucros: Decimal
    soma_prejuizos: Decimal
    saldo_liquido_filtrado: Decimal
    meses: list[ResumoMensalDREItemDTO]


# ---- Detalhamento do período (o que foi vendido / gasto) ---------------------------------------

@dataclass
class ItemDetalheDTO:
    descricao: str
    quantidade: int
    preco_unitario: Decimal
    custo_unitario: Decimal
    total: Decimal


@dataclass
class VendaDetalheDTO:
    id: str
    numero: str
    data: datetime
    operador: Optional[str]
    forma_pagamento: Optional[str]
    subtotal: Decimal
    desconto: Decimal
    total: Decimal
    custo: Decimal
    lucro_bruto: Decimal
    itens: List[ItemDetalheDTO]


@dataclass
class ServicoDetalheDTO:
    descricao: str
    valor: Decimal


@dataclass
class OrdemServicoDetalheDTO:
    id: str
    numero: str
    data: datetime
    forma_pagamento: Optional[str]
    valor_pecas: Decimal
    valor_servicos: Decimal
    desconto: Decimal
    total: Decimal
    custo_pecas: Decimal
    itens: List[ItemDetalheDTO]
    servicos: List[ServicoDetalheDTO]


@dataclass
class DespesaDetalheDTO:
    id: str
    descricao: str
    categoria: str
    valor: Decimal
    data_pagamento: Optional[date]
    forma_pagamento: Optional[str]
    entra_no_dre: bool = True


@dataclass
class DetalhamentoDREOutputDTO:
    periodo: str
    total_vendas: Decimal
    total_ordens_servico: Decimal
    total_despesas: Decimal
    vendas: List[VendaDetalheDTO] = field(default_factory=list)
    ordens_servico: List[OrdemServicoDetalheDTO] = field(default_factory=list)
    despesas: List[DespesaDetalheDTO] = field(default_factory=list)
