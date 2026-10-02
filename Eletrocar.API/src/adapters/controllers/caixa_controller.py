"""
Controlador de Caixa Diário.
Abertura de turno, movimentações de sangria/suprimento e fechamento cego de caixa.
"""
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from decimal import Decimal
from typing import Dict, Optional
import uuid
from src.infra.database.session import get_db_session
from src.adapters.repositories.caixa_repository_sqlalchemy import CaixaRepositorySQLAlchemy
from src.adapters.repositories.auditoria_repository_sqlalchemy import AuditoriaRepositorySQLAlchemy
from src.application.use_cases.operar_caixa_use_case import OperarCaixaUseCase
from src.application.dtos.caixa_dtos import (
    AbrirCaixaInputDTO,
    MovimentarCaixaInputDTO,
    FechamentoCegoInputDTO,
    CaixaOutputDTO,
    FechamentoCegoOutputDTO
)
from src.domain.value_objects.enums import FormaPagamento
from src.adapters.controllers.dependencies import get_current_user
from src.domain.entities.usuario import Usuario

router = APIRouter(prefix="/caixa", tags=["Gestão de Caixa & Turnos"])


class AbrirCaixaRequest(BaseModel):
    saldo_inicial: Decimal = Decimal("0.00")


class MovimentarCaixaRequest(BaseModel):
    tipo: str  # SUPRIMENTO, SANGRIA
    valor: Decimal
    forma_pagamento: str = "DINHEIRO"
    descricao: str = ""


class FechamentoCegoRequest(BaseModel):
    valores_contados: Dict[str, Decimal]  # ex: {"DINHEIRO": 450.00, "PIX": 800.00}


@router.post("/abrir", response_model=CaixaOutputDTO, status_code=status.HTTP_201_CREATED)
async def abrir_caixa(
    body: AbrirCaixaRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = OperarCaixaUseCase(
        caixa_repo=CaixaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    return await use_case.abrir_caixa(AbrirCaixaInputDTO(
        operador_id=usuario.id,
        saldo_inicial=body.saldo_inicial
    ))


@router.get("/status", response_model=Optional[CaixaOutputDTO])
async def status_caixa_aberto(
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = OperarCaixaUseCase(
        caixa_repo=CaixaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    caixa = await use_case.consultar_caixa_aberto()
    return caixa


@router.post("/movimentar")
async def movimentar_caixa(
    body: MovimentarCaixaRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = OperarCaixaUseCase(
        caixa_repo=CaixaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    forma_enum = FormaPagamento(body.forma_pagamento.upper())
    return await use_case.registrar_movimentacao(MovimentarCaixaInputDTO(
        operador_id=usuario.id,
        tipo=body.tipo.upper(),
        valor=body.valor,
        forma_pagamento=forma_enum,
        descricao=body.descricao
    ))


@router.post("/fechamento-cego", response_model=FechamentoCegoOutputDTO)
async def fechamento_cego(
    body: FechamentoCegoRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = OperarCaixaUseCase(
        caixa_repo=CaixaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    
    valores_contados_enum = {}
    for k, v in body.valores_contados.items():
        try:
            valores_contados_enum[FormaPagamento(k.upper())] = v
        except ValueError:
            pass

    return await use_case.fechar_caixa_cego(FechamentoCegoInputDTO(
        operador_id=usuario.id,
        valores_contados=valores_contados_enum
    ))
