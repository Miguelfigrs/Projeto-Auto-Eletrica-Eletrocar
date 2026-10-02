"""
Controlador de Clientes e Veículos.
"""
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
import uuid
from src.infra.database.session import get_db_session
from src.adapters.repositories.cliente_repository_sqlalchemy import ClienteRepositorySQLAlchemy
from src.application.use_cases.gerenciar_clientes_use_case import GerenciarClientesUseCase
from src.application.dtos.cliente_dtos import (
    CadastrarClienteInputDTO,
    CarroInputDTO,
    ClienteOutputDTO
)
from src.adapters.controllers.dependencies import get_current_user
from src.domain.entities.usuario import Usuario

router = APIRouter(prefix="/clientes", tags=["Clientes & Carros"])


class CarroRequest(BaseModel):
    modelo: str
    marca: str
    placa: Optional[str] = None
    ano: Optional[str] = None


class CadastrarClienteRequest(BaseModel):
    nome: str
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    carros: List[CarroRequest] = []


@router.post("", response_model=ClienteOutputDTO, status_code=status.HTTP_201_CREATED)
async def cadastrar_cliente(
    body: CadastrarClienteRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    repo = ClienteRepositorySQLAlchemy(session)
    use_case = GerenciarClientesUseCase(cliente_repo=repo)
    
    carros_dto = [
        CarroInputDTO(
            modelo=c.modelo,
            marca=c.marca,
            placa=c.placa,
            ano=c.ano
        )
        for c in body.carros
    ]

    return await use_case.cadastrar_cliente(CadastrarClienteInputDTO(
        nome=body.nome,
        cpf_cnpj=body.cpf_cnpj,
        telefone=body.telefone,
        email=body.email,
        carros=carros_dto
    ))


@router.get("/search", response_model=List[ClienteOutputDTO])
async def buscar_clientes(
    q: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    repo = ClienteRepositorySQLAlchemy(session)
    use_case = GerenciarClientesUseCase(cliente_repo=repo)
    return await use_case.buscar_por_termo(q)


@router.get("/{cliente_id}", response_model=ClienteOutputDTO)
async def buscar_cliente_por_id(
    cliente_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    repo = ClienteRepositorySQLAlchemy(session)
    use_case = GerenciarClientesUseCase(cliente_repo=repo)
    cliente = await use_case.buscar_por_id(cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return cliente
