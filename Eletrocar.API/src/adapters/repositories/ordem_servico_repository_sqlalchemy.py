"""
Implementação SQLAlchemy do OrdemServicoRepositoryInterface.
"""
from typing import List, Optional
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.domain.entities.ordem_servico import OrdemServico, ItemOS, ServicoOS
from src.domain.value_objects.enums import StatusOS, OrigemOS
from src.domain.repositories.interfaces import OrdemServicoRepositoryInterface
from src.infra.database.models import OrdemServicoModel, ItemOSModel, ServicoOSModel


class OrdemServicoRepositorySQLAlchemy(OrdemServicoRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, os: OrdemServico) -> OrdemServico:
        model = await self.session.get(OrdemServicoModel, str(os.id))
        if not model:
            model = OrdemServicoModel(id=str(os.id))
            self.session.add(model)

        model.numero_os = os.numero_os
        model.cliente_id = str(os.cliente_id)
        model.carro_id = str(os.carro_id)
        model.usuario_id = str(os.usuario_id)
        model.status = os.status.value
        model.origem = os.origem.value
        model.sintomas = os.sintomas
        model.hipotese_diagnostica = os.hipotese_diagnostica
        model.checklist_eletrico = os.checklist_eletrico
        model.desconto = os.desconto
        model.observacoes = os.observacoes
        model.created_at = os.created_at
        model.updated_at = os.updated_at

        # Sincroniza itens de peças
        for item in os.itens:
            item_model = await self.session.get(ItemOSModel, str(item.id))
            if not item_model:
                item_model = ItemOSModel(
                    id=str(item.id),
                    ordem_servico_id=str(os.id),
                    peca_id=str(item.peca_id),
                    descricao_peca=item.descricao_peca,
                    quantidade=item.quantidade,
                    preco_unitario=item.preco_unitario
                )
                self.session.add(item_model)
            else:
                item_model.quantidade = item.quantidade
                item_model.preco_unitario = item.preco_unitario

        # Sincroniza serviços de mão de obra
        for srv in os.servicos:
            srv_model = await self.session.get(ServicoOSModel, str(srv.id))
            if not srv_model:
                srv_model = ServicoOSModel(
                    id=str(srv.id),
                    ordem_servico_id=str(os.id),
                    descricao=srv.descricao,
                    valor=srv.valor,
                    eletricista_responsavel_id=str(srv.eletricista_responsavel_id) if srv.eletricista_responsavel_id else None
                )
                self.session.add(srv_model)
            else:
                srv_model.valor = srv.valor
                srv_model.descricao = srv.descricao

        await self.session.flush()
        return os

    async def buscar_por_id(self, os_id: uuid.UUID) -> Optional[OrdemServico]:
        model = await self.session.get(OrdemServicoModel, str(os_id))
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_numero(self, numero_os: str) -> Optional[OrdemServico]:
        stmt = select(OrdemServicoModel).where(OrdemServicoModel.numero_os == numero_os.strip())
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    async def listar(self, status: Optional[str] = None) -> List[OrdemServico]:
        stmt = select(OrdemServicoModel).order_by(OrdemServicoModel.created_at.desc())
        if status:
            stmt = stmt.where(OrdemServicoModel.status == status)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_entity(m) for m in models]

    async def obter_proximo_numero_os(self) -> str:
        stmt = select(func.count(OrdemServicoModel.id))
        res = await self.session.execute(stmt)
        total = res.scalar() or 0
        return f"OS-2026-{(total + 1):04d}"

    def _to_entity(self, m: OrdemServicoModel) -> OrdemServico:
        itens = [
            ItemOS(
                id=uuid.UUID(it.id),
                ordem_servico_id=uuid.UUID(it.ordem_servico_id),
                peca_id=uuid.UUID(it.peca_id),
                descricao_peca=it.descricao_peca,
                quantidade=it.quantidade,
                preco_unitario=Decimal(str(it.preco_unitario))
            )
            for it in m.itens
        ]
        servicos = [
            ServicoOS(
                id=uuid.UUID(s.id),
                ordem_servico_id=uuid.UUID(s.ordem_servico_id),
                descricao=s.descricao,
                valor=Decimal(str(s.valor)),
                eletricista_responsavel_id=uuid.UUID(s.eletricista_responsavel_id) if s.eletricista_responsavel_id else None
            )
            for s in m.servicos
        ]
        return OrdemServico(
            id=uuid.UUID(m.id),
            numero_os=m.numero_os,
            cliente_id=uuid.UUID(m.cliente_id),
            carro_id=uuid.UUID(m.carro_id),
            usuario_id=uuid.UUID(m.usuario_id),
            status=StatusOS(m.status),
            origem=OrigemOS(m.origem),
            sintomas=m.sintomas or "",
            hipotese_diagnostica=m.hipotese_diagnostica,
            checklist_eletrico=m.checklist_eletrico or {},
            itens=itens,
            servicos=servicos,
            desconto=Decimal(str(m.desconto or 0)),
            observacoes=m.observacoes,
            created_at=m.created_at,
            updated_at=m.updated_at
        )
