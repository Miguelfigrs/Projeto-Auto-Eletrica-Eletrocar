"""
Caso de Uso: GerenciarPecasUseCase
Cadastro, atualização, listagem e busca por termo no catálogo de peças e componentes elétricos.
"""
from typing import List, Optional
import uuid
from src.domain.entities.peca import Peca
from src.domain.repositories.interfaces import PecaRepositoryInterface
from src.domain.exceptions.domain_exceptions import RegraNegocioException, EntidadeNaoEncontradaException
from src.application.dtos.peca_dtos import CriarPecaInputDTO, PecaOutputDTO


class GerenciarPecasUseCase:
    def __init__(self, peca_repo: PecaRepositoryInterface):
        self.peca_repo = peca_repo

    async def cadastrar_peca(self, input_dto: CriarPecaInputDTO) -> PecaOutputDTO:
        # Verifica duplicidade de código de barras
        existente_barcode = await self.peca_repo.buscar_por_codigo_barras(input_dto.codigo_barras)
        if existente_barcode:
            raise RegraNegocioException(f"Já existe uma peça com o código de barras '{input_dto.codigo_barras}'.")

        existente_sku = await self.peca_repo.buscar_por_sku(input_dto.sku)
        if existente_sku:
            raise RegraNegocioException(f"Já existe uma peça com o SKU '{input_dto.sku}'.")

        peca = Peca(
            id=uuid.uuid4(),
            codigo_barras=input_dto.codigo_barras,
            sku=input_dto.sku,
            descricao=input_dto.descricao,
            preco_custo=input_dto.preco_custo,
            preco_venda=input_dto.preco_venda,
            estoque_atual=input_dto.estoque_atual,
            estoque_minimo=input_dto.estoque_minimo,
            localizacao=input_dto.localizacao,
            unidade_medida=input_dto.unidade_medida
        )

        salvo = await self.peca_repo.salvar(peca)
        return self._to_dto(salvo)

    async def buscar_por_termo(self, termo: str) -> List[PecaOutputDTO]:
        pecas = await self.peca_repo.buscar_por_termo(termo)
        return [self._to_dto(p) for p in pecas]

    async def listar_baixo_estoque(self) -> List[PecaOutputDTO]:
        pecas = await self.peca_repo.listar_baixo_estoque()
        return [self._to_dto(p) for p in pecas]

    def _to_dto(self, p: Peca) -> PecaOutputDTO:
        return PecaOutputDTO(
            id=p.id,
            codigo_barras=p.codigo_barras,
            sku=p.sku,
            descricao=p.descricao,
            preco_custo=p.preco_custo,
            preco_venda=p.preco_venda,
            estoque_atual=p.estoque_atual,
            estoque_minimo=p.estoque_minimo,
            localizacao=p.localizacao,
            unidade_medida=p.unidade_medida,
            abaixo_minimo=p.esta_abaixo_minimo(),
            margem_lucro=p.calcular_margem_lucro()
        )
