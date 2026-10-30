"""
Implementações SQLAlchemy dos repositórios financeiros: títulos (contas a pagar/receber) e cobranças PIX.
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.entities.cobranca_pix import CobrancaPix
from src.domain.value_objects.enums import (
    TipoTitulo, StatusTitulo, CategoriaTitulo, FormaPagamento, StatusCobrancaPix
)
from src.domain.repositories.interfaces import TituloFinanceiroRepositoryInterface, CobrancaPixRepositoryInterface
from src.infra.database.models import TituloFinanceiroModel, CobrancaPixModel


class TituloFinanceiroRepositorySQLAlchemy(TituloFinanceiroRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, titulo: TituloFinanceiro) -> TituloFinanceiro:
        model = await self.session.get(TituloFinanceiroModel, titulo.id)
        if not model:
            model = TituloFinanceiroModel(id=titulo.id)
            self.session.add(model)
        model.tipo = titulo.tipo.value
        model.descricao = titulo.descricao
        model.valor = titulo.valor
        model.data_vencimento = titulo.data_vencimento
        model.categoria = titulo.categoria.value
        model.status = titulo.status.value
        model.cliente_id = titulo.cliente_id
        model.venda_id = titulo.venda_id
        model.ordem_servico_id = titulo.ordem_servico_id
        model.data_pagamento = titulo.data_pagamento
        model.forma_pagamento_baixa = titulo.forma_pagamento_baixa.value if titulo.forma_pagamento_baixa else None
        model.created_at = titulo.created_at
        await self.session.flush()
        return titulo

    async def buscar_por_id(self, titulo_id: uuid.UUID) -> Optional[TituloFinanceiro]:
        model = await self.session.get(TituloFinanceiroModel, titulo_id)
        return self._to_entity(model) if model else None

    async def buscar_por_venda(self, venda_id: uuid.UUID) -> Optional[TituloFinanceiro]:
        res = await self.session.execute(select(TituloFinanceiroModel).where(TituloFinanceiroModel.venda_id == venda_id))
        model = res.scalars().first()
        return self._to_entity(model) if model else None

    async def listar(self, tipo: Optional[TipoTitulo] = None, status: Optional[StatusTitulo] = None) -> List[TituloFinanceiro]:
        stmt = select(TituloFinanceiroModel).order_by(TituloFinanceiroModel.data_vencimento)
        if tipo:
            stmt = stmt.where(TituloFinanceiroModel.tipo == tipo.value)
        if status:
            stmt = stmt.where(TituloFinanceiroModel.status == status.value)
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    async def listar_pagos_no_periodo(self, tipo: TipoTitulo, inicio: date, fim: date) -> List[TituloFinanceiro]:
        stmt = select(TituloFinanceiroModel).where(
            TituloFinanceiroModel.tipo == tipo.value,
            TituloFinanceiroModel.status == StatusTitulo.PAGO.value,
            TituloFinanceiroModel.data_pagamento >= inicio,
            TituloFinanceiroModel.data_pagamento <= fim,
        )
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    @staticmethod
    def _to_entity(m: TituloFinanceiroModel) -> TituloFinanceiro:
        return TituloFinanceiro(
            id=m.id, tipo=TipoTitulo(m.tipo), descricao=m.descricao, valor=Decimal(m.valor),
            data_vencimento=m.data_vencimento, categoria=CategoriaTitulo(m.categoria), status=StatusTitulo(m.status),
            cliente_id=m.cliente_id, venda_id=m.venda_id, ordem_servico_id=m.ordem_servico_id,
            data_pagamento=m.data_pagamento,
            forma_pagamento_baixa=FormaPagamento(m.forma_pagamento_baixa) if m.forma_pagamento_baixa else None,
            created_at=m.created_at,
        )


class CobrancaPixRepositorySQLAlchemy(CobrancaPixRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, cobranca: CobrancaPix) -> CobrancaPix:
        model = await self.session.get(CobrancaPixModel, cobranca.id)
        if not model:
            model = CobrancaPixModel(id=cobranca.id)
            self.session.add(model)
        model.txid = cobranca.txid
        model.valor = cobranca.valor
        model.copia_e_cola = cobranca.copia_e_cola
        model.descricao = cobranca.descricao
        model.status = cobranca.status.value
        model.end_to_end_id = cobranca.end_to_end_id
        model.criada_em = cobranca.criada_em
        model.expira_em = cobranca.expira_em
        model.liquidada_em = cobranca.liquidada_em
        model.utilizada_em = cobranca.utilizada_em
        model.referencia_uso = cobranca.referencia_uso
        await self.session.flush()
        return cobranca

    async def buscar_por_id(self, cobranca_id: uuid.UUID) -> Optional[CobrancaPix]:
        stmt = select(CobrancaPixModel).where(CobrancaPixModel.id == cobranca_id).with_for_update()
        model = (await self.session.execute(stmt.execution_options(populate_existing=True))).scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def buscar_por_txid(self, txid: str) -> Optional[CobrancaPix]:
        stmt = select(CobrancaPixModel).where(CobrancaPixModel.txid == txid.strip()).with_for_update()
        model = (await self.session.execute(stmt.execution_options(populate_existing=True))).scalar_one_or_none()
        return self._to_entity(model) if model else None

    @staticmethod
    def _to_entity(m: CobrancaPixModel) -> CobrancaPix:
        return CobrancaPix(
            id=m.id, txid=m.txid, valor=Decimal(m.valor), copia_e_cola=m.copia_e_cola, descricao=m.descricao,
            status=StatusCobrancaPix(m.status), end_to_end_id=m.end_to_end_id, criada_em=m.criada_em,
            expira_em=m.expira_em, liquidada_em=m.liquidada_em, utilizada_em=m.utilizada_em,
            referencia_uso=m.referencia_uso,
        )
