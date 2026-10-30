"""
Caso de Uso: GerarRelatorioDREUseCase (UC07 / RF19)
Consolida no período informado:
- vendas de balcão concluídas e OS entregues (faturadas);
- CMV real, a partir do custo congelado em cada item vendido/aplicado;
- descontos como deduções da receita;
- custo de mão de obra pelo percentual de repasse ao eletricista;
- despesas fixas e variáveis das contas a pagar quitadas no período.
"""
from dataclasses import asdict
from datetime import datetime, time
from decimal import Decimal
from src.domain.services.calculadora_dre_service import CalculadoraDREService
from src.domain.value_objects.enums import TipoTitulo, CategoriaTitulo
from src.domain.repositories.interfaces import (
    VendaBalcaoRepositoryInterface,
    OrdemServicoRepositoryInterface,
    TituloFinanceiroRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.application.dtos.dre_dtos import PeriodoDREInputDTO, RelatorioDREOutputDTO

ZERO = Decimal("0.00")


class GerarRelatorioDREUseCase:
    def __init__(
        self,
        venda_repo: VendaBalcaoRepositoryInterface,
        os_repo: OrdemServicoRepositoryInterface,
        titulo_repo: TituloFinanceiroRepositoryInterface,
    ):
        self.venda_repo = venda_repo
        self.os_repo = os_repo
        self.titulo_repo = titulo_repo

    async def executar(self, dto: PeriodoDREInputDTO) -> RelatorioDREOutputDTO:
        if dto.data_fim < dto.data_inicio:
            raise RegraNegocioException("A data final do período deve ser maior ou igual à inicial.")
        inicio = datetime.combine(dto.data_inicio, time.min)
        fim = datetime.combine(dto.data_fim, time.max)

        vendas = await self.venda_repo.listar_concluidas_no_periodo(inicio, fim)
        ordens = await self.os_repo.listar_entregues_no_periodo(inicio, fim)
        despesas = await self.titulo_repo.listar_pagos_no_periodo(TipoTitulo.PAGAR, dto.data_inicio, dto.data_fim)

        receita_produtos = sum((v.subtotal for v in vendas), ZERO) + sum((os.valor_pecas for os in ordens), ZERO)
        receita_servicos = sum((os.valor_servicos for os in ordens), ZERO)
        deducoes = sum((v.desconto for v in vendas), ZERO) + sum((os.desconto for os in ordens), ZERO)
        cmv = sum((v.custo_total for v in vendas), ZERO) + sum((os.custo_pecas for os in ordens), ZERO)
        custo_mao_obra = receita_servicos * dto.percentual_custo_mao_obra / Decimal("100")
        fixas = sum((t.valor for t in despesas if t.categoria == CategoriaTitulo.DESPESA_FIXA), ZERO)
        variaveis = sum((t.valor for t in despesas if t.categoria == CategoriaTitulo.DESPESA_VARIAVEL), ZERO)

        resultado = CalculadoraDREService.calcular(
            receita_vendas_produtos=receita_produtos,
            receita_servicos_os=receita_servicos,
            custo_mercadorias_vendidas=cmv,
            custo_mao_obra_direta=custo_mao_obra,
            despesas_operacionais_fixas=fixas,
            despesas_variaveis=variaveis,
            deducoes_descontos=deducoes,
        )

        return RelatorioDREOutputDTO(
            periodo=f"{dto.data_inicio.strftime('%d/%m/%Y')} a {dto.data_fim.strftime('%d/%m/%Y')}",
            quantidade_vendas=len(vendas),
            quantidade_os=len(ordens),
            **asdict(resultado),
        )
