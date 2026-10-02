"""
Caso de Uso: GerenciarOrdemServicoUseCase
Orquestra ciclo de vida, alocação de peças com baixa de estoque e inclusão de mão de obra.
"""
from typing import List, Optional
import uuid
from decimal import Decimal
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.auditoria import LogAuditoria
from src.domain.value_objects.enums import StatusOS, OrigemOS
from src.domain.repositories.interfaces import (
    OrdemServicoRepositoryInterface,
    ClienteRepositoryInterface,
    PecaRepositoryInterface,
    AuditoriaRepositoryInterface
)
from src.domain.exceptions.domain_exceptions import (
    EntidadeNaoEncontradaException,
    EstoqueInsuficienteException,
    RegraNegocioException
)
from src.application.dtos.os_dtos import (
    CriarOSBalcaoInputDTO,
    AtualizarStatusOSInputDTO,
    AlocarPecaOSInputDTO,
    AdicionarServicoOSInputDTO,
    OrdemServicoOutputDTO,
    ItemOSOutputDTO,
    ServicoOSOutputDTO
)


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

    async def abrir_os_balcao(self, input_dto: CriarOSBalcaoInputDTO) -> OrdemServicoOutputDTO:
        cliente = await self.cliente_repo.buscar_por_id(input_dto.cliente_id)
        if not cliente:
            raise EntidadeNaoEncontradaException("Cliente informado não existe.")

        carro = cliente.buscar_carro_por_id(input_dto.carro_id)
        if not carro:
            raise EntidadeNaoEncontradaException("Veículo informado não pertence a este cliente.")

        numero_os = await self.os_repo.obter_proximo_numero_os()
        nova_os = OrdemServico(
            id=uuid.uuid4(),
            numero_os=numero_os,
            cliente_id=cliente.id,
            carro_id=carro.id,
            usuario_id=input_dto.usuario_id,
            status=StatusOS.TRIAGEM,
            origem=OrigemOS.BALCAO,
            sintomas=input_dto.sintomas,
            hipotese_diagnostica=input_dto.hipotese_diagnostica,
            checklist_eletrico=input_dto.checklist_eletrico,
            observacoes=input_dto.observacoes
        )

        salvo = await self.os_repo.salvar(nova_os)
        return self._to_dto(salvo, cliente.nome, carro.formatar_descricao())

    async def atualizar_status(self, input_dto: AtualizarStatusOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self.os_repo.buscar_por_id(input_dto.os_id)
        if not os:
            raise EntidadeNaoEncontradaException("Ordem de serviço não encontrada.")

        try:
            novo_status_enum = StatusOS(input_dto.novo_status)
        except ValueError:
            raise RegraNegocioException(f"Status '{input_dto.novo_status}' não é um status válido.")

        status_anterior = os.status.value
        os.transicionar_para(novo_status_enum)
        await self.os_repo.salvar(os)

        await self.audit_repo.registrar(
            LogAuditoria(
                id=uuid.uuid4(),
                usuario_id=input_dto.usuario_id,
                origem="ORDEM_SERVICO",
                acao="OS_STATUS_ATUALIZADO",
                detalhes={
                    "os_id": str(os.id),
                    "numero_os": os.numero_os,
                    "status_anterior": status_anterior,
                    "novo_status": os.status.value
                }
            )
        )

        return await self._carregar_dto_completo(os)

    async def alocar_peca(self, input_dto: AlocarPecaOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self.os_repo.buscar_por_id(input_dto.os_id)
        if not os:
            raise EntidadeNaoEncontradaException("Ordem de serviço não encontrada.")

        peca = await self.peca_repo.buscar_por_id(input_dto.peca_id)
        if not peca:
            raise EntidadeNaoEncontradaException("Peça não encontrada no catálogo.")

        # Baixa imediata de estoque para alocação na OS
        peca.baixar_estoque(input_dto.quantidade)
        await self.peca_repo.salvar(peca)

        preco = input_dto.preco_unitario or peca.preco_venda
        os.adicionar_item_peca(
            peca_id=peca.id,
            descricao_peca=peca.descricao,
            quantidade=input_dto.quantidade,
            preco_unitario=preco
        )
        await self.os_repo.salvar(os)

        return await self._carregar_dto_completo(os)

    async def adicionar_servico(self, input_dto: AdicionarServicoOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self.os_repo.buscar_por_id(input_dto.os_id)
        if not os:
            raise EntidadeNaoEncontradaException("Ordem de serviço não encontrada.")

        os.adicionar_servico(
            descricao=input_dto.descricao,
            valor=input_dto.valor,
            eletricista_id=input_dto.eletricista_id
        )
        await self.os_repo.salvar(os)

        return await self._carregar_dto_completo(os)

    async def buscar_por_id(self, os_id: uuid.UUID) -> Optional[OrdemServicoOutputDTO]:
        os = await self.os_repo.buscar_por_id(os_id)
        if not os:
            return None
        return await self._carregar_dto_completo(os)

    async def listar(self, status: Optional[str] = None) -> List[OrdemServicoOutputDTO]:
        ordens = await self.os_repo.listar(status)
        resultado = []
        for os in ordens:
            dto = await self._carregar_dto_completo(os)
            resultado.append(dto)
        return resultado

    async def _carregar_dto_completo(self, os: OrdemServico) -> OrdemServicoOutputDTO:
        cliente = await self.cliente_repo.buscar_por_id(os.cliente_id)
        nome_cliente = cliente.nome if cliente else "Cliente Não Identificado"
        descricao_carro = "Veículo"
        if cliente:
            carro = cliente.buscar_carro_por_id(os.carro_id)
            if carro:
                descricao_carro = carro.formatar_descricao()

        return self._to_dto(os, nome_cliente, descricao_carro)

    def _to_dto(self, os: OrdemServico, nome_cliente: str, descricao_carro: str) -> OrdemServicoOutputDTO:
        return OrdemServicoOutputDTO(
            id=os.id,
            numero_os=os.numero_os,
            cliente_id=os.cliente_id,
            nome_cliente=nome_cliente,
            carro_id=os.carro_id,
            descricao_carro=descricao_carro,
            usuario_id=os.usuario_id,
            status=os.status.value,
            origem=os.origem.value,
            sintomas=os.sintomas,
            hipotese_diagnostica=os.hipotese_diagnostica,
            checklist_eletrico=os.checklist_eletrico,
            itens=[
                ItemOSOutputDTO(
                    id=it.id,
                    peca_id=it.peca_id,
                    descricao_peca=it.descricao_peca,
                    quantidade=it.quantidade,
                    preco_unitario=it.preco_unitario,
                    subtotal=it.subtotal
                )
                for it in os.itens
            ],
            servicos=[
                ServicoOSOutputDTO(
                    id=s.id,
                    descricao=s.descricao,
                    valor=s.valor,
                    eletricista_responsavel_id=s.eletricista_responsavel_id
                )
                for s in os.servicos
            ],
            valor_pecas=os.valor_pecas,
            valor_servicos=os.valor_servicos,
            desconto=os.desconto,
            valor_total=os.valor_total,
            created_at=os.created_at,
            updated_at=os.updated_at,
            sucesso=True
        )
