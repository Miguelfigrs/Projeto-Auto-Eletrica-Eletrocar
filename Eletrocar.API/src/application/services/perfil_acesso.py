"""
Serviço de Aplicação: perfil de acesso após o login (Módulo 0 - Redirecionamento Automático por Perfil).
Define a tela inicial do PWA e os módulos liberados conforme a matriz RBAC:
Admin -> Dashboard financeiro, Balconista -> Balcão/PDV, Eletricista -> fila de OS.
"""
from dataclasses import dataclass
from typing import Iterable, List
from src.domain.value_objects.enums import Papel

MODULOS_POR_PAPEL = {
    Papel.ADMIN: [
        "DASHBOARD_FINANCEIRO", "BALCAO_PDV", "CAIXA", "FILA_OS", "ORDENS_SERVICO", "CLIENTES",
        "ESTOQUE", "ESTOQUE_GESTAO", "FINANCEIRO", "RELATORIOS", "USUARIOS", "AUDITORIA",
    ],
    Papel.BALCONISTA: ["BALCAO_PDV", "CAIXA", "ORDENS_SERVICO", "CLIENTES", "ESTOQUE"],
    Papel.ELETRICISTA: ["FILA_OS", "ORDENS_SERVICO", "CLIENTES", "ESTOQUE"],
}

# Ordem de prioridade da tela inicial quando o usuário acumula papéis
TELA_INICIAL_POR_PAPEL = [
    (Papel.ADMIN, "DASHBOARD_FINANCEIRO"),
    (Papel.BALCONISTA, "BALCAO_PDV"),
    (Papel.ELETRICISTA, "FILA_OS"),
]


@dataclass(frozen=True)
class PerfilAcesso:
    tela_inicial: str
    modulos: List[str]


def definir_perfil_acesso(papeis: Iterable[Papel]) -> PerfilAcesso:
    papeis = {Papel(p) for p in papeis}
    tela_inicial = next(tela for papel, tela in TELA_INICIAL_POR_PAPEL if papel in papeis)
    modulos: List[str] = []
    for papel, _ in TELA_INICIAL_POR_PAPEL:
        if papel in papeis:
            modulos.extend(m for m in MODULOS_POR_PAPEL[papel] if m not in modulos)
    return PerfilAcesso(tela_inicial=tela_inicial, modulos=modulos)
