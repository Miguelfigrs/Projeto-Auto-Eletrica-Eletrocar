"""
Caso de Uso: CriarOSPorVozTelegramUseCase (UC06 <<include>> UC05)
1. Valida se o emissor é um colaborador autorizado (whitelist de telegram_user_id + papel de eletricista)
2. Localiza ou cadastra automaticamente o Cliente e o Carro
3. Abre a Ordem de Serviço com status 'TRIAGEM' e origem 'TELEGRAM_VOICE'
4. Grava auditoria imutável
"""
import uuid
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.auditoria import novo_log
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import StatusOS, OrigemOS, PrioridadeOS
from src.domain.repositories.interfaces import (
    UsuarioRepositoryInterface,
    ClienteRepositoryInterface,
    OrdemServicoRepositoryInterface,
    AuditoriaRepositoryInterface
)
from src.domain.exceptions.domain_exceptions import AcessoNegadoException, RegraNegocioException
from src.application.dtos.os_dtos import CriarOSVozInputDTO, OrdemServicoOutputDTO


async def obter_colaborador_autorizado(usuario_repo: UsuarioRepositoryInterface, telegram_user_id: str) -> Usuario:
    """Whitelist do Telegram: somente colaboradores ativos, cadastrados e com papel de eletricista."""
    usuario = await usuario_repo.buscar_por_telegram_id(str(telegram_user_id).strip())
    if not usuario or not usuario.ativo or not usuario.pode_executar_servico():
        raise AcessoNegadoException(
            f"Usuário do Telegram '{telegram_user_id}' não autorizado a abrir Ordens de Serviço."
        )
    return usuario


class CriarOSPorVozTelegramUseCase:
    def __init__(
        self,
        usuario_repo: UsuarioRepositoryInterface,
        cliente_repo: ClienteRepositoryInterface,
        os_repo: OrdemServicoRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface
    ):
        self.usuario_repo = usuario_repo
        self.cliente_repo = cliente_repo
        self.os_repo = os_repo
        self.audit_repo = audit_repo

    async def executar(self, dto: CriarOSVozInputDTO) -> OrdemServicoOutputDTO:
        usuario = await obter_colaborador_autorizado(self.usuario_repo, dto.telegram_user_id)

        cliente = await self._localizar_ou_criar_cliente(dto)
        carro = await self._localizar_ou_criar_carro(cliente, dto)

        try:
            prioridade = PrioridadeOS((dto.prioridade or "MEDIA").upper())
        except ValueError:
            prioridade = PrioridadeOS.MEDIA

        observacoes = None
        if dto.servicos_sugeridos:
            observacoes = "Serviços sugeridos: " + "; ".join(dto.servicos_sugeridos)

        nova_os = OrdemServico(
            id=uuid.uuid4(),
            numero_os=await self.os_repo.obter_proximo_numero_os(),
            cliente_id=cliente.id,
            carro_id=carro.id,
            usuario_id=usuario.id,
            status=StatusOS.TRIAGEM,
            origem=OrigemOS.TELEGRAM_VOICE,
            prioridade=prioridade,
            sintomas=dto.sintomas_relatados,
            hipotese_diagnostica=dto.hipotese_diagnostica,
            checklist_eletrico=dto.checklist_eletrico,
            observacoes=observacoes,
        )
        await self.os_repo.salvar(nova_os)

        await self.audit_repo.registrar(novo_log(
            usuario.id, "TELEGRAM_VOICE_BOT", "OS_CRIADA_POR_VOZ",
            detalhes={
                "os_id": str(nova_os.id),
                "numero_os": nova_os.numero_os,
                "cliente": cliente.nome,
                "carro": carro.formatar_descricao(),
                "telegram_user_id": dto.telegram_user_id
            }
        ))
        return OrdemServicoOutputDTO.de(nova_os, cliente.nome, carro.formatar_descricao())

    async def _localizar_ou_criar_cliente(self, dto: CriarOSVozInputDTO) -> Cliente:
        nome = (dto.nome_cliente or "").strip()
        if not nome:
            raise RegraNegocioException("O nome do cliente é obrigatório.")
        for cliente in await self.cliente_repo.buscar_por_termo(nome):
            if cliente.nome.lower() == nome.lower():
                return cliente
        cliente = Cliente(id=uuid.uuid4(), nome=nome, telefone=dto.telefone_cliente)
        await self.cliente_repo.salvar(cliente)
        return cliente

    async def _localizar_ou_criar_carro(self, cliente: Cliente, dto: CriarOSVozInputDTO) -> Carro:
        placa = (dto.carro_placa or "").strip().upper().replace("-", "")
        for carro in cliente.carros:
            if (placa and carro.placa == placa) or carro.modelo.lower() == dto.carro_modelo.strip().lower():
                return carro
        carro = Carro(
            id=uuid.uuid4(),
            cliente_id=cliente.id,
            modelo=dto.carro_modelo,
            marca=dto.carro_marca or "Não informada",
            placa=dto.carro_placa,
            ano=dto.carro_ano
        )
        cliente.adicionar_carro(carro)
        await self.cliente_repo.salvar(cliente)
        return carro
