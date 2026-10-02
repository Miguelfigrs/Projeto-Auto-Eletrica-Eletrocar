"""
Controlador de Peças e Componentes Elétricos.
Endpoints para busca por código de barras USB/BT e reposição de estoque.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional, List
import uuid
from src.infra.database.session import get_db_session
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy
from src.application.use_cases.buscar_peca_barcode_use_case import BuscarPecaPorCodigoBarrasUseCase
from src.application.use_cases.gerenciar_pecas_use_case import GerenciarPecasUseCase
from src.application.dtos.peca_dtos import CriarPecaInputDTO, PecaOutputDTO
from src.adapters.controllers.dependencies import get_current_user
from src.adapters.controllers.ws_controller import manager
from src.domain.entities.usuario import Usuario

router = APIRouter(prefix="/pecas", tags=["Peças & Estoque"])


class CriarPecaRequest(BaseModel):
    codigo_barras: str
    sku: str
    descricao: str
    preco_custo: Decimal
    preco_venda: Decimal
    estoque_atual: int
    estoque_minimo: int = 2
    localizacao: Optional[str] = None
    unidade_medida: str = "UN"


@router.get("/barcode/{code}", response_model=PecaOutputDTO)
async def buscar_por_codigo_barras(
    code: str,
    session: AsyncSession = Depends(get_db_session)
):
    repo = PecaRepositorySQLAlchemy(session)
    use_case = BuscarPecaPorCodigoBarrasUseCase(peca_repo=repo)
    peca = await use_case.executar(code)
    
    # Notifica via WebSocket que um bip ocorreu
    await manager.broadcast("LEITOR_BIP", {
        "codigo_barras": peca.codigo_barras,
        "sku": peca.sku,
        "descricao": peca.descricao,
        "preco_venda": str(peca.preco_venda)
    })
    
    return peca


@router.get("/search", response_model=List[PecaOutputDTO])
async def buscar_por_termo(
    q: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_db_session)
):
    repo = PecaRepositorySQLAlchemy(session)
    use_case = GerenciarPecasUseCase(peca_repo=repo)
    return await use_case.buscar_por_termo(q)


@router.get("/baixo-estoque", response_model=List[PecaOutputDTO])
async def listar_baixo_estoque(
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    repo = PecaRepositorySQLAlchemy(session)
    use_case = GerenciarPecasUseCase(peca_repo=repo)
    return await use_case.listar_baixo_estoque()


@router.post("", response_model=PecaOutputDTO, status_code=status.HTTP_201_CREATED)
async def cadastrar_peca(
    body: CriarPecaRequest,
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(get_current_user)
):
    repo = PecaRepositorySQLAlchemy(session)
    use_case = GerenciarPecasUseCase(peca_repo=repo)
    return await use_case.cadastrar_peca(CriarPecaInputDTO(
        codigo_barras=body.codigo_barras,
        sku=body.sku,
        descricao=body.descricao,
        preco_custo=body.preco_custo,
        preco_venda=body.preco_venda,
        estoque_atual=body.estoque_atual,
        estoque_minimo=body.estoque_minimo,
        localizacao=body.localizacao,
        unidade_medida=body.unidade_medida
    ))
