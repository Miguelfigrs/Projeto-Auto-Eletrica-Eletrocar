"""
Controlador de Gestão de Usuários e Papéis (exclusivo do Administrador).
"""
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from src.domain.entities.usuario import Usuario
from src.application.dtos.auth_dtos import CriarUsuarioInputDTO, AtualizarUsuarioInputDTO, UsuarioOutputDTO
from src.application.use_cases.gerenciar_usuarios_use_case import GerenciarUsuariosUseCase
from src.adapters.controllers.dependencies import somente_admin
from src.adapters.controllers.fabricas import usuarios_uc

router = APIRouter(prefix="/usuarios", tags=["Gestão de Usuários (Admin)"])


class CriarUsuarioRequest(BaseModel):
    nome: str
    email: str
    senha: str = Field(min_length=8)
    papeis: List[str] = Field(min_length=1)
    username: Optional[str] = None
    pin: Optional[str] = None
    telegram_user_id: Optional[str] = None


class AtualizarUsuarioRequest(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    telegram_user_id: Optional[str] = None


class PapeisRequest(BaseModel):
    papeis: List[str] = Field(min_length=1)


class StatusRequest(BaseModel):
    ativo: bool


class SenhaRequest(BaseModel):
    nova_senha: str = Field(min_length=8)


class PinRequest(BaseModel):
    pin: str


@router.get("", response_model=List[UsuarioOutputDTO])
async def listar(_: Usuario = Depends(somente_admin), uc: GerenciarUsuariosUseCase = Depends(usuarios_uc)):
    return await uc.listar()


@router.post("", response_model=UsuarioOutputDTO, status_code=status.HTTP_201_CREATED)
async def criar(body: CriarUsuarioRequest, admin: Usuario = Depends(somente_admin),
                uc: GerenciarUsuariosUseCase = Depends(usuarios_uc)):
    return await uc.criar(CriarUsuarioInputDTO(**body.model_dump()), executor_id=admin.id)


@router.patch("/{usuario_id}", response_model=UsuarioOutputDTO)
async def atualizar(usuario_id: uuid.UUID, body: AtualizarUsuarioRequest, admin: Usuario = Depends(somente_admin),
                    uc: GerenciarUsuariosUseCase = Depends(usuarios_uc)):
    return await uc.atualizar(AtualizarUsuarioInputDTO(usuario_id=usuario_id, **body.model_dump()), executor_id=admin.id)


@router.put("/{usuario_id}/papeis", response_model=UsuarioOutputDTO)
async def definir_papeis(usuario_id: uuid.UUID, body: PapeisRequest, admin: Usuario = Depends(somente_admin),
                         uc: GerenciarUsuariosUseCase = Depends(usuarios_uc)):
    return await uc.definir_papeis(usuario_id, body.papeis, executor_id=admin.id)


@router.patch("/{usuario_id}/status", response_model=UsuarioOutputDTO)
async def alterar_status(usuario_id: uuid.UUID, body: StatusRequest, admin: Usuario = Depends(somente_admin),
                         uc: GerenciarUsuariosUseCase = Depends(usuarios_uc)):
    return await uc.alterar_status(usuario_id, body.ativo, executor_id=admin.id)


@router.post("/{usuario_id}/senha", status_code=status.HTTP_204_NO_CONTENT)
async def redefinir_senha(usuario_id: uuid.UUID, body: SenhaRequest, admin: Usuario = Depends(somente_admin),
                          uc: GerenciarUsuariosUseCase = Depends(usuarios_uc)):
    await uc.redefinir_senha(usuario_id, body.nova_senha, executor_id=admin.id)


@router.post("/{usuario_id}/pin", status_code=status.HTTP_204_NO_CONTENT)
async def definir_pin(usuario_id: uuid.UUID, body: PinRequest, admin: Usuario = Depends(somente_admin),
                      uc: GerenciarUsuariosUseCase = Depends(usuarios_uc)):
    await uc.definir_pin(usuario_id, body.pin, executor_id=admin.id)
