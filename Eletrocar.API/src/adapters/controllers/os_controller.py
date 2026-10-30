"""
Controlador de Ordens de Serviço (UC05 / UC08).
Ciclo de vida, peças reservadas, mão de obra, desconto com alçada, faturamento e orçamento térmico.
"""
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import FormaPagamento, PrioridadeOS
from src.application.dtos.os_dtos import (
    CriarOSBalcaoInputDTO, AtualizarStatusOSInputDTO, AlocarPecaOSInputDTO, AdicionarServicoOSInputDTO,
    AplicarDescontoOSInputDTO, FaturarOSInputDTO, OrdemServicoOutputDTO,
)
from src.application.dtos.venda_dtos import AutorizacaoGerencialDTO
from src.application.use_cases.gerenciar_os_use_case import GerenciarOrdemServicoUseCase
from src.application.use_cases.faturar_os_use_case import FaturarOrdemServicoUseCase
from src.application.use_cases.aplicar_desconto_os_use_case import AplicarDescontoOSUseCase
from src.application.use_cases.emitir_comprovante_use_case import EmitirComprovanteUseCase
from src.adapters.controllers.dependencies import operacional, balcao
from src.adapters.controllers.fabricas import os_uc, faturar_os_uc, desconto_os_uc, comprovante_uc
from src.adapters.controllers.comprovantes import responder_comprovante
from src.adapters.controllers.ws_controller import manager

router = APIRouter(prefix="/ordens-servico", tags=["Ordens de Serviço"])


class CriarOSRequest(BaseModel):
    cliente_id: uuid.UUID
    carro_id: uuid.UUID
    sintomas: str = Field(min_length=3)
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = {}
    observacoes: Optional[str] = None
    prioridade: PrioridadeOS = PrioridadeOS.MEDIA


class AtualizarStatusRequest(BaseModel):
    novo_status: str


class AlocarPecaRequest(BaseModel):
    peca_id: uuid.UUID
    quantidade: int = Field(gt=0)


class AdicionarServicoRequest(BaseModel):
    descricao: str = Field(min_length=3)
    valor: Decimal = Field(ge=0)
    eletricista_id: Optional[uuid.UUID] = None


class AutorizacaoRequest(BaseModel):
    identificador_gestor: str
    pin: str


class DescontoRequest(BaseModel):
    desconto: Decimal = Field(ge=0)
    autorizacao: Optional[AutorizacaoRequest] = None


class FaturarRequest(BaseModel):
    forma_pagamento: FormaPagamento
    cobranca_pix_id: Optional[uuid.UUID] = None


@router.post("", response_model=OrdemServicoOutputDTO, status_code=status.HTTP_201_CREATED)
async def abrir_ordem_servico(body: CriarOSRequest, usuario: Usuario = Depends(operacional),
                              uc: GerenciarOrdemServicoUseCase = Depends(os_uc)):
    os_criada = await uc.abrir_os_balcao(CriarOSBalcaoInputDTO(
        usuario_id=usuario.id, cliente_id=body.cliente_id, carro_id=body.carro_id, sintomas=body.sintomas,
        hipotese_diagnostica=body.hipotese_diagnostica, checklist_eletrico=body.checklist_eletrico,
        observacoes=body.observacoes, prioridade=body.prioridade.value,
    ))
    await manager.broadcast("NOVA_OS", {
        "numero_os": os_criada.numero_os, "cliente": os_criada.nome_cliente,
        "carro": os_criada.descricao_carro, "origem": os_criada.origem
    })
    return os_criada


@router.get("", response_model=List[OrdemServicoOutputDTO])
async def listar_ordens_servico(status_filtro: Optional[str] = Query(None, alias="status"),
                                _: Usuario = Depends(operacional), uc: GerenciarOrdemServicoUseCase = Depends(os_uc)):
    return await uc.listar(status_filtro)


@router.get("/{os_id}", response_model=OrdemServicoOutputDTO)
async def buscar_os_por_id(os_id: uuid.UUID, _: Usuario = Depends(operacional),
                           uc: GerenciarOrdemServicoUseCase = Depends(os_uc)):
    os = await uc.buscar_por_id(os_id)
    if not os:
        raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
    return os


@router.patch("/{os_id}/status", response_model=OrdemServicoOutputDTO)
async def atualizar_status_os(os_id: uuid.UUID, body: AtualizarStatusRequest, usuario: Usuario = Depends(operacional),
                              uc: GerenciarOrdemServicoUseCase = Depends(os_uc)):
    os_atualizada = await uc.atualizar_status(AtualizarStatusOSInputDTO(
        os_id=os_id, novo_status=body.novo_status, usuario_id=usuario.id
    ))
    await manager.broadcast("STATUS_OS_ALTERADO", {"numero_os": os_atualizada.numero_os, "novo_status": os_atualizada.status})
    return os_atualizada


@router.post("/{os_id}/pecas", response_model=OrdemServicoOutputDTO, summary="Aloca (reserva) peça do estoque na OS")
async def alocar_peca_os(os_id: uuid.UUID, body: AlocarPecaRequest, usuario: Usuario = Depends(operacional),
                         uc: GerenciarOrdemServicoUseCase = Depends(os_uc)):
    return await uc.alocar_peca(AlocarPecaOSInputDTO(
        os_id=os_id, peca_id=body.peca_id, quantidade=body.quantidade, usuario_id=usuario.id
    ))


@router.post("/{os_id}/servicos", response_model=OrdemServicoOutputDTO)
async def adicionar_servico_os(os_id: uuid.UUID, body: AdicionarServicoRequest, _: Usuario = Depends(operacional),
                               uc: GerenciarOrdemServicoUseCase = Depends(os_uc)):
    return await uc.adicionar_servico(AdicionarServicoOSInputDTO(os_id=os_id, **body.model_dump()))


@router.post("/{os_id}/desconto", response_model=OrdemServicoOutputDTO)
async def aplicar_desconto_os(os_id: uuid.UUID, body: DescontoRequest, operador: Usuario = Depends(balcao),
                              uc: AplicarDescontoOSUseCase = Depends(desconto_os_uc)):
    return await uc.executar(AplicarDescontoOSInputDTO(
        os_id=os_id, desconto=body.desconto, operador_id=operador.id,
        autorizacao=AutorizacaoGerencialDTO(**body.autorizacao.model_dump()) if body.autorizacao else None,
    ))


@router.post("/{os_id}/faturar", response_model=OrdemServicoOutputDTO, summary="Pagamento e entrega do veículo")
async def faturar_os(os_id: uuid.UUID, body: FaturarRequest, operador: Usuario = Depends(balcao),
                     uc: FaturarOrdemServicoUseCase = Depends(faturar_os_uc)):
    os_faturada = await uc.executar(FaturarOSInputDTO(
        os_id=os_id, forma_pagamento=body.forma_pagamento, operador_id=operador.id, cobranca_pix_id=body.cobranca_pix_id
    ))
    await manager.broadcast("STATUS_OS_ALTERADO", {"numero_os": os_faturada.numero_os, "novo_status": os_faturada.status})
    return os_faturada


@router.get("/{os_id}/orcamento", summary="Orçamento térmico em PDF (80/58 mm), texto ou link do WhatsApp")
async def orcamento(os_id: uuid.UUID, largura: int = Query(80), formato: Literal["pdf", "texto", "whatsapp"] = "pdf",
                    _: Usuario = Depends(operacional), uc: EmitirComprovanteUseCase = Depends(comprovante_uc)):
    comprovante = await uc.orcamento_os(os_id, largura_mm=largura)
    return responder_comprovante(comprovante, formato, f"orcamento-{os_id}")
