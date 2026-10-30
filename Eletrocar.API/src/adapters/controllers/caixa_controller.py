"""
Controlador de Caixa Diário (UC10).
O balconista opera o caixa sem acesso ao saldo teórico (fechamento cego);
a visão gerencial e o relatório de quebra/sobra são exclusivos do Administrador.
"""
from decimal import Decimal
from typing import Dict, Literal, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import FormaPagamento
from src.application.dtos.caixa_dtos import (
    AbrirCaixaInputDTO, MovimentarCaixaInputDTO, FechamentoCegoInputDTO, CaixaOperadorOutputDTO,
    CaixaGerencialOutputDTO, FechamentoCegoConfirmacaoDTO, MovimentacaoOutputDTO, RelatorioFechamentoOutputDTO,
)
from src.application.use_cases.operar_caixa_use_case import OperarCaixaUseCase
from src.adapters.controllers.dependencies import balcao, somente_admin
from src.adapters.controllers.fabricas import caixa_uc

router = APIRouter(prefix="/caixa", tags=["Gestão de Caixa & Turnos"])


class AbrirCaixaRequest(BaseModel):
    saldo_inicial: Decimal = Field(default=Decimal("0.00"), ge=0)


class MovimentarCaixaRequest(BaseModel):
    tipo: Literal["SUPRIMENTO", "SANGRIA"]
    valor: Decimal = Field(gt=0)
    forma_pagamento: FormaPagamento = FormaPagamento.DINHEIRO
    descricao: str = ""


class FechamentoCegoRequest(BaseModel):
    valores_contados: Dict[FormaPagamento, Decimal]  # ex: {"DINHEIRO": "450.00", "PIX": "800.00"}


@router.post("/abrir", response_model=CaixaOperadorOutputDTO, status_code=status.HTTP_201_CREATED)
async def abrir_caixa(body: AbrirCaixaRequest, usuario: Usuario = Depends(balcao),
                      uc: OperarCaixaUseCase = Depends(caixa_uc)):
    return await uc.abrir_caixa(AbrirCaixaInputDTO(operador_id=usuario.id, saldo_inicial=body.saldo_inicial))


@router.get("/status", response_model=Optional[CaixaOperadorOutputDTO], summary="Situação do caixa (sem saldo teórico)")
async def status_caixa_aberto(_: Usuario = Depends(balcao), uc: OperarCaixaUseCase = Depends(caixa_uc)):
    return await uc.consultar_caixa_aberto()


@router.post("/movimentar", response_model=MovimentacaoOutputDTO)
async def movimentar_caixa(body: MovimentarCaixaRequest, usuario: Usuario = Depends(balcao),
                           uc: OperarCaixaUseCase = Depends(caixa_uc)):
    return await uc.registrar_movimentacao(MovimentarCaixaInputDTO(operador_id=usuario.id, **body.model_dump()))


@router.post("/fechamento-cego", response_model=FechamentoCegoConfirmacaoDTO)
async def fechamento_cego(body: FechamentoCegoRequest, usuario: Usuario = Depends(balcao),
                          uc: OperarCaixaUseCase = Depends(caixa_uc)):
    return await uc.fechar_caixa_cego(FechamentoCegoInputDTO(operador_id=usuario.id, valores_contados=body.valores_contados))


@router.get("/gerencial", response_model=CaixaGerencialOutputDTO, summary="Saldo teórico e totais (Administrador)")
async def caixa_gerencial(caixa_id: Optional[uuid.UUID] = None, _: Usuario = Depends(somente_admin),
                          uc: OperarCaixaUseCase = Depends(caixa_uc)):
    caixa = await uc.consultar_caixa_gerencial(caixa_id)
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado.")
    return caixa


@router.get("/{caixa_id}/relatorio-fechamento", response_model=RelatorioFechamentoOutputDTO,
            summary="Relatório de quebra/sobra por meio de pagamento (Administrador)")
async def relatorio_fechamento(caixa_id: uuid.UUID, _: Usuario = Depends(somente_admin),
                               uc: OperarCaixaUseCase = Depends(caixa_uc)):
    return await uc.relatorio_fechamento(caixa_id)
