"""
Implementação SQLAlchemy do PecaRepositoryInterface.
"""
from typing import List, Optional
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from src.domain.entities.peca import Peca
from src.domain.repositories.interfaces import PecaRepositoryInterface
from src.infra.database.models import PecaModel


class PecaRepositorySQLAlchemy(PecaRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, peca: Peca) -> Peca:
        model = await self.session.get(PecaModel, str(peca.id))
        if not model:
            model = PecaModel(id=str(peca.id))
            self.session.add(model)

        model.codigo_barras = peca.codigo_barras
        model.sku = peca.sku
        model.descricao = peca.descricao
        model.preco_custo = peca.preco_custo
        model.preco_venda = peca.preco_venda
        model.estoque_atual = peca.estoque_atual
        model.estoque_minimo = peca.estoque_minimo
        model.localizacao = peca.localizacao
        model.unidade_medida = peca.unidade_medida
        model.ativo = peca.ativo
        model.created_at = peca.created_at

        await self.session.flush()
        return peca

    async def buscar_por_id(self, peca_id: uuid.UUID) -> Optional[Peca]:
        model = await self.session.get(PecaModel, str(peca_id))
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_codigo_barras(self, codigo_barras: str) -> Optional[Peca]:
        stmt = select(PecaModel).where(PecaModel.codigo_barras == codigo_barras.strip())
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_sku(self, sku: str) -> Optional[Peca]:
        stmt = select(PecaModel).where(PecaModel.sku == sku.strip().upper())
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_termo(self, termo: str) -> List[Peca]:
        like_termo = f"%{termo.strip()}%"
        stmt = select(PecaModel).where(
            or_(
                PecaModel.descricao.ilike(like_termo),
                PecaModel.sku.ilike(like_termo),
                PecaModel.codigo_barras.ilike(like_termo)
            )
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_entity(m) for m in models]

    async def listar_baixo_estoque(self) -> List[Peca]:
        stmt = select(PecaModel).where(PecaModel.estoque_atual <= PecaModel.estoque_minimo)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_entity(m) for m in models]

    def _to_entity(self, m: PecaModel) -> Peca:
        return Peca(
            id=uuid.UUID(m.id),
            codigo_barras=m.codigo_barras,
            sku=m.sku,
            descricao=m.descricao,
            preco_custo=Decimal(str(m.preco_custo)),
            preco_venda=Decimal(str(m.preco_venda)),
            estoque_atual=m.estoque_atual,
            estoque_minimo=m.estoque_minimo,
            localizacao=m.localizacao,
            unidade_medida=m.unidade_medida,
            ativo=m.ativo,
            created_at=m.created_at
        )
