"""
Controlador de Clientes e Carros (cadastro simplificado - Módulo 5).
"""
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from src.domain.entities.usuario import Usuario
from src.application.dtos.cliente_dtos import CadastrarClienteInputDTO, CarroInputDTO, ClienteOutputDTO
from src.application.use_cases.gerenciar_clientes_use_case import GerenciarClientesUseCase
from src.adapters.controllers.dependencies import operacional
from src.adapters.controllers.fabricas import clientes_uc

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
async def cadastrar_cliente(body: CadastrarClienteRequest, _: Usuario = Depends(operacional),
                            uc: GerenciarClientesUseCase = Depends(clientes_uc)):
    return await uc.cadastrar_cliente(CadastrarClienteInputDTO(
        nome=body.nome, cpf_cnpj=body.cpf_cnpj, telefone=body.telefone, email=body.email,
        carros=[CarroInputDTO(**c.model_dump()) for c in body.carros],
    ))


@router.get("/search", response_model=List[ClienteOutputDTO], summary="Busca por nome, CPF/CNPJ, modelo ou placa")
async def buscar_clientes(q: str = Query(..., min_length=1), _: Usuario = Depends(operacional),
                          uc: GerenciarClientesUseCase = Depends(clientes_uc)):
    return await uc.buscar_por_termo(q)


@router.get("/{cliente_id}", response_model=ClienteOutputDTO)
async def buscar_cliente_por_id(cliente_id: uuid.UUID, _: Usuario = Depends(operacional),
                                uc: GerenciarClientesUseCase = Depends(clientes_uc)):
    cliente = await uc.buscar_por_id(cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return cliente


@router.post("/{cliente_id}/carros", response_model=ClienteOutputDTO, status_code=status.HTTP_201_CREATED)
async def adicionar_carro(cliente_id: uuid.UUID, body: CarroRequest, _: Usuario = Depends(operacional),
                          uc: GerenciarClientesUseCase = Depends(clientes_uc)):
    return await uc.adicionar_carro(cliente_id, CarroInputDTO(**body.model_dump()))
