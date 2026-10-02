"""
Caso de Uso: GerarRelatorioDREUseCase
Consolida vendas, ordens de serviço finalizadas e custos diretos no DRE contábil/gerencial.
"""
from decimal import Decimal
from src.domain.services.calculadora_dre_service import CalculadoraDREService
from src.domain.repositories.interfaces import (
    VendaBalcaoRepositoryInterface,
    OrdemServicoRepositoryInterface
)
from src.application.dtos.dre_dtos import PeriodoDREInputDTO, RelatorioDREOutputDTO


class GerarRelatorioDREUseCase:
    def __init__(
        self,
        venda_repo: VendaBalcaoRepositoryInterface,
        os_repo: OrdemServicoRepositoryInterface
    ):
        self.venda_repo = venda_repo
        self.os_repo = os_repo

    async def executar(self, input_dto: PeriodoDREInputDTO) -> RelatorioDREOutputDTO:
        # Busca todas as vendas recentes
        vendas = await self.venda_repo.listar_recentes(limite=1000)
        # Busca todas as ordens de serviço
        ordens = await self.os_repo.listar()

        # Totalizadores
        receita_produtos = sum((v.valor_total for v in vendas), Decimal("0.00"))
        
        # CMV aproximado (considerando margem média de 40% nas peças vendidas ou custo registrado)
        cmv_estimado = (receita_produtos * Decimal("0.60")).quantize(Decimal("0.01"))

        # Ordens de serviço concluídas/entregues
        receita_servicos = Decimal("0.00")
        custo_mao_obra = Decimal("0.00")

        for os in ordens:
            if os.status.value in ["FINALIZADO", "ENTREGUE"]:
                receita_servicos += os.valor_servicos
                receita_produtos += os.valor_pecas
                # Custo estimado de peças alocadas na OS
                cmv_estimado += (os.valor_pecas * Decimal("0.60")).quantize(Decimal("0.01"))
                # Repasse / custo direto estimado da mão de obra (ex: 40%)
                custo_mao_obra += (os.valor_servicos * Decimal("0.40")).quantize(Decimal("0.01"))

        resultado = CalculadoraDREService.calcular(
            receita_vendas_produtos=receita_produtos,
            receita_servicos_os=receita_servicos,
            custo_mercadorias_vendidas=cmv_estimado,
            custo_mao_obra_direta=custo_mao_obra,
            despesas_operacionais_fixas=input_dto.despesas_fixas,
            despesas_variaveis=input_dto.despesas_variaveis
        )

        periodo_str = f"{input_dto.data_inicio.strftime('%d/%m/%Y')} a {input_dto.data_fim.strftime('%d/%m/%Y')}"

        return RelatorioDREOutputDTO(
            periodo=periodo_str,
            receita_vendas_produtos=resultado.receita_vendas_produtos,
            receita_servicos_os=resultado.receita_servicos_os,
            receita_bruta_total=resultado.receita_bruta_total,
            custo_mercadorias_vendidas=resultado.custo_mercadorias_vendidas,
            custo_mao_obra_direta=resultado.custo_mao_obra_direta,
            custos_diretos_total=resultado.custos_diretos_total,
            lucro_bruto=resultado.lucro_bruto,
            margem_bruta_percentual=resultado.margem_bruta_percentual,
            despesas_operacionais_fixas=resultado.despesas_operacionais_fixas,
            despesas_variaveis=resultado.despesas_variaveis,
            despesas_totais=resultado.despesas_totais,
            lucro_liquido=resultado.lucro_liquido,
            margem_lucro_liquido_percentual=resultado.margem_lucro_liquido_percentual
        )
