"""
Implementação SQLAlchemy do OrdemServicoRepositoryInterface.
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.ordem_servico import OrdemServico, ItemOS, ServicoOS
from src.domain.value_objects.enums import StatusOS, OrigemOS, FormaPagamento, PrioridadeOS
from src.domain.repositories.interfaces import OrdemServicoRepositoryInterface
from src.infra.database.models import OrdemServicoModel, ItemOSModel, ServicoOSModel
from src.adapters.repositories.base import flush_com_bloqueio_otimista, proximo_numero


class OrdemServicoRepositorySQLAlchemy(OrdemServicoRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session
        # Referências fortes aos modelos lidos (preserva a versão para o bloqueio otimista)
        self._lidos: Dict[uuid.UUID, OrdemServicoModel] = {}

    async def salvar(self, os: OrdemServico) -> OrdemServico:
        model = self._lidos.get(os.id) or await self.session.get(OrdemServicoModel, os.id)
        if not model:
            model = OrdemServicoModel(id=os.id, itens=[], servicos=[])
            self.session.add(model)

        model.numero_os = os.numero_os
        model.cliente_id = os.cliente_id
        model.carro_id = os.carro_id
        model.usuario_id = os.usuario_id
        model.status = os.status.value
        model.origem = os.origem.value
        model.prioridade = os.prioridade.value
        model.sintomas = os.sintomas
        model.hipotese_diagnostica = os.hipotese_diagnostica
        model.checklist_eletrico = dict(os.checklist_eletrico or {})
        model.desconto = os.desconto
        model.observacoes = os.observacoes
        model.forma_pagamento = os.forma_pagamento.value if os.forma_pagamento else None
        model.finalizada_em = os.finalizada_em
        model.entregue_em = os.entregue_em
        model.created_at = os.created_at
        model.updated_at = os.updated_at

        itens_existentes = {i.id for i in model.itens}
        for item in os.itens:
            if item.id not in itens_existentes:
                model.itens.append(ItemOSModel(
                    id=item.id, ordem_servico_id=os.id, peca_id=item.peca_id, descricao_peca=item.descricao_peca,
                    quantidade=item.quantidade, preco_unitario=item.preco_unitario, custo_unitario=item.custo_unitario
                ))
        servicos_existentes = {s.id for s in model.servicos}
        for srv in os.servicos:
            if srv.id not in servicos_existentes:
                model.servicos.append(ServicoOSModel(
                    id=srv.id, ordem_servico_id=os.id, descricao=srv.descricao, valor=srv.valor,
                    eletricista_responsavel_id=srv.eletricista_responsavel_id
                ))

        await flush_com_bloqueio_otimista(self.session, f"A OS {os.numero_os}")
        self._lidos[os.id] = model
        return os

    async def buscar_por_id(self, os_id: uuid.UUID) -> Optional[OrdemServico]:
        model = await self.session.get(OrdemServicoModel, os_id)
        return self._to_entity(model) if model else None

    async def buscar_por_numero(self, numero_os: str) -> Optional[OrdemServico]:
        res = await self.session.execute(select(OrdemServicoModel).where(OrdemServicoModel.numero_os == numero_os.strip()))
        model = res.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def listar(self, status: Optional[str] = None) -> List[OrdemServico]:
        stmt = select(OrdemServicoModel).order_by(OrdemServicoModel.created_at.desc()).limit(200)
        if status:
            stmt = stmt.where(OrdemServicoModel.status == status.upper())
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    async def listar_entregues_no_periodo(self, inicio: datetime, fim: datetime) -> List[OrdemServico]:
        stmt = select(OrdemServicoModel).where(
            OrdemServicoModel.status == StatusOS.ENTREGUE.value,
            OrdemServicoModel.entregue_em >= inicio,
            OrdemServicoModel.entregue_em <= fim,
        )
        return [self._to_entity(m) for m in (await self.session.execute(stmt)).scalars().all()]

    async def obter_proximo_numero_os(self) -> str:
        return await proximo_numero(self.session, "OS")

    def _to_entity(self, m: OrdemServicoModel) -> OrdemServico:
        self._lidos[m.id] = m
        return OrdemServico(
            id=m.id,
            numero_os=m.numero_os,
            cliente_id=m.cliente_id,
            carro_id=m.carro_id,
            usuario_id=m.usuario_id,
            status=StatusOS(m.status),
            origem=OrigemOS(m.origem),
            prioridade=PrioridadeOS(m.prioridade or "MEDIA"),
            sintomas=m.sintomas or "",
            hipotese_diagnostica=m.hipotese_diagnostica,
            checklist_eletrico=dict(m.checklist_eletrico or {}),
            itens=[
                ItemOS(
                    id=it.id, ordem_servico_id=it.ordem_servico_id, peca_id=it.peca_id,
                    descricao_peca=it.descricao_peca, quantidade=it.quantidade,
                    preco_unitario=Decimal(it.preco_unitario), custo_unitario=Decimal(it.custo_unitario or 0)
                )
                for it in m.itens
            ],
            servicos=[
                ServicoOS(
                    id=s.id, ordem_servico_id=s.ordem_servico_id, descricao=s.descricao,
                    valor=Decimal(s.valor), eletricista_responsavel_id=s.eletricista_responsavel_id
                )
                for s in m.servicos
            ],
            desconto=Decimal(m.desconto or 0),
            observacoes=m.observacoes,
            forma_pagamento=FormaPagamento(m.forma_pagamento) if m.forma_pagamento else None,
            finalizada_em=m.finalizada_em,
            entregue_em=m.entregue_em,
            created_at=m.created_at,
            updated_at=m.updated_at
        )
