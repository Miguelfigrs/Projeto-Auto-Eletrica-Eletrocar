"""
Caso de Uso: GerenciarOrdemServicoUseCase (UC05 / UC08)
Abertura manual, ciclo de vida (máquina de estados), alocação de peças com reserva de estoque
(baixa automática na finalização, liberação no cancelamento) e inclusão de mão de obra.
"""
from typing import List, Optional
import uuid
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.auditoria import novo_log
from src.domain.value_objects.enums import StatusOS, OrigemOS, PrioridadeOS
from src.domain.repositories.interfaces import (
    OrdemServicoRepositoryInterface,
    ClienteRepositoryInterface,
    PecaRepositoryInterface,
    AuditoriaRepositoryInterface
)
from src.domain.exceptions.domain_exceptions import (
    EntidadeNaoEncontradaException,
    RegraNegocioException
)
from src.application.services.apresentacao_os import montar_os_dto
from src.application.dtos.os_dtos import (
    CriarOSBalcaoInputDTO,
    AtualizarStatusOSInputDTO,
    AlocarPecaOSInputDTO,
    AdicionarServicoOSInputDTO,
    OrdemServicoOutputDTO,
)

ORIGEM = "ORDEM_SERVICO"


def _prioridade(valor: str) -> PrioridadeOS:
    try:
        return PrioridadeOS((valor or "MEDIA").upper())
    except ValueError:
        raise RegraNegocioException(f"Prioridade '{valor}' inválida. Use BAIXA, MEDIA ou ALTA.")


class GerenciarOrdemServicoUseCase:
    def __init__(
        self,
        os_repo: OrdemServicoRepositoryInterface,
        cliente_repo: ClienteRepositoryInterface,
        peca_repo: PecaRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface
    ):
        self.os_repo = os_repo
        self.cliente_repo = cliente_repo
        self.peca_repo = peca_repo
        self.audit_repo = audit_repo

    async def abrir_os_balcao(self, dto: CriarOSBalcaoInputDTO) -> OrdemServicoOutputDTO:
        cliente = await self.cliente_repo.buscar_por_id(dto.cliente_id)
        if not cliente:
            raise EntidadeNaoEncontradaException("Cliente informado não existe.")
        carro = cliente.buscar_carro_por_id(dto.carro_id)
        if not carro:
            raise EntidadeNaoEncontradaException("Veículo informado não pertence a este cliente.")

        nova_os = OrdemServico(
            id=uuid.uuid4(),
            numero_os=await self.os_repo.obter_proximo_numero_os(),
            cliente_id=cliente.id,
            carro_id=carro.id,
            usuario_id=dto.usuario_id,
            status=StatusOS.TRIAGEM,
            origem=OrigemOS.BALCAO,
            prioridade=_prioridade(dto.prioridade),
            sintomas=dto.sintomas,
            hipotese_diagnostica=dto.hipotese_diagnostica,
            checklist_eletrico=dto.checklist_eletrico,
            observacoes=dto.observacoes
        )
        await self.os_repo.salvar(nova_os)
        await self.audit_repo.registrar(novo_log(
            dto.usuario_id, ORIGEM, "OS_ABERTA",
            detalhes={"os_id": str(nova_os.id), "numero_os": nova_os.numero_os, "origem": nova_os.origem.value}
        ))
        return await montar_os_dto(nova_os, self.cliente_repo)

    async def atualizar_status(self, dto: AtualizarStatusOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self._obter(dto.os_id)
        try:
            novo_status = StatusOS(str(dto.novo_status).upper())
        except ValueError:
            raise RegraNegocioException(f"Status '{dto.novo_status}' não é um status válido.")

        status_anterior = os.status
        os.transicionar_para(novo_status)

        if novo_status != status_anterior and novo_status in (StatusOS.FINALIZADO, StatusOS.CANCELADO):
            await self._efetivar_reservas(os, baixar=novo_status == StatusOS.FINALIZADO)

        await self.os_repo.salvar(os)
        await self.audit_repo.registrar(novo_log(
            dto.usuario_id, ORIGEM, "OS_STATUS_ATUALIZADO",
            detalhes={"os_id": str(os.id), "numero_os": os.numero_os},
            antes={"status": status_anterior.value},
            depois={"status": os.status.value},
        ))
        return await montar_os_dto(os, self.cliente_repo)

    async def _efetivar_reservas(self, os: OrdemServico, baixar: bool):
        """Finalização: baixa definitiva das peças reservadas. Cancelamento: libera a reserva."""
        quantidades = os.quantidades_por_peca()
        for peca_id in sorted(quantidades, key=str):
            peca = await self.peca_repo.buscar_por_id_para_atualizacao(peca_id)
            if not peca:
                raise EntidadeNaoEncontradaException(f"Peça {peca_id} da OS não encontrada.")
            if baixar:
                peca.baixar_reserva(quantidades[peca_id])
            else:
                peca.liberar_reserva(quantidades[peca_id])
            await self.peca_repo.salvar(peca)

    async def alocar_peca(self, dto: AlocarPecaOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self._obter(dto.os_id)
        peca = await self.peca_repo.buscar_por_id_para_atualizacao(dto.peca_id)
        if not peca or not peca.ativo:
            raise EntidadeNaoEncontradaException("Peça não encontrada no catálogo.")

        peca.validar_saldo(dto.quantidade)
        os.adicionar_item_peca(peca.id, peca.descricao, dto.quantidade, peca.preco_venda, peca.preco_custo)
        peca.reservar(dto.quantidade)

        await self.peca_repo.salvar(peca)
        await self.os_repo.salvar(os)
        await self.audit_repo.registrar(novo_log(
            dto.usuario_id, ORIGEM, "OS_PECA_RESERVADA",
            detalhes={"os_id": str(os.id), "numero_os": os.numero_os, "peca_id": str(peca.id),
                      "sku": peca.sku, "quantidade": dto.quantidade}
        ))
        return await montar_os_dto(os, self.cliente_repo)

    async def adicionar_servico(self, dto: AdicionarServicoOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self._obter(dto.os_id)
        os.adicionar_servico(descricao=dto.descricao, valor=dto.valor, eletricista_id=dto.eletricista_id)
        await self.os_repo.salvar(os)
        return await montar_os_dto(os, self.cliente_repo)

    async def buscar_por_id(self, os_id: uuid.UUID) -> Optional[OrdemServicoOutputDTO]:
        os = await self.os_repo.buscar_por_id(os_id)
        return await montar_os_dto(os, self.cliente_repo) if os else None

    async def listar(self, status: Optional[str] = None) -> List[OrdemServicoOutputDTO]:
        return [await montar_os_dto(os, self.cliente_repo) for os in await self.os_repo.listar(status)]

    async def _obter(self, os_id: uuid.UUID) -> OrdemServico:
        os = await self.os_repo.buscar_por_id(os_id)
        if not os:
            raise EntidadeNaoEncontradaException("Ordem de serviço não encontrada.")
        return os
