"""
Controlador Financeiro: contas a pagar/receber e inadimplência (Administrador),
cobranças PIX (balcão) e webhook de liquidação PIX (provedor de pagamento).
"""
from datetime import date
from decimal import Decimal
import hmac
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from src.infra.config import settings
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import TipoTitulo, StatusTitulo, CategoriaTitulo, FormaPagamento
from src.application.dtos.financeiro_dtos import (
    CriarTituloInputDTO, BaixarTituloInputDTO, TituloOutputDTO, RelatorioInadimplenciaDTO,
    GerarCobrancaPixInputDTO, LiquidacaoPixInputDTO, CobrancaPixOutputDTO,
)
from src.application.use_cases.gerenciar_titulos_use_case import GerenciarTitulosUseCase
from src.application.use_cases.pagamento_pix_use_case import PagamentoPixUseCase
from src.adapters.controllers.dependencies import somente_admin, balcao
from src.adapters.controllers.fabricas import titulos_uc, pix_uc
from src.adapters.controllers.ws_controller import manager

router = APIRouter(tags=["Financeiro: Contas, Inadimplência e PIX"])


class CriarTituloRequest(BaseModel):
    tipo: TipoTitulo
    descricao: str = Field(min_length=3)
    valor: Decimal = Field(gt=0)
    data_vencimento: date
    categoria: CategoriaTitulo
    cliente_id: Optional[uuid.UUID] = None


class BaixarTituloRequest(BaseModel):
    data_pagamento: date
    forma_pagamento: FormaPagamento


class CobrancaPixRequest(BaseModel):
    valor: Decimal = Field(gt=0)
    descricao: str = Field(default="Auto Eletrica Eletrocar", max_length=40)


class LiquidacaoPixRequest(BaseModel):
    txid: str
    valor: Decimal
    end_to_end_id: str


@router.get("/financeiro/titulos", response_model=List[TituloOutputDTO])
async def listar_titulos(tipo: Optional[TipoTitulo] = None, status_titulo: Optional[StatusTitulo] = Query(None, alias="status"),
                         vencidos: bool = False, _: Usuario = Depends(somente_admin),
                         uc: GerenciarTitulosUseCase = Depends(titulos_uc)):
    return await uc.listar(tipo, status_titulo, somente_vencidos=vencidos)


@router.post("/financeiro/titulos", response_model=TituloOutputDTO, status_code=status.HTTP_201_CREATED)
async def criar_titulo(body: CriarTituloRequest, admin: Usuario = Depends(somente_admin),
                       uc: GerenciarTitulosUseCase = Depends(titulos_uc)):
    return await uc.criar(CriarTituloInputDTO(**body.model_dump()), executor_id=admin.id)


@router.post("/financeiro/titulos/{titulo_id}/baixa", response_model=TituloOutputDTO)
async def baixar_titulo(titulo_id: uuid.UUID, body: BaixarTituloRequest, admin: Usuario = Depends(somente_admin),
                        uc: GerenciarTitulosUseCase = Depends(titulos_uc)):
    return await uc.baixar(BaixarTituloInputDTO(titulo_id=titulo_id, executor_id=admin.id, **body.model_dump()))


@router.post("/financeiro/titulos/{titulo_id}/cancelar", response_model=TituloOutputDTO)
async def cancelar_titulo(titulo_id: uuid.UUID, admin: Usuario = Depends(somente_admin),
                          uc: GerenciarTitulosUseCase = Depends(titulos_uc)):
    return await uc.cancelar(titulo_id, executor_id=admin.id)


@router.get("/financeiro/inadimplencia", response_model=RelatorioInadimplenciaDTO)
async def inadimplencia(_: Usuario = Depends(somente_admin), uc: GerenciarTitulosUseCase = Depends(titulos_uc)):
    return await uc.relatorio_inadimplencia()


@router.post("/pagamentos/pix/cobrancas", response_model=CobrancaPixOutputDTO, status_code=status.HTTP_201_CREATED)
async def gerar_cobranca_pix(body: CobrancaPixRequest, operador: Usuario = Depends(balcao),
                             uc: PagamentoPixUseCase = Depends(pix_uc)):
    return await uc.gerar_cobranca(GerarCobrancaPixInputDTO(valor=body.valor, descricao=body.descricao, operador_id=operador.id))


@router.get("/pagamentos/pix/cobrancas/{cobranca_id}", response_model=CobrancaPixOutputDTO)
async def consultar_cobranca_pix(cobranca_id: uuid.UUID, _: Usuario = Depends(balcao),
                                 uc: PagamentoPixUseCase = Depends(pix_uc)):
    return await uc.consultar(cobranca_id)


@router.post("/pagamentos/pix/webhook", response_model=CobrancaPixOutputDTO,
             summary="Liquidação PIX enviada pelo PSP (header X-Webhook-Secret)")
async def webhook_liquidacao_pix(body: LiquidacaoPixRequest, x_webhook_secret: Optional[str] = Header(default=None),
                                 uc: PagamentoPixUseCase = Depends(pix_uc)):
    if not x_webhook_secret or not hmac.compare_digest(x_webhook_secret, settings.PIX_WEBHOOK_SECRET):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Webhook PIX não autorizado.")
    cobranca = await uc.liquidar(LiquidacaoPixInputDTO(txid=body.txid, valor_pago=body.valor, end_to_end_id=body.end_to_end_id))
    await manager.broadcast("PIX_LIQUIDADO", {"cobranca_id": str(cobranca.id), "txid": cobranca.txid, "valor": str(cobranca.valor)})
    return cobranca
