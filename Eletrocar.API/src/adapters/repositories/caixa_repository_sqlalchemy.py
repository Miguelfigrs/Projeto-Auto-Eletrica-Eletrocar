"""
Implementação SQLAlchemy do CaixaRepositoryInterface.
"""
from typing import Optional
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.domain.entities.caixa import CaixaDiario, MovimentacaoCaixa
from src.domain.value_objects.enums import FormaPagamento, TipoMovimentacaoCaixa, StatusCaixa
from src.domain.repositories.interfaces import CaixaRepositoryInterface
from src.infra.database.models import CaixaDiarioModel, MovimentacaoCaixaModel


class CaixaRepositorySQLAlchemy(CaixaRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, caixa: CaixaDiario) -> CaixaDiario:
        model = await self.session.get(CaixaDiarioModel, str(caixa.id))
        if not model:
            model = CaixaDiarioModel(id=str(caixa.id))
            self.session.add(model)

        model.operador_id = str(caixa.operador_id)
        model.saldo_inicial = caixa.saldo_inicial
        model.status = caixa.status.value
        model.data_abertura = caixa.data_abertura
        model.data_fechamento = caixa.data_fechamento
        model.diferenca_fechamento = caixa.diferenca_fechamento
        model.totais_informados_fechamento = {
            k: str(v) for k, v in caixa.totais_informados_fechamento.items()
        } if caixa.totais_informados_fechamento else None

        for mov in caixa.movimentacoes:
            mov_model = await self.session.get(MovimentacaoCaixaModel, str(mov.id))
            if not mov_model:
                mov_model = MovimentacaoCaixaModel(
                    id=str(mov.id),
                    caixa_id=str(caixa.id),
                    tipo=mov.tipo.value,
                    valor=mov.valor,
                    forma_pagamento=mov.forma_pagamento.value,
                    descricao=mov.descricao,
                    created_at=mov.created_at
                )
                self.session.add(mov_model)

        await self.session.flush()
        return caixa

    async def buscar_por_id(self, caixa_id: uuid.UUID) -> Optional[CaixaDiario]:
        model = await self.session.get(CaixaDiarioModel, str(caixa_id))
        if not model:
            return None
        return self._to_entity(model)

    async def obter_caixa_aberto(self) -> Optional[CaixaDiario]:
        stmt = select(CaixaDiarioModel).where(CaixaDiarioModel.status == StatusCaixa.ABERTO.value)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    def _to_entity(self, m: CaixaDiarioModel) -> CaixaDiario:
        movimentacoes = [
            MovimentacaoCaixa(
                id=uuid.UUID(mov.id),
                caixa_id=uuid.UUID(mov.caixa_id),
                tipo=TipoMovimentacaoCaixa(mov.tipo),
                valor=Decimal(str(mov.valor)),
                forma_pagamento=FormaPagamento(mov.forma_pagamento),
                descricao=mov.descricao,
                created_at=mov.created_at
            )
            for mov in m.movimentacoes
        ]
        return CaixaDiario(
            id=uuid.UUID(m.id),
            operador_id=uuid.UUID(m.operador_id),
            saldo_inicial=Decimal(str(m.saldo_inicial)),
            status=StatusCaixa(m.status),
            movimentacoes=movimentacoes,
            data_abertura=m.data_abertura,
            data_fechamento=m.data_fechamento,
            diferenca_fechamento=Decimal(str(m.diferenca_fechamento)) if m.diferenca_fechamento is not None else None
        )
