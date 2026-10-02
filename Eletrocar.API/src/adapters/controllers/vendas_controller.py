"""
Controlador de Venda Balcão / PDV Rápido.
Operação de atendimento ágil com baixa atômica de estoque e emissão de recibo.
"""
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional, List
import uuid
from src.infra.database.session import get_db_session
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy
from src.adapters.repositories.venda_balcao_repository_sqlalchemy import VendaBalcaoRepositorySQLAlchemy
from src.adapters.repositories.caixa_repository_sqlalchemy import CaixaRepositorySQLAlchemy
from src.adapters.repositories.auditoria_repository_sqlalchemy import AuditoriaRepositorySQLAlchemy
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from src.application.dtos.venda_dtos import (
    RealizarVendaInputDTO,
    ItemVendaInputDTO,
    VendaOutputDTO,
    ItemVendaOutputDTO
)
from src.domain.value_objects.enums import FormaPagamento
from src.adapters.controllers.dependencies import get_current_user
from src.adapters.controllers.ws_controller import manager
from src.domain.entities.usuario import Usuario

router = APIRouter(prefix="/vendas", tags=["Balcão & PDV Rápido"])


class ItemVendaRequest(BaseModel):
    peca_id: uuid.UUID
    quantidade: int
    preco_unitario_customizado: Optional[Decimal] = None


class RealizarVendaRequest(BaseModel):
    itens: List[ItemVendaRequest]
    desconto: Decimal = Decimal("0.00")
    forma_pagamento: str = "DINHEIRO"
    cliente_id: Optional[uuid.UUID] = None


@router.post("", response_model=VendaOutputDTO, status_code=status.HTTP_201_CREATED)
async def realizar_venda(
    body: RealizarVendaRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    peca_repo = PecaRepositorySQLAlchemy(session)
    venda_repo = VendaBalcaoRepositorySQLAlchemy(session)
    caixa_repo = CaixaRepositorySQLAlchemy(session)
    audit_repo = AuditoriaRepositorySQLAlchemy(session)

    use_case = RealizarVendaBalcaoUseCase(
        peca_repo=peca_repo,
        venda_repo=venda_repo,
        caixa_repo=caixa_repo,
        audit_repo=audit_repo
    )

    try:
        forma_pgto_enum = FormaPagamento(body.forma_pagamento.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Forma de pagamento '{body.forma_pagamento}' inválida.")

    itens_dto = [
        ItemVendaInputDTO(
            peca_id=it.peca_id,
            quantidade=it.quantidade,
            preco_unitario_customizado=it.preco_unitario_customizado
        )
        for it in body.itens
    ]

    venda_resultado = await use_case.executar(RealizarVendaInputDTO(
        operador_id=usuario.id,
        itens=itens_dto,
        desconto=body.desconto,
        forma_pagamento=forma_pgto_enum,
        cliente_id=body.cliente_id
    ))

    # Notifica via WebSocket para sincronizar terminais e emitir som de confirmação
    await manager.broadcast("VENDA_CONCLUIDA", {
        "numero_venda": venda_resultado.numero_venda,
        "valor_total": str(venda_resultado.valor_total),
        "forma_pagamento": venda_resultado.forma_pagamento
    })

    return venda_resultado


@router.get("", response_model=List[VendaOutputDTO])
async def listar_vendas(
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    venda_repo = VendaBalcaoRepositorySQLAlchemy(session)
    vendas = await venda_repo.listar_recentes(limite=50)
    
    return [
        VendaOutputDTO(
            id=v.id,
            numero_venda=v.numero_venda,
            operador_id=v.operador_id,
            cliente_id=v.cliente_id,
            itens=[
                ItemVendaOutputDTO(
                    id=it.id,
                    peca_id=it.peca_id,
                    descricao_peca=it.descricao_peca,
                    quantidade=it.quantidade,
                    preco_unitario=it.preco_unitario,
                    subtotal=it.subtotal
                )
                for it in v.itens
            ],
            subtotal=v.subtotal,
            desconto=v.desconto,
            valor_total=v.valor_total,
            forma_pagamento=v.forma_pagamento.value if v.forma_pagamento else "",
            status=v.status.value,
            data_hora=v.created_at,
            sucesso=True
        )
        for v in vendas
    ]
