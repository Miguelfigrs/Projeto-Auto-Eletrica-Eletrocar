"""
Implementação SQLAlchemy do VendaBalcaoRepositoryInterface.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.venda_balcao import VendaBalcao, ItemVenda
from src.domain.value_objects.enums import FormaPagamento, StatusVenda
from src.domain.repositories.interfaces import VendaBalcaoRepositoryInterface
from src.infra.database.models import VendaBalcaoModel, ItemVendaModel
from src.adapters.repositories.base import proximo_numero


class VendaBalcaoRepositorySQLAlchemy(VendaBalcaoRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, venda: VendaBalcao) -> VendaBalcao:
        model = await self.session.get(VendaBalcaoModel, venda.id)
        if not model:
            model = VendaBalcaoModel(id=venda.id, itens=[])
            self.session.add(model)

        model.numero_venda = venda.numero_venda
        model.operador_id = venda.operador_id
        model.cliente_id = venda.cliente_id
        model.desconto = venda.desconto
        model.forma_pagamento = venda.forma_pagamento.value if venda.forma_pagamento else None
        model.status = venda.status.value
        model.autorizado_por_id = venda.autorizado_por_id
        model.referencia_pagamento = venda.referencia_pagamento
        model.motivo_cancelamento = venda.motivo_cancelamento
        model.cancelada_em = venda.cancelada_em
        model.created_at = venda.created_at

        existentes = {i.id for i in model.itens}
        for item in venda.itens:
            if item.id not in existentes:
                model.itens.append(ItemVendaModel(
                    id=item.id, venda_id=venda.id, peca_id=item.peca_id, descricao_peca=item.descricao_peca,
                    quantidade=item.quantidade, preco_unitario=item.preco_unitario, custo_unitario=item.custo_unitario
                ))

        await self.session.flush()
        return venda

    async def buscar_por_id(self, venda_id: uuid.UUID) -> Optional[VendaBalcao]:
        model = await self.session.get(VendaBalcaoModel, venda_id)
        return self._to_entity(model) if model else None

    async def listar_recentes(self, limite: int = 50, operador_id: Optional[uuid.UUID] = None) -> List[VendaBalcao]:
        stmt = select(VendaBalcaoModel).order_by(VendaBalcaoModel.created_at.desc()).limit(limite)
        if operador_id:
            stmt = stmt.where(VendaBalcaoModel.operador_id == operador_id)
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    async def listar_concluidas_no_periodo(self, inicio: datetime, fim: datetime) -> List[VendaBalcao]:
        stmt = select(VendaBalcaoModel).where(
            VendaBalcaoModel.status == StatusVenda.CONCLUIDA.value,
            VendaBalcaoModel.created_at >= inicio,
            VendaBalcaoModel.created_at <= fim,
        )
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    async def obter_proximo_numero_venda(self) -> str:
        return await proximo_numero(self.session, "VB")

    @staticmethod
    def _to_entity(m: VendaBalcaoModel) -> VendaBalcao:
        return VendaBalcao(
            id=m.id,
            numero_venda=m.numero_venda,
            operador_id=m.operador_id,
            cliente_id=m.cliente_id,
            itens=[
                ItemVenda(
                    id=it.id, venda_id=it.venda_id, peca_id=it.peca_id, descricao_peca=it.descricao_peca,
                    quantidade=it.quantidade, preco_unitario=Decimal(it.preco_unitario),
                    custo_unitario=Decimal(it.custo_unitario or 0)
                )
                for it in m.itens
            ],
            desconto=Decimal(m.desconto or 0),
            forma_pagamento=FormaPagamento(m.forma_pagamento) if m.forma_pagamento else None,
            status=StatusVenda(m.status),
            autorizado_por_id=m.autorizado_por_id,
            referencia_pagamento=m.referencia_pagamento,
            motivo_cancelamento=m.motivo_cancelamento,
            cancelada_em=m.cancelada_em,
            created_at=m.created_at
        )
