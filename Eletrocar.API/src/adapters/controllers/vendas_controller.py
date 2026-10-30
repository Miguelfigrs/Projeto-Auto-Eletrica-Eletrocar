"""
Controlador de Venda Balcão / PDV Rápido (UC02).
"""
from decimal import Decimal
from typing import List, Literal, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import FormaPagamento
from src.application.dtos.venda_dtos import (
    RealizarVendaInputDTO, ItemVendaInputDTO, AutorizacaoGerencialDTO, CancelarVendaInputDTO, VendaOutputDTO,
)
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from src.application.use_cases.cancelar_venda_use_case import CancelarVendaUseCase
from src.application.use_cases.consultar_vendas_use_case import ConsultarVendasUseCase
from src.application.use_cases.emitir_comprovante_use_case import EmitirComprovanteUseCase
from src.adapters.controllers.dependencies import balcao, somente_admin
from src.adapters.controllers.fabricas import venda_uc, cancelar_venda_uc, comprovante_uc, consultar_vendas_uc
from src.adapters.controllers.comprovantes import responder_comprovante
from src.adapters.controllers.ws_controller import manager

router = APIRouter(prefix="/vendas", tags=["Balcão & PDV Rápido"])


class AutorizacaoRequest(BaseModel):
    identificador_gestor: str
    pin: str


class ItemVendaRequest(BaseModel):
    peca_id: uuid.UUID
    quantidade: int = Field(gt=0)
    preco_unitario_customizado: Optional[Decimal] = Field(default=None, ge=0)


class RealizarVendaRequest(BaseModel):
    itens: List[ItemVendaRequest] = Field(min_length=1)
    forma_pagamento: FormaPagamento = FormaPagamento.DINHEIRO
    desconto: Decimal = Field(default=Decimal("0.00"), ge=0)
    desconto_percentual: Optional[Decimal] = Field(default=None, ge=0, le=100)
    cliente_id: Optional[uuid.UUID] = None
    cobranca_pix_id: Optional[uuid.UUID] = None
    autorizacao: Optional[AutorizacaoRequest] = None


class CancelarVendaRequest(BaseModel):
    motivo: str = Field(min_length=3)


@router.post("", response_model=VendaOutputDTO, status_code=status.HTTP_201_CREATED)
async def realizar_venda(body: RealizarVendaRequest, operador: Usuario = Depends(balcao),
                         uc: RealizarVendaBalcaoUseCase = Depends(venda_uc)):
    venda = await uc.executar(RealizarVendaInputDTO(
        operador_id=operador.id,
        itens=[ItemVendaInputDTO(**it.model_dump()) for it in body.itens],
        forma_pagamento=body.forma_pagamento,
        desconto=body.desconto,
        desconto_percentual=body.desconto_percentual,
        cliente_id=body.cliente_id,
        cobranca_pix_id=body.cobranca_pix_id,
        autorizacao=AutorizacaoGerencialDTO(**body.autorizacao.model_dump()) if body.autorizacao else None,
    ))
    await manager.broadcast("VENDA_CONCLUIDA", {
        "numero_venda": venda.numero_venda, "valor_total": str(venda.valor_total), "forma_pagamento": venda.forma_pagamento
    })
    return venda


@router.get("", response_model=List[VendaOutputDTO], summary="Balconista vê as próprias vendas; Administrador vê todas")
async def listar_vendas(limite: int = Query(50, ge=1, le=500), usuario: Usuario = Depends(balcao),
                        uc: ConsultarVendasUseCase = Depends(consultar_vendas_uc)):
    return await uc.listar(usuario, limite)


@router.post("/{venda_id}/cancelar", response_model=VendaOutputDTO)
async def cancelar_venda(venda_id: uuid.UUID, body: CancelarVendaRequest, admin: Usuario = Depends(somente_admin),
                         uc: CancelarVendaUseCase = Depends(cancelar_venda_uc)):
    return await uc.executar(CancelarVendaInputDTO(venda_id=venda_id, motivo=body.motivo, executor_id=admin.id))


@router.get("/{venda_id}/recibo", summary="Recibo térmico em PDF (80/58 mm), texto ou link do WhatsApp")
async def recibo(venda_id: uuid.UUID, largura: int = Query(80), formato: Literal["pdf", "texto", "whatsapp"] = "pdf",
                 _: Usuario = Depends(balcao), uc: EmitirComprovanteUseCase = Depends(comprovante_uc)):
    comprovante = await uc.recibo_venda(venda_id, largura_mm=largura)
    return responder_comprovante(comprovante, formato, f"recibo-{venda_id}")
