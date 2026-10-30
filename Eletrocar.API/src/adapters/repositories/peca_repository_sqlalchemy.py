"""
Implementação SQLAlchemy do PecaRepositoryInterface.
Baixa/reserva de estoque protegida por SELECT ... FOR UPDATE (PostgreSQL) e bloqueio otimista (coluna versao).
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
import uuid
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.peca import Peca
from src.domain.value_objects.enums import StatusVenda, StatusOS
from src.domain.repositories.interfaces import PecaRepositoryInterface
from src.infra.database.models import (
    PecaModel, ItemVendaModel, VendaBalcaoModel, ItemOSModel, OrdemServicoModel
)
from src.adapters.repositories.base import flush_com_bloqueio_otimista

CAMPOS_BUSCA = (
    PecaModel.descricao,
    PecaModel.sku,
    PecaModel.codigo_barras,
    PecaModel.codigo_original_fabricante,
    PecaModel.fabricante,
    PecaModel.aplicacao_veicular,
)


class PecaRepositorySQLAlchemy(PecaRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session
        # Referências fortes aos modelos lidos nesta transação: o identity map do SQLAlchemy é fraco e,
        # sem isso, a versão lida (bloqueio otimista) se perderia antes do UPDATE.
        self._lidos: Dict[uuid.UUID, PecaModel] = {}

    async def salvar(self, peca: Peca) -> Peca:
        model = self._lidos.get(peca.id) or await self.session.get(PecaModel, peca.id)
        if not model:
            model = PecaModel(id=peca.id)
            self.session.add(model)

        model.codigo_barras = peca.codigo_barras
        model.sku = peca.sku
        model.codigo_original_fabricante = peca.codigo_original_fabricante
        model.fabricante = peca.fabricante
        model.aplicacao_veicular = peca.aplicacao_veicular
        model.descricao = peca.descricao
        model.preco_custo = peca.preco_custo
        model.preco_venda = peca.preco_venda
        model.estoque_atual = peca.estoque_atual
        model.estoque_reservado = peca.estoque_reservado
        model.estoque_minimo = peca.estoque_minimo
        model.localizacao = peca.localizacao
        model.unidade_medida = peca.unidade_medida
        model.ativo = peca.ativo
        model.created_at = peca.created_at

        await flush_com_bloqueio_otimista(self.session, f"A peça '{peca.sku}'")
        self._lidos[peca.id] = model
        return peca

    async def buscar_por_id(self, peca_id: uuid.UUID) -> Optional[Peca]:
        model = await self.session.get(PecaModel, peca_id)
        return self._to_entity(model) if model else None

    async def buscar_por_id_para_atualizacao(self, peca_id: uuid.UUID) -> Optional[Peca]:
        stmt = (
            select(PecaModel)
            .where(PecaModel.id == peca_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def buscar_por_codigo_barras(self, codigo_barras: str) -> Optional[Peca]:
        return await self._uma(select(PecaModel).where(PecaModel.codigo_barras == codigo_barras.strip()))

    async def buscar_por_sku(self, sku: str) -> Optional[Peca]:
        return await self._uma(select(PecaModel).where(PecaModel.sku == sku.strip().upper()))

    async def buscar_por_termo(self, termo: str) -> List[Peca]:
        # Cada palavra precisa aparecer em algum campo: "alternador gol 1.6" (aplicação veicular - RF07)
        condicoes = [or_(*(campo.ilike(f"%{palavra}%") for campo in CAMPOS_BUSCA)) for palavra in termo.split()]
        if not condicoes:
            return []
        stmt = select(PecaModel).where(and_(*condicoes)).order_by(PecaModel.descricao).limit(50)
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    async def listar_ativas(self) -> List[Peca]:
        res = await self.session.execute(select(PecaModel).where(PecaModel.ativo.is_(True)))
        return [self._to_entity(m) for m in res.scalars().all()]

    async def listar_baixo_estoque(self) -> List[Peca]:
        stmt = select(PecaModel).where(
            PecaModel.ativo.is_(True),
            PecaModel.estoque_atual - PecaModel.estoque_reservado <= PecaModel.estoque_minimo,
        ).order_by(PecaModel.descricao)
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    async def consumo_por_peca(self, desde: datetime) -> Dict[uuid.UUID, int]:
        vendas = (
            select(ItemVendaModel.peca_id, func.sum(ItemVendaModel.quantidade))
            .join(VendaBalcaoModel, VendaBalcaoModel.id == ItemVendaModel.venda_id)
            .where(VendaBalcaoModel.status == StatusVenda.CONCLUIDA.value, VendaBalcaoModel.created_at >= desde)
            .group_by(ItemVendaModel.peca_id)
        )
        ordens = (
            select(ItemOSModel.peca_id, func.sum(ItemOSModel.quantidade))
            .join(OrdemServicoModel, OrdemServicoModel.id == ItemOSModel.ordem_servico_id)
            .where(
                OrdemServicoModel.status.in_([StatusOS.FINALIZADO.value, StatusOS.ENTREGUE.value]),
                OrdemServicoModel.finalizada_em >= desde,
            )
            .group_by(ItemOSModel.peca_id)
        )
        consumo: Dict[uuid.UUID, int] = {}
        for stmt in (vendas, ordens):
            for peca_id, quantidade in (await self.session.execute(stmt)).all():
                consumo[peca_id] = consumo.get(peca_id, 0) + int(quantidade or 0)
        return consumo

    async def _uma(self, stmt) -> Optional[Peca]:
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model else None

    def _to_entity(self, m: PecaModel) -> Peca:
        self._lidos[m.id] = m
        return Peca(
            id=m.id,
            codigo_barras=m.codigo_barras,
            sku=m.sku,
            descricao=m.descricao,
            preco_custo=Decimal(m.preco_custo),
            preco_venda=Decimal(m.preco_venda),
            estoque_atual=m.estoque_atual,
            estoque_minimo=m.estoque_minimo,
            estoque_reservado=m.estoque_reservado,
            codigo_original_fabricante=m.codigo_original_fabricante,
            fabricante=m.fabricante,
            aplicacao_veicular=m.aplicacao_veicular,
            localizacao=m.localizacao,
            unidade_medida=m.unidade_medida,
            ativo=m.ativo,
            created_at=m.created_at
        )
