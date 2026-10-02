"""
Caso de Uso: CriarOSPorVozTelegramUseCase
Pipeline de integração do Telegram Bot:
1. Valida se o emissor do áudio é um eletricista/colaborador autorizado (Whitelist)
2. Localiza ou cadastra automaticamente o Cliente e o Carro
3. Abre a Ordem de Serviço com status inicial 'TRIAGEM' e origem 'TELEGRAM_VOICE'
4. Grava auditoria e prepara o retorno para o bot responder com card interativo
"""
import uuid
from decimal import Decimal
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.auditoria import LogAuditoria
from src.domain.value_objects.enums import StatusOS, OrigemOS
from src.domain.repositories.interfaces import (
    UsuarioRepositoryInterface,
    ClienteRepositoryInterface,
    OrdemServicoRepositoryInterface,
    AuditoriaRepositoryInterface
)
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.application.dtos.os_dtos import CriarOSVozInputDTO, OrdemServicoOutputDTO


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

    async def executar(self, input_dto: CriarOSVozInputDTO) -> OrdemServicoOutputDTO:
        # 1. Validação de Whitelist do Telegram
        usuario = await self.usuario_repo.buscar_por_telegram_id(input_dto.telegram_user_id)
        if not usuario or not usuario.ativo:
            raise RegraNegocioException(
                f"Usuário do Telegram '{input_dto.telegram_user_id}' não autorizado a abrir Ordens de Serviço."
            )

        # 2. Localização ou Criação Ágil de Cliente
        clientes_encontrados = await self.cliente_repo.buscar_por_termo(input_dto.nome_cliente)
        cliente_alvo = None
        for c in clientes_encontrados:
            if c.nome.lower() == input_dto.nome_cliente.lower():
                cliente_alvo = c
                break

        if not cliente_alvo:
            cliente_alvo = Cliente(
                id=uuid.uuid4(),
                nome=input_dto.nome_cliente,
                telefone=input_dto.telefone_cliente
            )
            await self.cliente_repo.salvar(cliente_alvo)

        # 3. Localização ou Criação do Carro
        carro_alvo = None
        for c in cliente_alvo.carros:
            if c.modelo.lower() == input_dto.carro_modelo.lower():
                carro_alvo = c
                break

        if not carro_alvo:
            carro_alvo = Carro(
                id=uuid.uuid4(),
                cliente_id=cliente_alvo.id,
                modelo=input_dto.carro_modelo,
                marca=input_dto.carro_marca or "Geral",
                placa=input_dto.carro_placa,
                ano=input_dto.carro_ano
            )
            cliente_alvo.adicionar_carro(carro_alvo)
            await self.cliente_repo.salvar(cliente_alvo)

        # 4. Geração do número sequencial e abertura da OS em TRIAGEM
        numero_os = await self.os_repo.obter_proximo_numero_os()
        nova_os = OrdemServico(
            id=uuid.uuid4(),
            numero_os=numero_os,
            cliente_id=cliente_alvo.id,
            carro_id=carro_alvo.id,
            usuario_id=usuario.id,
            status=StatusOS.TRIAGEM,
            origem=OrigemOS.TELEGRAM_VOICE,
            sintomas=input_dto.sintomas_relatados,
            hipotese_diagnostica=input_dto.hipotese_diagnostica,
            checklist_eletrico=input_dto.checklist_eletrico
        )

        os_salva = await self.os_repo.salvar(nova_os)

        # 5. Registro imutável de auditoria
        await self.audit_repo.registrar(
            LogAuditoria(
                id=uuid.uuid4(),
                usuario_id=usuario.id,
                origem="TELEGRAM_VOICE_BOT",
                acao="OS_CRIADA_POR_VOZ",
                detalhes={
                    "os_id": str(os_salva.id),
                    "numero_os": os_salva.numero_os,
                    "cliente": cliente_alvo.nome,
                    "carro": carro_alvo.formatar_descricao(),
                    "telegram_user_id": input_dto.telegram_user_id
                }
            )
        )

        return OrdemServicoOutputDTO(
            id=os_salva.id,
            numero_os=os_salva.numero_os,
            cliente_id=os_salva.cliente_id,
            nome_cliente=cliente_alvo.nome,
            carro_id=os_salva.carro_id,
            descricao_carro=carro_alvo.formatar_descricao(),
            usuario_id=os_salva.usuario_id,
            status=os_salva.status.value,
            origem=os_salva.origem.value,
            sintomas=os_salva.sintomas,
            hipotese_diagnostica=os_salva.hipotese_diagnostica,
            checklist_eletrico=os_salva.checklist_eletrico,
            itens=[],
            servicos=[],
            valor_pecas=os_salva.valor_pecas,
            valor_servicos=os_salva.valor_servicos,
            desconto=os_salva.desconto,
            valor_total=os_salva.valor_total,
            created_at=os_salva.created_at,
            updated_at=os_salva.updated_at,
            sucesso=True
        )
