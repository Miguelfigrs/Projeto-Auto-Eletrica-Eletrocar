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
from decimal import Decimal
from typing import Dict, Optional
import uuid
from src.domain.services.calculadora_dre_service import CalculadoraDREService
from src.domain.value_objects.tempo import limites_utc
from src.domain.value_objects.enums import TipoTitulo, CategoriaTitulo
from src.domain.repositories.interfaces import (
    VendaBalcaoRepositoryInterface,
    OrdemServicoRepositoryInterface,
    TituloFinanceiroRepositoryInterface,
    UsuarioRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.application.dtos.dre_dtos import (
    PeriodoDREInputDTO,
    RelatorioDREOutputDTO,
    DetalhamentoDREOutputDTO,
    VendaDetalheDTO,
    OrdemServicoDetalheDTO,
    DespesaDetalheDTO,
    ItemDetalheDTO,
    ServicoDetalheDTO,
)

ZERO = Decimal("0.00")
# Compras de mercadoria pagas não são despesa na DRE: o custo entra como CMV quando a peça é vendida.
CATEGORIAS_DESPESA_DRE = (CategoriaTitulo.DESPESA_FIXA, CategoriaTitulo.DESPESA_VARIAVEL)


class GerarRelatorioDREUseCase:
    def __init__(
        self,
        venda_repo: VendaBalcaoRepositoryInterface,
        os_repo: OrdemServicoRepositoryInterface,
        titulo_repo: TituloFinanceiroRepositoryInterface,
        usuario_repo: Optional[UsuarioRepositoryInterface] = None,
        fuso: str = "UTC",
    ):
        self.venda_repo = venda_repo
        self.os_repo = os_repo
        self.titulo_repo = titulo_repo
        self.usuario_repo = usuario_repo
        self.fuso = fuso

    async def _carregar(self, dto: PeriodoDREInputDTO):
        if dto.data_fim < dto.data_inicio:
            raise RegraNegocioException("A data final do período deve ser maior ou igual à inicial.")
        inicio, fim = limites_utc(dto.data_inicio, dto.data_fim, self.fuso)
        vendas = await self.venda_repo.listar_concluidas_no_periodo(inicio, fim)
        ordens = await self.os_repo.listar_entregues_no_periodo(inicio, fim)
        despesas = await self.titulo_repo.listar_pagos_no_periodo(TipoTitulo.PAGAR, dto.data_inicio, dto.data_fim)
        return vendas, ordens, despesas

    @staticmethod
    def _periodo(dto: PeriodoDREInputDTO) -> str:
        return f"{dto.data_inicio.strftime('%d/%m/%Y')} a {dto.data_fim.strftime('%d/%m/%Y')}"

    async def executar(self, dto: PeriodoDREInputDTO) -> RelatorioDREOutputDTO:
        vendas, ordens, despesas = await self._carregar(dto)

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
            periodo=self._periodo(dto),
            quantidade_vendas=len(vendas),
            quantidade_os=len(ordens),
            **asdict(resultado),
        )

    async def detalhar(self, dto: PeriodoDREInputDTO) -> DetalhamentoDREOutputDTO:
        """Lançamentos que compõem a DRE do período: cada venda, cada OS entregue e cada despesa paga."""
        vendas, ordens, despesas = await self._carregar(dto)
        nomes: Dict[uuid.UUID, Optional[str]] = {}

        async def nome_usuario(usuario_id: Optional[uuid.UUID]) -> Optional[str]:
            if usuario_id is None or self.usuario_repo is None:
                return None
            if usuario_id not in nomes:
                usuario = await self.usuario_repo.buscar_por_id(usuario_id)
                nomes[usuario_id] = usuario.nome if usuario else None
            return nomes[usuario_id]

        def item(descricao: str, quantidade: int, preco: Decimal, custo: Decimal) -> ItemDetalheDTO:
            return ItemDetalheDTO(
                descricao=descricao, quantidade=quantidade, preco_unitario=preco,
                custo_unitario=custo, total=preco * quantidade,
            )

        def forma(valor) -> Optional[str]:
            return valor.value if valor is not None else None

        vendas_dto = [
            VendaDetalheDTO(
                id=str(v.id), numero=v.numero_venda, data=v.created_at,
                operador=await nome_usuario(v.operador_id), forma_pagamento=forma(v.forma_pagamento),
                subtotal=v.subtotal, desconto=v.desconto, total=v.valor_total, custo=v.custo_total,
                lucro_bruto=v.valor_total - v.custo_total,
                itens=[item(i.descricao_peca, i.quantidade, i.preco_unitario, i.custo_unitario) for i in v.itens],
            )
            for v in sorted(vendas, key=lambda v: v.created_at, reverse=True)
        ]
        ordens_dto = [
            OrdemServicoDetalheDTO(
                id=str(os.id), numero=os.numero_os, data=os.entregue_em or os.updated_at,
                forma_pagamento=forma(os.forma_pagamento), valor_pecas=os.valor_pecas,
                valor_servicos=os.valor_servicos, desconto=os.desconto, total=os.valor_total,
                custo_pecas=os.custo_pecas,
                itens=[item(i.descricao_peca, i.quantidade, i.preco_unitario, i.custo_unitario) for i in os.itens],
                servicos=[ServicoDetalheDTO(descricao=s.descricao, valor=s.valor) for s in os.servicos],
            )
            for os in sorted(ordens, key=lambda os: os.entregue_em or os.updated_at, reverse=True)
        ]
        despesas_dto = [
            DespesaDetalheDTO(
                id=str(t.id), descricao=t.descricao, categoria=t.categoria.value, valor=t.valor,
                data_pagamento=t.data_pagamento, forma_pagamento=forma(t.forma_pagamento_baixa),
                entra_no_dre=t.categoria in CATEGORIAS_DESPESA_DRE,
            )
            for t in sorted(despesas, key=lambda t: (t.data_pagamento or t.data_vencimento), reverse=True)
        ]
        return DetalhamentoDREOutputDTO(
            periodo=self._periodo(dto),
            total_vendas=sum((v.total for v in vendas_dto), ZERO),
            total_ordens_servico=sum((o.total for o in ordens_dto), ZERO),
            total_despesas=sum((d.valor for d in despesas_dto if d.entra_no_dre), ZERO),
            vendas=vendas_dto,
            ordens_servico=ordens_dto,
            despesas=despesas_dto,
        )
