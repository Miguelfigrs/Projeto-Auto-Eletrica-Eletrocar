"""
Controlador de Ordens de Serviço (OS).
Ciclo de vida, alocação de componentes elétricos e serviços de mão de obra.
"""
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional, List, Dict, Any
import uuid
from src.infra.database.session import get_db_session
from src.adapters.repositories.ordem_servico_repository_sqlalchemy import OrdemServicoRepositorySQLAlchemy
from src.adapters.repositories.cliente_repository_sqlalchemy import ClienteRepositorySQLAlchemy
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy
from src.adapters.repositories.auditoria_repository_sqlalchemy import AuditoriaRepositorySQLAlchemy
from src.application.use_cases.gerenciar_os_use_case import GerenciarOrdemServicoUseCase
from src.application.dtos.os_dtos import (
    CriarOSBalcaoInputDTO,
    AtualizarStatusOSInputDTO,
    AlocarPecaOSInputDTO,
    AdicionarServicoOSInputDTO,
    OrdemServicoOutputDTO
)
from src.adapters.controllers.dependencies import get_current_user
from src.adapters.controllers.ws_controller import manager
from src.domain.entities.usuario import Usuario

router = APIRouter(prefix="/ordens-servico", tags=["Ordens de Serviço"])


class CriarOSRequest(BaseModel):
    cliente_id: uuid.UUID
    carro_id: uuid.UUID
    sintomas: str
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = {}
    observacoes: Optional[str] = None


class AtualizarStatusRequest(BaseModel):
    novo_status: str


class AlocarPecaRequest(BaseModel):
    peca_id: uuid.UUID
    quantidade: int
    preco_unitario: Optional[Decimal] = None


class AdicionarServicoRequest(BaseModel):
    descricao: str
    valor: Decimal
    eletricista_id: Optional[uuid.UUID] = None


@router.post("", response_model=OrdemServicoOutputDTO, status_code=status.HTTP_201_CREATED)
async def abrir_ordem_servico(
    body: CriarOSRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = GerenciarOrdemServicoUseCase(
        os_repo=OrdemServicoRepositorySQLAlchemy(session),
        cliente_repo=ClienteRepositorySQLAlchemy(session),
        peca_repo=PecaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )

    os_criada = await use_case.abrir_os_balcao(CriarOSBalcaoInputDTO(
        usuario_id=usuario.id,
        cliente_id=body.cliente_id,
        carro_id=body.carro_id,
        sintomas=body.sintomas,
        hipotese_diagnostica=body.hipotese_diagnostica,
        checklist_eletrico=body.checklist_eletrico,
        observacoes=body.observacoes
    ))

    await manager.broadcast("NOVA_OS", {
        "numero_os": os_criada.numero_os,
        "cliente": os_criada.nome_cliente,
        "carro": os_criada.descricao_carro,
        "origem": os_criada.origem
    })

    return os_criada


@router.get("", response_model=List[OrdemServicoOutputDTO])
async def listar_ordens_servico(
    status_filtro: Optional[str] = Query(None, alias="status"),
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = GerenciarOrdemServicoUseCase(
        os_repo=OrdemServicoRepositorySQLAlchemy(session),
        cliente_repo=ClienteRepositorySQLAlchemy(session),
        peca_repo=PecaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    return await use_case.listar(status_filtro)


@router.get("/{os_id}", response_model=OrdemServicoOutputDTO)
async def buscar_os_por_id(
    os_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = GerenciarOrdemServicoUseCase(
        os_repo=OrdemServicoRepositorySQLAlchemy(session),
        cliente_repo=ClienteRepositorySQLAlchemy(session),
        peca_repo=PecaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    os = await use_case.buscar_por_id(os_id)
    if not os:
        raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada.")
    return os


@router.patch("/{os_id}/status", response_model=OrdemServicoOutputDTO)
async def atualizar_status_os(
    os_id: uuid.UUID,
    body: AtualizarStatusRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = GerenciarOrdemServicoUseCase(
        os_repo=OrdemServicoRepositorySQLAlchemy(session),
        cliente_repo=ClienteRepositorySQLAlchemy(session),
        peca_repo=PecaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    os_atualizada = await use_case.atualizar_status(AtualizarStatusOSInputDTO(
        os_id=os_id,
        novo_status=body.novo_status,
        usuario_id=usuario.id
    ))

    await manager.broadcast("STATUS_OS_ALTERADO", {
        "numero_os": os_atualizada.numero_os,
        "novo_status": os_atualizada.status
    })

    return os_atualizada


@router.post("/{os_id}/pecas", response_model=OrdemServicoOutputDTO)
async def alocar_peca_os(
    os_id: uuid.UUID,
    body: AlocarPecaRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = GerenciarOrdemServicoUseCase(
        os_repo=OrdemServicoRepositorySQLAlchemy(session),
        cliente_repo=ClienteRepositorySQLAlchemy(session),
        peca_repo=PecaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    return await use_case.alocar_peca(AlocarPecaOSInputDTO(
        os_id=os_id,
        peca_id=body.peca_id,
        quantidade=body.quantidade,
        preco_unitario=body.preco_unitario
    ))


@router.post("/{os_id}/servicos", response_model=OrdemServicoOutputDTO)
async def adicionar_servico_os(
    os_id: uuid.UUID,
    body: AdicionarServicoRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    use_case = GerenciarOrdemServicoUseCase(
        os_repo=OrdemServicoRepositorySQLAlchemy(session),
        cliente_repo=ClienteRepositorySQLAlchemy(session),
        peca_repo=PecaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session)
    )
    return await use_case.adicionar_servico(AdicionarServicoOSInputDTO(
        os_id=os_id,
        descricao=body.descricao,
        valor=body.valor,
        eletricista_id=body.eletricista_id
    ))
