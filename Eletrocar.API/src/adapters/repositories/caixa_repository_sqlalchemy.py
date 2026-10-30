"""
Implementação SQLAlchemy do CaixaRepositoryInterface.
"""
from decimal import Decimal
from typing import Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.caixa import CaixaDiario, MovimentacaoCaixa
from src.domain.value_objects.enums import FormaPagamento, TipoMovimentacaoCaixa, StatusCaixa
from src.domain.repositories.interfaces import CaixaRepositoryInterface
from src.infra.database.models import CaixaDiarioModel, MovimentacaoCaixaModel


class CaixaRepositorySQLAlchemy(CaixaRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, caixa: CaixaDiario) -> CaixaDiario:
        model = await self.session.get(CaixaDiarioModel, caixa.id)
        if not model:
            model = CaixaDiarioModel(id=caixa.id, movimentacoes=[])
            self.session.add(model)

        model.operador_id = caixa.operador_id
        model.saldo_inicial = caixa.saldo_inicial
        model.status = caixa.status.value
        model.data_abertura = caixa.data_abertura
        model.data_fechamento = caixa.data_fechamento
        model.diferenca_fechamento = caixa.diferenca_fechamento
        model.totais_informados_fechamento = (
            {forma.value: str(valor) for forma, valor in caixa.totais_informados_fechamento.items()}
            if caixa.totais_informados_fechamento is not None else None
        )

        existentes = {m.id for m in model.movimentacoes}
        for mov in caixa.movimentacoes:
            if mov.id not in existentes:
                model.movimentacoes.append(MovimentacaoCaixaModel(
                    id=mov.id, caixa_id=caixa.id, tipo=mov.tipo.value, valor=mov.valor,
                    forma_pagamento=mov.forma_pagamento.value, descricao=mov.descricao, created_at=mov.created_at
                ))

        await self.session.flush()
        return caixa

    async def buscar_por_id(self, caixa_id: uuid.UUID) -> Optional[CaixaDiario]:
        model = await self.session.get(CaixaDiarioModel, caixa_id)
        return self._to_entity(model) if model else None

    async def obter_caixa_aberto(self) -> Optional[CaixaDiario]:
        stmt = (
            select(CaixaDiarioModel)
            .where(CaixaDiarioModel.status == StatusCaixa.ABERTO.value)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        model = (await self.session.execute(stmt)).scalar_one_or_none()
        return self._to_entity(model) if model else None

    @staticmethod
    def _to_entity(m: CaixaDiarioModel) -> CaixaDiario:
        return CaixaDiario(
            id=m.id,
            operador_id=m.operador_id,
            saldo_inicial=Decimal(m.saldo_inicial),
            status=StatusCaixa(m.status),
            movimentacoes=[
                MovimentacaoCaixa(
                    id=mov.id, caixa_id=mov.caixa_id, tipo=TipoMovimentacaoCaixa(mov.tipo), valor=Decimal(mov.valor),
                    forma_pagamento=FormaPagamento(mov.forma_pagamento), descricao=mov.descricao,
                    created_at=mov.created_at
                )
                for mov in m.movimentacoes
            ],
            data_abertura=m.data_abertura,
            data_fechamento=m.data_fechamento,
            totais_informados_fechamento=(
                {FormaPagamento(forma): Decimal(valor) for forma, valor in m.totais_informados_fechamento.items()}
                if m.totais_informados_fechamento is not None else None
            ),
            diferenca_fechamento=Decimal(m.diferenca_fechamento) if m.diferenca_fechamento is not None else None
        )
