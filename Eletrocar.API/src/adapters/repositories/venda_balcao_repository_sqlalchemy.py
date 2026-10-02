"""
Implementação SQLAlchemy do VendaBalcaoRepositoryInterface.
"""
from typing import List, Optional
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.domain.entities.venda_balcao import VendaBalcao, ItemVenda
from src.domain.value_objects.enums import FormaPagamento, StatusVenda
from src.domain.repositories.interfaces import VendaBalcaoRepositoryInterface
from src.infra.database.models import VendaBalcaoModel, ItemVendaModel


class VendaBalcaoRepositorySQLAlchemy(VendaBalcaoRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, venda: VendaBalcao) -> VendaBalcao:
        model = await self.session.get(VendaBalcaoModel, str(venda.id))
        if not model:
            model = VendaBalcaoModel(id=str(venda.id))
            self.session.add(model)

        model.numero_venda = venda.numero_venda
        model.operador_id = str(venda.operador_id)
        model.cliente_id = str(venda.cliente_id) if venda.cliente_id else None
        model.desconto = venda.desconto
        model.forma_pagamento = venda.forma_pagamento.value if venda.forma_pagamento else None
        model.status = venda.status.value
        model.created_at = venda.created_at

        for item in venda.itens:
            item_model = await self.session.get(ItemVendaModel, str(item.id))
            if not item_model:
                item_model = ItemVendaModel(
                    id=str(item.id),
                    venda_id=str(venda.id),
                    peca_id=str(item.peca_id),
                    descricao_peca=item.descricao_peca,
                    quantidade=item.quantidade,
                    preco_unitario=item.preco_unitario
                )
                self.session.add(item_model)

        await self.session.flush()
        return venda

    async def buscar_por_id(self, venda_id: uuid.UUID) -> Optional[VendaBalcao]:
        model = await self.session.get(VendaBalcaoModel, str(venda_id))
        if not model:
            return None
        return self._to_entity(model)

    async def listar_recentes(self, limite: int = 50) -> List[VendaBalcao]:
        stmt = select(VendaBalcaoModel).order_by(VendaBalcaoModel.created_at.desc()).limit(limite)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_entity(m) for m in models]

    async def obter_proximo_numero_venda(self) -> str:
        stmt = select(func.count(VendaBalcaoModel.id))
        res = await self.session.execute(stmt)
        total = res.scalar() or 0
        return f"VND-{(total + 1):05d}"

    def _to_entity(self, m: VendaBalcaoModel) -> VendaBalcao:
        itens = [
            ItemVenda(
                id=uuid.UUID(it.id),
                venda_id=uuid.UUID(it.venda_id),
                peca_id=uuid.UUID(it.peca_id),
                descricao_peca=it.descricao_peca,
                quantidade=it.quantidade,
                preco_unitario=Decimal(str(it.preco_unitario))
            )
            for it in m.itens
        ]
        return VendaBalcao(
            id=uuid.UUID(m.id),
            numero_venda=m.numero_venda,
            operador_id=uuid.UUID(m.operador_id),
            cliente_id=uuid.UUID(m.cliente_id) if m.cliente_id else None,
            itens=itens,
            desconto=Decimal(str(m.desconto or 0)),
            forma_pagamento=FormaPagamento(m.forma_pagamento) if m.forma_pagamento else None,
            status=StatusVenda(m.status),
            created_at=m.created_at
        )
