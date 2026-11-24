"""
Controlador de Relatórios Gerenciais: DRE (UC07) e auditoria (somente leitura) - Administrador.
"""
import calendar
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from src.infra.config import settings
from src.domain.value_objects.tempo import hoje_local
from src.domain.entities.usuario import Usuario
from src.application.dtos.dre_dtos import (
    DetalhamentoDREOutputDTO,
    PeriodoDREInputDTO,
    RelatorioDREOutputDTO,
    ResumoMensalDREItemDTO,
    ResumoMensalDREOutputDTO,
)
from src.application.use_cases.gerar_dre_use_case import GerarRelatorioDREUseCase
from src.application.use_cases.consultar_auditoria_use_case import ConsultarAuditoriaUseCase, LogAuditoriaOutputDTO
from src.adapters.controllers.dependencies import somente_admin
from src.adapters.controllers.fabricas import dre_uc, auditoria_uc

router = APIRouter(tags=["Relatórios Gerenciais (Admin)"])


def _resolver_periodo(
    data_inicio: Optional[date], data_fim: Optional[date], mes: Optional[int], ano: Optional[int]
) -> PeriodoDREInputDTO:
    if data_inicio is not None or data_fim is not None:
        fim = data_fim or hoje_local(settings.FUSO_HORARIO)
        inicio = data_inicio or fim.replace(day=1)
    elif ano is not None and mes is not None:
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        inicio = date(ano, mes, 1)
        fim = date(ano, mes, ultimo_dia)
    elif ano is not None:
        inicio = date(ano, 1, 1)
        fim = date(ano, 12, 31)
    elif mes is not None:
        ano_ref = hoje_local(settings.FUSO_HORARIO).year
        ultimo_dia = calendar.monthrange(ano_ref, mes)[1]
        inicio = date(ano_ref, mes, 1)
        fim = date(ano_ref, mes, ultimo_dia)
    else:
        fim = hoje_local(settings.FUSO_HORARIO)
        inicio = fim.replace(day=1)
    return PeriodoDREInputDTO(
        data_inicio=inicio, data_fim=fim, percentual_custo_mao_obra=settings.PERCENTUAL_CUSTO_MAO_OBRA
    )


@router.get("/relatorios/dre", response_model=RelatorioDREOutputDTO)
async def obter_relatorio_dre(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2000, le=2100),
    _: Usuario = Depends(somente_admin),
    uc: GerarRelatorioDREUseCase = Depends(dre_uc),
):
    return await uc.executar(_resolver_periodo(data_inicio, data_fim, mes, ano))


@router.get(
    "/relatorios/dre/detalhes",
    response_model=DetalhamentoDREOutputDTO,
    summary="Lançamentos que compõem a DRE: vendas, OS entregues e despesas pagas no período",
)
async def obter_detalhamento_dre(
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None, ge=2000, le=2100),
    _: Usuario = Depends(somente_admin),
    uc: GerarRelatorioDREUseCase = Depends(dre_uc),
):
    return await uc.detalhar(_resolver_periodo(data_inicio, data_fim, mes, ano))


@router.get("/relatorios/dre/mensal", response_model=ResumoMensalDREOutputDTO)
async def obter_resumo_mensal_dre(
    ano: int = Query(default_factory=lambda: hoje_local(settings.FUSO_HORARIO).year, ge=2000, le=2100),
    resultado: str = Query("TODOS", pattern="^(TODOS|LUCROS|PREJUIZOS)$"),
    _: Usuario = Depends(somente_admin),
    uc: GerarRelatorioDREUseCase = Depends(dre_uc),
):
    meses_filtrados: list[ResumoMensalDREItemDTO] = []
    soma_lucros = Decimal("0.00")
    soma_prejuizos = Decimal("0.00")

    for mes in range(1, 13):
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        relatorio = await uc.executar(
            PeriodoDREInputDTO(
                data_inicio=date(ano, mes, 1),
                data_fim=date(ano, mes, ultimo_dia),
                percentual_custo_mao_obra=settings.PERCENTUAL_CUSTO_MAO_OBRA,
            )
        )
        eh_lucro = relatorio.lucro_liquido > Decimal("0.00")
        eh_prejuizo = relatorio.lucro_liquido < Decimal("0.00")

        if eh_lucro:
            soma_lucros += relatorio.lucro_liquido
        elif eh_prejuizo:
            soma_prejuizos += abs(relatorio.lucro_liquido)

        if resultado == "LUCROS" and not eh_lucro:
            continue
        if resultado == "PREJUIZOS" and not eh_prejuizo:
            continue

        meses_filtrados.append(
            ResumoMensalDREItemDTO(
                ano=ano,
                mes=mes,
                competencia=f"{mes:02d}/{ano}",
                receita_bruta_total=relatorio.receita_bruta_total,
                receita_liquida=relatorio.receita_liquida,
                custos_diretos_total=relatorio.custos_diretos_total,
                despesas_totais=relatorio.despesas_totais,
                lucro_bruto=relatorio.lucro_bruto,
                lucro_liquido=relatorio.lucro_liquido,
                margem_lucro_liquido_percentual=relatorio.margem_lucro_liquido_percentual,
                eh_lucro=eh_lucro,
                eh_prejuizo=eh_prejuizo,
                quantidade_vendas=relatorio.quantidade_vendas,
                quantidade_os=relatorio.quantidade_os,
            )
        )

    saldo_liquido_filtrado = sum(
        (item.lucro_liquido for item in meses_filtrados),
        Decimal("0.00"),
    )

    return ResumoMensalDREOutputDTO(
        ano=ano,
        filtro_resultado=resultado,
        total_meses_filtrados=len(meses_filtrados),
        soma_lucros=soma_lucros,
        soma_prejuizos=soma_prejuizos,
        saldo_liquido_filtrado=saldo_liquido_filtrado,
        meses=meses_filtrados,
    )


@router.get("/auditoria", response_model=List[LogAuditoriaOutputDTO])
async def listar_auditoria(
    limite: int = Query(100, ge=1, le=1000),
    acao: Optional[str] = None,
    usuario_id: Optional[uuid.UUID] = None,
    _: Usuario = Depends(somente_admin),
    uc: ConsultarAuditoriaUseCase = Depends(auditoria_uc),
):
    return await uc.listar(limite, acao, usuario_id)
