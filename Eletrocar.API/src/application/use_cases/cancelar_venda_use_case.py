"""
Caso de Uso: CancelarVendaUseCase (exclusão lógica de venda - somente Administrador)
Estorna o estoque, estorna o valor no caixa aberto (ou cancela o título a receber)
e grava auditoria imutável com o estado antes/depois.
"""
from decimal import Decimal
import uuid
from src.domain.entities.auditoria import novo_log
from src.domain.value_objects.enums import StatusVenda, StatusTitulo, TipoMovimentacaoCaixa
from src.domain.repositories.interfaces import (
    VendaBalcaoRepositoryInterface,
    PecaRepositoryInterface,
    CaixaRepositoryInterface,
    TituloFinanceiroRepositoryInterface,
    AuditoriaRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import (
    EntidadeNaoEncontradaException,
    RegraNegocioException,
    CaixaFechadoException,
)
from src.application.dtos.venda_dtos import CancelarVendaInputDTO, VendaOutputDTO


class CancelarVendaUseCase:
    def __init__(
        self,
        venda_repo: VendaBalcaoRepositoryInterface,
        peca_repo: PecaRepositoryInterface,
        caixa_repo: CaixaRepositoryInterface,
        titulo_repo: TituloFinanceiroRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface,
    ):
        self.venda_repo = venda_repo
        self.peca_repo = peca_repo
        self.caixa_repo = caixa_repo
        self.titulo_repo = titulo_repo
        self.audit_repo = audit_repo

    async def executar(self, dto: CancelarVendaInputDTO) -> VendaOutputDTO:
        venda = await self.venda_repo.buscar_por_id(dto.venda_id)
        if not venda:
            raise EntidadeNaoEncontradaException("Venda não encontrada.")
        if venda.status == StatusVenda.CANCELADA:
            raise RegraNegocioException("Venda já está cancelada.")

        # Pré-validações do estorno financeiro antes de qualquer alteração
        titulo = None
        caixa = None
        if venda.forma_pagamento.a_prazo:
            titulo = await self.titulo_repo.buscar_por_venda(venda.id)
            if titulo and titulo.status == StatusTitulo.PAGO:
                raise RegraNegocioException("O título desta venda já foi recebido: realize a devolução financeira antes.")
        elif venda.valor_total > Decimal("0.00"):
            caixa = await self.caixa_repo.obter_caixa_aberto()
            if not caixa:
                raise CaixaFechadoException("Abra o caixa para registrar o estorno do cancelamento.")

        antes = {"status": venda.status.value, "valor_total": str(venda.valor_total)}
        venda.cancelar(dto.motivo)

        if caixa is not None:
            caixa.registrar_movimentacao(
                TipoMovimentacaoCaixa.ESTORNO_VENDA, venda.valor_total, venda.forma_pagamento,
                f"Estorno da venda #{venda.numero_venda}"
            )
            await self.caixa_repo.salvar(caixa)
        if titulo is not None and titulo.status == StatusTitulo.ABERTO:
            titulo.cancelar()
            await self.titulo_repo.salvar(titulo)

        for peca_id in sorted(venda.quantidades_por_peca(), key=str):
            peca = await self.peca_repo.buscar_por_id_para_atualizacao(peca_id)
            if peca:
                peca.estornar(venda.quantidades_por_peca()[peca_id])
                await self.peca_repo.salvar(peca)

        await self.venda_repo.salvar(venda)
        await self.audit_repo.registrar(novo_log(
            dto.executor_id, "BALCAO_PDV", "VENDA_CANCELADA",
            detalhes={"venda_id": str(venda.id), "numero_venda": venda.numero_venda},
            antes=antes,
            depois={"status": venda.status.value, "motivo": venda.motivo_cancelamento},
        ))
        return VendaOutputDTO.de(venda)
