"""
Controlador de Peças e Estoque.
Leitura pelo leitor de código de barras (todos os perfis), cadastro, preço e ajustes (Administrador).
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from src.domain.entities.usuario import Usuario
from src.application.dtos.peca_dtos import (
    CriarPecaInputDTO, AtualizarPecaInputDTO, EntradaEstoqueInputDTO, AjusteEstoqueInputDTO,
    PecaOutputDTO, SugestaoCompraOutputDTO,
)
from src.application.use_cases.gerenciar_pecas_use_case import GerenciarPecasUseCase
from src.application.use_cases.buscar_peca_barcode_use_case import BuscarPecaPorCodigoBarrasUseCase
from src.adapters.controllers.dependencies import get_current_user, somente_admin, balcao
from src.adapters.controllers.fabricas import pecas_uc, barcode_uc, movimentacoes_estoque_uc
from src.application.use_cases.consultar_movimentacoes_estoque_use_case import (
    ConsultarMovimentacoesEstoqueUseCase, MovimentacoesEstoqueOutputDTO,
)
from src.adapters.controllers.ws_controller import manager
from src.domain.value_objects.tempo import hoje_local
from src.infra.config import settings

router = APIRouter(prefix="/pecas", tags=["Peças & Estoque"])


class CriarPecaRequest(BaseModel):
    codigo_barras: str
    sku: str
    descricao: str
    preco_custo: Decimal = Field(ge=0)
    preco_venda: Decimal = Field(ge=0)
    estoque_atual: int = Field(ge=0)
    estoque_minimo: int = Field(default=2, ge=0)
    codigo_original_fabricante: Optional[str] = None
    fabricante: Optional[str] = None
    aplicacao_veicular: Optional[str] = None
    localizacao: Optional[str] = None
    unidade_medida: str = "UN"


class AtualizarPecaRequest(BaseModel):
    descricao: Optional[str] = None
    preco_custo: Optional[Decimal] = Field(default=None, ge=0)
    preco_venda: Optional[Decimal] = Field(default=None, ge=0)
    estoque_minimo: Optional[int] = Field(default=None, ge=0)
    codigo_original_fabricante: Optional[str] = None
    fabricante: Optional[str] = None
    aplicacao_veicular: Optional[str] = None
    localizacao: Optional[str] = None
    ativo: Optional[bool] = None


class EntradaRequest(BaseModel):
    quantidade: int = Field(gt=0)
    custo_unitario: Optional[Decimal] = Field(default=None, ge=0)
    observacao: str = ""


class AjusteRequest(BaseModel):
    novo_saldo: int = Field(ge=0)
    motivo: str = Field(min_length=3)


@router.get("/barcode/{code}", response_model=PecaOutputDTO)
async def buscar_por_codigo_barras(
    code: str,
    _: Usuario = Depends(get_current_user),
    uc: BuscarPecaPorCodigoBarrasUseCase = Depends(barcode_uc),
):
    peca = await uc.executar(code)
    await manager.broadcast("LEITOR_BIP", {
        "codigo_barras": peca.codigo_barras, "sku": peca.sku, "descricao": peca.descricao,
        "preco_venda": str(peca.preco_venda), "estoque_disponivel": peca.estoque_disponivel,
    })
    return peca


@router.get("", response_model=List[PecaOutputDTO], summary="Catálogo ativo completo (tela de estoque e PDV)")
async def listar_catalogo(
    _: Usuario = Depends(get_current_user),
    uc: GerenciarPecasUseCase = Depends(pecas_uc),
):
    return await uc.listar_catalogo()


@router.get("/search", response_model=List[PecaOutputDTO], summary="Busca por descrição, SKU, código original ou aplicação")
async def buscar_por_termo(
    q: str = Query(..., min_length=1),
    _: Usuario = Depends(get_current_user),
    uc: GerenciarPecasUseCase = Depends(pecas_uc),
):
    return await uc.buscar_por_termo(q)


@router.get("/baixo-estoque", response_model=List[PecaOutputDTO])
async def listar_baixo_estoque(_: Usuario = Depends(balcao), uc: GerenciarPecasUseCase = Depends(pecas_uc)):
    return await uc.listar_baixo_estoque()


@router.get("/sugestao-compra", response_model=List[SugestaoCompraOutputDTO])
async def sugestao_compra(
    dias_analise: int = Query(90, ge=7, le=365),
    dias_cobertura: int = Query(30, ge=1, le=180),
    _: Usuario = Depends(somente_admin),
    uc: GerenciarPecasUseCase = Depends(pecas_uc),
):
    return await uc.sugerir_compra(dias_analise, dias_cobertura)


@router.get(
    "/movimentacoes",
    response_model=MovimentacoesEstoqueOutputDTO,
    summary="Histórico de entradas e saídas de peças (vendas, OS, fornecedor, ajustes e cadastro)",
)
async def listar_movimentacoes(
    data_inicio: Optional[date] = Query(None, description="Padrão: 30 dias antes da data final"),
    data_fim: Optional[date] = Query(None, description="Padrão: hoje"),
    peca_id: Optional[uuid.UUID] = Query(None),
    tipo: Optional[str] = Query(None, pattern="^(ENTRADA|SAIDA)$"),
    _: Usuario = Depends(somente_admin),
    uc: ConsultarMovimentacoesEstoqueUseCase = Depends(movimentacoes_estoque_uc),
):
    fim = data_fim or hoje_local(settings.FUSO_HORARIO)
    inicio = data_inicio or (fim - timedelta(days=30))
    return await uc.executar(inicio, fim, peca_id, tipo)


@router.post("", response_model=PecaOutputDTO, status_code=status.HTTP_201_CREATED)
async def cadastrar_peca(body: CriarPecaRequest, admin: Usuario = Depends(somente_admin),
                         uc: GerenciarPecasUseCase = Depends(pecas_uc)):
    return await uc.cadastrar_peca(CriarPecaInputDTO(**body.model_dump()), executor_id=admin.id)


@router.patch("/{peca_id}", response_model=PecaOutputDTO)
async def atualizar_peca(peca_id: uuid.UUID, body: AtualizarPecaRequest, admin: Usuario = Depends(somente_admin),
                         uc: GerenciarPecasUseCase = Depends(pecas_uc)):
    return await uc.atualizar_peca(AtualizarPecaInputDTO(peca_id=peca_id, executor_id=admin.id, **body.model_dump()))


@router.post("/{peca_id}/entrada", response_model=PecaOutputDTO)
async def registrar_entrada(peca_id: uuid.UUID, body: EntradaRequest, admin: Usuario = Depends(somente_admin),
                            uc: GerenciarPecasUseCase = Depends(pecas_uc)):
    return await uc.registrar_entrada(EntradaEstoqueInputDTO(peca_id=peca_id, executor_id=admin.id, **body.model_dump()))


@router.post("/{peca_id}/ajuste", response_model=PecaOutputDTO)
async def ajustar_estoque(peca_id: uuid.UUID, body: AjusteRequest, admin: Usuario = Depends(somente_admin),
                          uc: GerenciarPecasUseCase = Depends(pecas_uc)):
    return await uc.ajustar_estoque(AjusteEstoqueInputDTO(peca_id=peca_id, executor_id=admin.id, **body.model_dump()))
