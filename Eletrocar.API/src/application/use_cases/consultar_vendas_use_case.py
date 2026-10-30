"""
Caso de Uso: ConsultarVendasUseCase
Balconista consulta as próprias vendas; Administrador consulta todas (matriz RBAC).
"""
from typing import List
from src.domain.entities.usuario import Usuario
from src.domain.repositories.interfaces import VendaBalcaoRepositoryInterface
from src.application.dtos.venda_dtos import VendaOutputDTO


class ConsultarVendasUseCase:
    def __init__(self, venda_repo: VendaBalcaoRepositoryInterface):
        self.venda_repo = venda_repo

    async def listar(self, solicitante: Usuario, limite: int = 50) -> List[VendaOutputDTO]:
        operador_id = None if solicitante.eh_admin() else solicitante.id
        vendas = await self.venda_repo.listar_recentes(limite=max(1, min(limite, 500)), operador_id=operador_id)
        return [VendaOutputDTO.de(v) for v in vendas]
