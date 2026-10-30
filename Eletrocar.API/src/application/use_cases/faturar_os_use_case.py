"""
Caso de Uso: FaturarOrdemServicoUseCase
Pagamento confirmado e veículo liberado (FINALIZADO -> ENTREGUE):
- à vista: entrada no caixa aberto (PIX exige cobrança liquidada quando informada);
- a prazo (faturado/boleto): gera conta a receber para o cliente.
"""
from decimal import Decimal
from src.domain.entities.auditoria import novo_log
from src.domain.entities.ordem_servico import OrdemServicoStateMachine
from src.domain.value_objects.enums import TipoMovimentacaoCaixa, CategoriaTitulo, StatusOS
from src.domain.repositories.interfaces import (
    OrdemServicoRepositoryInterface,
    ClienteRepositoryInterface,
    CaixaRepositoryInterface,
    TituloFinanceiroRepositoryInterface,
    CobrancaPixRepositoryInterface,
    AuditoriaRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import (
    EntidadeNaoEncontradaException,
    CaixaFechadoException,
    TransicaoStatusInvalidaException,
)
from src.application.services.pagamentos import consumir_cobranca_pix, gerar_titulo_a_receber
from src.application.services.apresentacao_os import montar_os_dto
from src.application.dtos.os_dtos import FaturarOSInputDTO, OrdemServicoOutputDTO


class FaturarOrdemServicoUseCase:
    def __init__(
        self,
        os_repo: OrdemServicoRepositoryInterface,
        cliente_repo: ClienteRepositoryInterface,
        caixa_repo: CaixaRepositoryInterface,
        titulo_repo: TituloFinanceiroRepositoryInterface,
        cobranca_repo: CobrancaPixRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface,
        prazo_faturado_dias: int = 30,
    ):
        self.os_repo = os_repo
        self.cliente_repo = cliente_repo
        self.caixa_repo = caixa_repo
        self.titulo_repo = titulo_repo
        self.cobranca_repo = cobranca_repo
        self.audit_repo = audit_repo
        self.prazo_faturado_dias = prazo_faturado_dias

    async def executar(self, dto: FaturarOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self.os_repo.buscar_por_id(dto.os_id)
        if not os:
            raise EntidadeNaoEncontradaException("Ordem de serviço não encontrada.")
        if not OrdemServicoStateMachine.validar_transicao(os.status, StatusOS.ENTREGUE) or os.status == StatusOS.ENTREGUE:
            raise TransicaoStatusInvalidaException(os.status.value, StatusOS.ENTREGUE.value)

        forma = dto.forma_pagamento
        caixa = None
        if not forma.a_prazo and os.valor_total > Decimal("0.00"):
            caixa = await self.caixa_repo.obter_caixa_aberto()
            if not caixa:
                raise CaixaFechadoException("Abra o caixa do turno para receber o pagamento da OS.")

        await consumir_cobranca_pix(self.cobranca_repo, dto.cobranca_pix_id, forma, os.valor_total, os.numero_os)
        os.entregar(forma)

        if forma.a_prazo:
            await gerar_titulo_a_receber(
                self.titulo_repo,
                descricao=f"OS {os.numero_os} ({forma.value})",
                valor=os.valor_total,
                categoria=CategoriaTitulo.SERVICO_A_PRAZO,
                cliente_id=os.cliente_id,
                prazo_dias=self.prazo_faturado_dias,
                ordem_servico_id=os.id,
            )
        elif caixa is not None:
            caixa.registrar_movimentacao(
                TipoMovimentacaoCaixa.ENTRADA_OS, os.valor_total, forma, f"Recebimento OS #{os.numero_os}"
            )
            await self.caixa_repo.salvar(caixa)

        await self.os_repo.salvar(os)
        await self.audit_repo.registrar(novo_log(
            dto.operador_id, "ORDEM_SERVICO", "OS_FATURADA",
            detalhes={"os_id": str(os.id), "numero_os": os.numero_os,
                      "valor_total": str(os.valor_total), "forma_pagamento": forma.value},
            antes={"status": StatusOS.FINALIZADO.value},
            depois={"status": os.status.value},
        ))
        return await montar_os_dto(os, self.cliente_repo)
