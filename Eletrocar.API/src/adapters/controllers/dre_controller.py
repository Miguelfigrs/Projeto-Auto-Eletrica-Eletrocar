"""
Controlador de Relatórios Gerenciais: DRE (UC07) e auditoria (somente leitura) - Administrador.
"""
from datetime import date, timedelta
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from src.infra.config import settings
from src.domain.entities.usuario import Usuario
from src.application.dtos.dre_dtos import PeriodoDREInputDTO, RelatorioDREOutputDTO
from src.application.use_cases.gerar_dre_use_case import GerarRelatorioDREUseCase
from src.application.use_cases.consultar_auditoria_use_case import ConsultarAuditoriaUseCase, LogAuditoriaOutputDTO
from src.adapters.controllers.dependencies import somente_admin
from src.adapters.controllers.fabricas import dre_uc, auditoria_uc

router = APIRouter(tags=["Relatórios Gerenciais (Admin)"])


@router.get("/relatorios/dre", response_model=RelatorioDREOutputDTO)
async def obter_relatorio_dre(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    _: Usuario = Depends(somente_admin),
    uc: GerarRelatorioDREUseCase = Depends(dre_uc),
):
    fim = data_fim or date.today()
    inicio = data_inicio or fim.replace(day=1)
    return await uc.executar(PeriodoDREInputDTO(
        data_inicio=inicio, data_fim=fim, percentual_custo_mao_obra=settings.PERCENTUAL_CUSTO_MAO_OBRA
    ))


@router.get("/auditoria", response_model=List[LogAuditoriaOutputDTO])
async def listar_auditoria(
    limite: int = Query(100, ge=1, le=1000),
    acao: Optional[str] = None,
    usuario_id: Optional[uuid.UUID] = None,
    _: Usuario = Depends(somente_admin),
    uc: ConsultarAuditoriaUseCase = Depends(auditoria_uc),
):
    return await uc.listar(limite, acao, usuario_id)
