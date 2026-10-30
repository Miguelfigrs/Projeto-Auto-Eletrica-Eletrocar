"""
Caso de Uso: PagamentoPixUseCase (RF20)
Gera cobrança PIX dinâmica (QR Code copia-e-cola) e confirma a liquidação automaticamente
quando o provedor PIX chama o webhook. A cobrança liquidada é então consumida pela venda/OS.
"""
from datetime import datetime, timedelta
from typing import Callable
import uuid
from src.domain.entities.cobranca_pix import CobrancaPix
from src.domain.entities.auditoria import novo_log
from src.domain.gateways.interfaces import PixGateway
from src.domain.value_objects.tempo import agora_utc
from src.domain.repositories.interfaces import CobrancaPixRepositoryInterface, AuditoriaRepositoryInterface
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException, RegraNegocioException
from src.application.dtos.financeiro_dtos import GerarCobrancaPixInputDTO, LiquidacaoPixInputDTO, CobrancaPixOutputDTO

ORIGEM = "PAGAMENTO_PIX"


class PagamentoPixUseCase:
    def __init__(
        self,
        cobranca_repo: CobrancaPixRepositoryInterface,
        pix_gateway: PixGateway,
        audit_repo: AuditoriaRepositoryInterface,
        expiracao_minutos: int = 30,
        relogio: Callable[[], datetime] = agora_utc,
    ):
        self.cobranca_repo = cobranca_repo
        self.pix_gateway = pix_gateway
        self.audit_repo = audit_repo
        self.expiracao = timedelta(minutes=expiracao_minutos)
        self.relogio = relogio

    async def gerar_cobranca(self, dto: GerarCobrancaPixInputDTO) -> CobrancaPixOutputDTO:
        if dto.valor <= 0:
            raise RegraNegocioException("O valor da cobrança PIX deve ser maior que zero.")
        agora = self.relogio()
        txid = "ELC" + uuid.uuid4().hex[:22]  # 25 caracteres alfanuméricos (limite do BR Code com chave)
        gerada = await self.pix_gateway.criar_cobranca(
            txid, dto.valor, dto.descricao or "Auto Eletrica Eletrocar", int(self.expiracao.total_seconds())
        )
        cobranca = CobrancaPix(
            id=uuid.uuid4(), txid=txid, valor=dto.valor, copia_e_cola=gerada.copia_e_cola,
            descricao=dto.descricao, criada_em=agora, expira_em=agora + self.expiracao,
        )
        await self.cobranca_repo.salvar(cobranca)
        await self.audit_repo.registrar(novo_log(
            dto.operador_id, ORIGEM, "PIX_COBRANCA_GERADA",
            detalhes={"cobranca_id": str(cobranca.id), "txid": txid, "valor": str(cobranca.valor)},
        ))
        return CobrancaPixOutputDTO.de(cobranca)

    async def liquidar(self, dto: LiquidacaoPixInputDTO) -> CobrancaPixOutputDTO:
        cobranca = await self.cobranca_repo.buscar_por_txid(dto.txid)
        if not cobranca:
            raise EntidadeNaoEncontradaException(f"Cobrança PIX com txid '{dto.txid}' não encontrada.")
        cobranca.liquidar(dto.valor_pago, dto.end_to_end_id, self.relogio())
        await self.cobranca_repo.salvar(cobranca)
        await self.audit_repo.registrar(novo_log(
            None, ORIGEM, "PIX_LIQUIDADO",
            detalhes={"cobranca_id": str(cobranca.id), "txid": cobranca.txid,
                      "valor": str(cobranca.valor), "end_to_end_id": dto.end_to_end_id},
        ))
        return CobrancaPixOutputDTO.de(cobranca)

    async def consultar(self, cobranca_id: uuid.UUID) -> CobrancaPixOutputDTO:
        cobranca = await self.cobranca_repo.buscar_por_id(cobranca_id)
        if not cobranca:
            raise EntidadeNaoEncontradaException("Cobrança PIX não encontrada.")
        if cobranca.esta_expirada(self.relogio()):
            cobranca.expirar(self.relogio())
            await self.cobranca_repo.salvar(cobranca)
        return CobrancaPixOutputDTO.de(cobranca)
