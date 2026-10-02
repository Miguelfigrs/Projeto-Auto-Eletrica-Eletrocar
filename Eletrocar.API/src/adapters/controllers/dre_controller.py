"""
Controlador de Relatórios Financeiros e DRE Gerencial.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from src.infra.database.session import get_db_session
from src.adapters.repositories.venda_balcao_repository_sqlalchemy import VendaBalcaoRepositorySQLAlchemy
from src.adapters.repositories.ordem_servico_repository_sqlalchemy import OrdemServicoRepositorySQLAlchemy
from src.application.use_cases.gerar_dre_use_case import GerarRelatorioDREUseCase
from src.application.dtos.dre_dtos import PeriodoDREInputDTO, RelatorioDREOutputDTO
from src.adapters.controllers.dependencies import require_role
from src.domain.entities.usuario import Usuario

router = APIRouter(prefix="/relatorios", tags=["Relatórios Financeiros & DRE"])


@router.get("/dre", response_model=RelatorioDREOutputDTO)
async def obter_relatorio_dre(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    despesas_fixas: Decimal = Query(Decimal("0.00")),
    despesas_variaveis: Decimal = Query(Decimal("0.00")),
    session: AsyncSession = Depends(get_db_session),
    usuario: Usuario = Depends(require_role(["ADMIN"]))
):
    dt_inicio = data_inicio or (date.today() - timedelta(days=30))
    dt_fim = data_fim or date.today()

    use_case = GerarRelatorioDREUseCase(
        venda_repo=VendaBalcaoRepositorySQLAlchemy(session),
        os_repo=OrdemServicoRepositorySQLAlchemy(session)
    )

    return await use_case.executar(PeriodoDREInputDTO(
        data_inicio=dt_inicio,
        data_fim=dt_fim,
        despesas_fixas=despesas_fixas,
        despesas_variaveis=despesas_variaveis
    ))
