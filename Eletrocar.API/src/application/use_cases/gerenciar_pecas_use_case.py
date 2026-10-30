"""
Caso de Uso: GerenciarPecasUseCase (Módulo 3 - Estoque Inteligente)
Cadastro, alteração de preço (auditada), entrada e ajuste de estoque com bloqueio de linha,
busca por código original/aplicação veicular e sugestão de compra por giro médio.
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Callable, List
import uuid
from src.domain.entities.peca import Peca
from src.domain.entities.auditoria import novo_log
from src.domain.services.sugestao_compra_service import SugestaoCompraService
from src.domain.value_objects.tempo import agora_utc
from src.domain.repositories.interfaces import PecaRepositoryInterface, AuditoriaRepositoryInterface
from src.domain.exceptions.domain_exceptions import RegraNegocioException, EntidadeNaoEncontradaException
from src.application.dtos.peca_dtos import (
    CriarPecaInputDTO,
    AtualizarPecaInputDTO,
    EntradaEstoqueInputDTO,
    AjusteEstoqueInputDTO,
    PecaOutputDTO,
    SugestaoCompraOutputDTO,
)

ORIGEM = "ESTOQUE"


class GerenciarPecasUseCase:
    def __init__(
        self,
        peca_repo: PecaRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface,
        relogio: Callable[[], datetime] = agora_utc
    ):
        self.peca_repo = peca_repo
        self.audit_repo = audit_repo
        self.relogio = relogio

    async def cadastrar_peca(self, dto: CriarPecaInputDTO, executor_id: uuid.UUID) -> PecaOutputDTO:
        if await self.peca_repo.buscar_por_codigo_barras(dto.codigo_barras):
            raise RegraNegocioException(f"Já existe uma peça com o código de barras '{dto.codigo_barras}'.")
        if await self.peca_repo.buscar_por_sku(dto.sku):
            raise RegraNegocioException(f"Já existe uma peça com o SKU '{dto.sku.strip().upper()}'.")

        peca = Peca(
            id=uuid.uuid4(),
            codigo_barras=dto.codigo_barras,
            sku=dto.sku,
            descricao=dto.descricao,
            preco_custo=dto.preco_custo,
            preco_venda=dto.preco_venda,
            estoque_atual=dto.estoque_atual,
            estoque_minimo=dto.estoque_minimo,
            codigo_original_fabricante=dto.codigo_original_fabricante,
            fabricante=dto.fabricante,
            aplicacao_veicular=dto.aplicacao_veicular,
            localizacao=dto.localizacao,
            unidade_medida=dto.unidade_medida,
        )
        await self.peca_repo.salvar(peca)
        await self.audit_repo.registrar(novo_log(
            executor_id, ORIGEM, "PECA_CADASTRADA",
            detalhes={"peca_id": str(peca.id), "sku": peca.sku},
            depois={"preco_custo": str(peca.preco_custo), "preco_venda": str(peca.preco_venda),
                    "estoque_atual": peca.estoque_atual},
        ))
        return PecaOutputDTO.de(peca)

    async def atualizar_peca(self, dto: AtualizarPecaInputDTO) -> PecaOutputDTO:
        peca = await self._obter(dto.peca_id, bloquear=True)
        precos_antes = {"preco_custo": str(peca.preco_custo), "preco_venda": str(peca.preco_venda)}
        cadastro_antes = self._cadastro(peca)

        if dto.preco_custo is not None or dto.preco_venda is not None:
            peca.alterar_precos(
                dto.preco_custo if dto.preco_custo is not None else peca.preco_custo,
                dto.preco_venda if dto.preco_venda is not None else peca.preco_venda,
            )
        for campo in ("descricao", "codigo_original_fabricante", "fabricante", "aplicacao_veicular", "localizacao", "ativo"):
            valor = getattr(dto, campo)
            if valor is not None:
                setattr(peca, campo, valor)
        if dto.estoque_minimo is not None:
            if dto.estoque_minimo < 0:
                raise RegraNegocioException("Estoque mínimo não pode ser negativo.")
            peca.estoque_minimo = dto.estoque_minimo
        peca.validar()

        await self.peca_repo.salvar(peca)
        precos_depois = {"preco_custo": str(peca.preco_custo), "preco_venda": str(peca.preco_venda)}
        if precos_depois != precos_antes:
            await self.audit_repo.registrar(novo_log(
                dto.executor_id, ORIGEM, "PRECO_ALTERADO",
                detalhes={"peca_id": str(peca.id), "sku": peca.sku},
                antes=precos_antes, depois=precos_depois,
            ))
        cadastro_depois = self._cadastro(peca)
        if cadastro_depois != cadastro_antes:
            await self.audit_repo.registrar(novo_log(
                dto.executor_id, ORIGEM, "PECA_ATUALIZADA",
                detalhes={"peca_id": str(peca.id), "sku": peca.sku},
                antes=cadastro_antes, depois=cadastro_depois,
            ))
        return PecaOutputDTO.de(peca)

    async def registrar_entrada(self, dto: EntradaEstoqueInputDTO) -> PecaOutputDTO:
        peca = await self._obter(dto.peca_id, bloquear=True)
        antes = {"estoque_atual": peca.estoque_atual, "preco_custo": str(peca.preco_custo)}
        peca.adicionar_estoque(dto.quantidade)
        if dto.custo_unitario is not None:
            peca.alterar_precos(dto.custo_unitario, peca.preco_venda)
        await self.peca_repo.salvar(peca)
        await self.audit_repo.registrar(novo_log(
            dto.executor_id, ORIGEM, "ESTOQUE_ENTRADA",
            detalhes={"peca_id": str(peca.id), "sku": peca.sku, "quantidade": dto.quantidade,
                      "observacao": dto.observacao},
            antes=antes,
            depois={"estoque_atual": peca.estoque_atual, "preco_custo": str(peca.preco_custo)},
        ))
        return PecaOutputDTO.de(peca)

    async def ajustar_estoque(self, dto: AjusteEstoqueInputDTO) -> PecaOutputDTO:
        if not (dto.motivo or "").strip():
            raise RegraNegocioException("O motivo do ajuste de estoque é obrigatório.")
        peca = await self._obter(dto.peca_id, bloquear=True)
        antes = {"estoque_atual": peca.estoque_atual}
        diferenca = peca.ajustar_saldo(dto.novo_saldo)
        await self.peca_repo.salvar(peca)
        await self.audit_repo.registrar(novo_log(
            dto.executor_id, ORIGEM, "ESTOQUE_AJUSTADO",
            detalhes={"peca_id": str(peca.id), "sku": peca.sku, "diferenca": diferenca, "motivo": dto.motivo},
            antes=antes, depois={"estoque_atual": peca.estoque_atual},
        ))
        return PecaOutputDTO.de(peca)

    async def buscar_por_termo(self, termo: str) -> List[PecaOutputDTO]:
        if not (termo or "").strip():
            return []
        return [PecaOutputDTO.de(p) for p in await self.peca_repo.buscar_por_termo(termo.strip()) if p.ativo]

    async def listar_baixo_estoque(self) -> List[PecaOutputDTO]:
        return [PecaOutputDTO.de(p) for p in await self.peca_repo.listar_baixo_estoque() if p.ativo]

    async def sugerir_compra(self, dias_analise: int = 90, dias_cobertura: int = 30) -> List[SugestaoCompraOutputDTO]:
        consumo = await self.peca_repo.consumo_por_peca(self.relogio() - timedelta(days=dias_analise))
        sugestoes = []
        for peca in await self.peca_repo.listar_ativas():
            consumido = consumo.get(peca.id, 0)
            calculo = SugestaoCompraService.calcular(
                peca.estoque_disponivel, peca.estoque_minimo, consumido, dias_analise, dias_cobertura
            )
            if calculo.quantidade_sugerida > 0:
                sugestoes.append(SugestaoCompraOutputDTO(
                    peca_id=peca.id, sku=peca.sku, descricao=peca.descricao,
                    estoque_disponivel=peca.estoque_disponivel, estoque_minimo=peca.estoque_minimo,
                    consumo_periodo=consumido, giro_medio_diario=calculo.giro_medio_diario,
                    quantidade_sugerida=calculo.quantidade_sugerida,
                ))
        return sorted(sugestoes, key=lambda s: s.quantidade_sugerida, reverse=True)

    async def _obter(self, peca_id: uuid.UUID, bloquear: bool = False) -> Peca:
        peca = await (self.peca_repo.buscar_por_id_para_atualizacao(peca_id) if bloquear
                      else self.peca_repo.buscar_por_id(peca_id))
        if not peca:
            raise EntidadeNaoEncontradaException("Peça não encontrada no catálogo.")
        return peca

    @staticmethod
    def _cadastro(peca: Peca) -> dict:
        return {
            "descricao": peca.descricao,
            "estoque_minimo": peca.estoque_minimo,
            "codigo_original_fabricante": peca.codigo_original_fabricante,
            "fabricante": peca.fabricante,
            "aplicacao_veicular": peca.aplicacao_veicular,
            "localizacao": peca.localizacao,
            "ativo": peca.ativo,
        }
