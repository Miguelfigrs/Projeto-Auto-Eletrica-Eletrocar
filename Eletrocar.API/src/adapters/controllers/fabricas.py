"""
Composition Root: monta os casos de uso com os repositórios SQLAlchemy da transação da requisição
e os gateways externos. Os provedores de gateway podem ser substituídos via dependency_overrides.
"""
from functools import lru_cache
import anthropic
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.infra.config import settings
from src.infra.database.session import get_db_session
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy, SessaoRepositorySQLAlchemy
from src.adapters.repositories.cliente_repository_sqlalchemy import ClienteRepositorySQLAlchemy
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy
from src.adapters.repositories.ordem_servico_repository_sqlalchemy import OrdemServicoRepositorySQLAlchemy
from src.adapters.repositories.venda_balcao_repository_sqlalchemy import VendaBalcaoRepositorySQLAlchemy
from src.adapters.repositories.caixa_repository_sqlalchemy import CaixaRepositorySQLAlchemy
from src.adapters.repositories.financeiro_repository_sqlalchemy import (
    TituloFinanceiroRepositorySQLAlchemy, CobrancaPixRepositorySQLAlchemy
)
from src.adapters.repositories.auditoria_repository_sqlalchemy import AuditoriaRepositorySQLAlchemy
from src.adapters.gateways.telegram_gateway import TelegramBotHttpGateway, TelegramConsoleGateway
from src.adapters.gateways.whisper_gateway import WhisperTranscricaoGateway
from src.adapters.gateways.extrator_os_claude_gateway import ClaudeExtratorDadosOSGateway
from src.adapters.gateways.pix_brcode_gateway import PixBrCodeGateway
from src.adapters.controllers.dependencies import get_password_hasher, get_limitador, get_token_service
from src.domain.gateways.interfaces import TelegramBotGateway, TranscricaoAudioGateway, ExtratorDadosOSGateway, PixGateway
from src.application.services.validador_alcada import ValidadorAlcadaGerencial
from src.application.use_cases.autenticar_usuario_use_case import AutenticarUsuarioUseCase
from src.application.use_cases.gerenciar_sessao_use_case import GerenciarSessaoUseCase
from src.application.use_cases.gerenciar_usuarios_use_case import GerenciarUsuariosUseCase
from src.application.use_cases.gerenciar_clientes_use_case import GerenciarClientesUseCase
from src.application.use_cases.gerenciar_pecas_use_case import GerenciarPecasUseCase
from src.application.use_cases.buscar_peca_barcode_use_case import BuscarPecaPorCodigoBarrasUseCase
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from src.application.use_cases.cancelar_venda_use_case import CancelarVendaUseCase
from src.application.use_cases.consultar_vendas_use_case import ConsultarVendasUseCase
from src.application.use_cases.gerenciar_os_use_case import GerenciarOrdemServicoUseCase
from src.application.use_cases.faturar_os_use_case import FaturarOrdemServicoUseCase
from src.application.use_cases.aplicar_desconto_os_use_case import AplicarDescontoOSUseCase
from src.application.use_cases.criar_os_voz_use_case import CriarOSPorVozTelegramUseCase
from src.application.use_cases.processar_telegram_use_case import ProcessarMensagemTelegramUseCase
from src.application.use_cases.operar_caixa_use_case import OperarCaixaUseCase
from src.application.use_cases.gerar_dre_use_case import GerarRelatorioDREUseCase
from src.application.use_cases.gerenciar_titulos_use_case import GerenciarTitulosUseCase
from src.application.use_cases.pagamento_pix_use_case import PagamentoPixUseCase
from src.application.use_cases.emitir_comprovante_use_case import EmitirComprovanteUseCase
from src.application.use_cases.consultar_auditoria_use_case import ConsultarAuditoriaUseCase


# ---- Gateways externos (substituíveis nos testes) ----------------------------------------------

def get_telegram_gateway() -> TelegramBotGateway:
    if not settings.TELEGRAM_BOT_TOKEN and not settings.eh_producao:
        return TelegramConsoleGateway()  # desenvolvimento sem bot: mensagens vão para o log
    return TelegramBotHttpGateway(settings.TELEGRAM_BOT_TOKEN)


def get_transcricao_gateway() -> TranscricaoAudioGateway:
    return WhisperTranscricaoGateway(settings.WHISPER_API_URL, settings.WHISPER_API_KEY, settings.WHISPER_MODELO)


@lru_cache
def _cliente_anthropic() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY or None, timeout=20.0, max_retries=1)


def get_extrator_gateway() -> ExtratorDadosOSGateway:
    return ClaudeExtratorDadosOSGateway(_cliente_anthropic(), settings.LLM_MODELO, settings.LLM_ESFORCO)


def get_pix_gateway() -> PixGateway:
    return PixBrCodeGateway(settings.PIX_CHAVE, settings.PIX_NOME_RECEBEDOR, settings.PIX_CIDADE_RECEBEDOR)


# ---- Casos de uso --------------------------------------------------------------------------------

def _validador(session: AsyncSession) -> ValidadorAlcadaGerencial:
    return ValidadorAlcadaGerencial(UsuarioRepositorySQLAlchemy(session), get_password_hasher(), get_limitador())


def autenticar_uc(session: AsyncSession = Depends(get_db_session)) -> AutenticarUsuarioUseCase:
    return AutenticarUsuarioUseCase(UsuarioRepositorySQLAlchemy(session), get_password_hasher(), get_limitador(),
                                    audit_repo=AuditoriaRepositorySQLAlchemy(session))


def sessao_uc(session: AsyncSession = Depends(get_db_session)) -> GerenciarSessaoUseCase:
    return GerenciarSessaoUseCase(
        UsuarioRepositorySQLAlchemy(session), SessaoRepositorySQLAlchemy(session), get_token_service(),
        validade_refresh_dias=settings.REFRESH_TOKEN_EXPIRE_DAYS,
        validade_access_minutos=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )


def usuarios_uc(session: AsyncSession = Depends(get_db_session)) -> GerenciarUsuariosUseCase:
    return GerenciarUsuariosUseCase(UsuarioRepositorySQLAlchemy(session), get_password_hasher(),
                                    AuditoriaRepositorySQLAlchemy(session))


def clientes_uc(session: AsyncSession = Depends(get_db_session)) -> GerenciarClientesUseCase:
    return GerenciarClientesUseCase(ClienteRepositorySQLAlchemy(session))


def pecas_uc(session: AsyncSession = Depends(get_db_session)) -> GerenciarPecasUseCase:
    return GerenciarPecasUseCase(PecaRepositorySQLAlchemy(session), AuditoriaRepositorySQLAlchemy(session))


def barcode_uc(session: AsyncSession = Depends(get_db_session)) -> BuscarPecaPorCodigoBarrasUseCase:
    return BuscarPecaPorCodigoBarrasUseCase(PecaRepositorySQLAlchemy(session))


def venda_uc(session: AsyncSession = Depends(get_db_session)) -> RealizarVendaBalcaoUseCase:
    return RealizarVendaBalcaoUseCase(
        peca_repo=PecaRepositorySQLAlchemy(session),
        venda_repo=VendaBalcaoRepositorySQLAlchemy(session),
        caixa_repo=CaixaRepositorySQLAlchemy(session),
        audit_repo=AuditoriaRepositorySQLAlchemy(session),
        usuario_repo=UsuarioRepositorySQLAlchemy(session),
        titulo_repo=TituloFinanceiroRepositorySQLAlchemy(session),
        cobranca_repo=CobrancaPixRepositorySQLAlchemy(session),
        validador_alcada=_validador(session),
        limite_desconto_percentual=settings.LIMITE_DESCONTO_SEM_AUTORIZACAO_PERCENTUAL,
        prazo_faturado_dias=settings.PRAZO_FATURADO_DIAS,
    )


def cancelar_venda_uc(session: AsyncSession = Depends(get_db_session)) -> CancelarVendaUseCase:
    return CancelarVendaUseCase(
        VendaBalcaoRepositorySQLAlchemy(session), PecaRepositorySQLAlchemy(session), CaixaRepositorySQLAlchemy(session),
        TituloFinanceiroRepositorySQLAlchemy(session), AuditoriaRepositorySQLAlchemy(session)
    )


def consultar_vendas_uc(session: AsyncSession = Depends(get_db_session)) -> ConsultarVendasUseCase:
    return ConsultarVendasUseCase(VendaBalcaoRepositorySQLAlchemy(session))


def os_uc(session: AsyncSession = Depends(get_db_session)) -> GerenciarOrdemServicoUseCase:
    return GerenciarOrdemServicoUseCase(
        OrdemServicoRepositorySQLAlchemy(session), ClienteRepositorySQLAlchemy(session),
        PecaRepositorySQLAlchemy(session), AuditoriaRepositorySQLAlchemy(session)
    )


def faturar_os_uc(session: AsyncSession = Depends(get_db_session)) -> FaturarOrdemServicoUseCase:
    return FaturarOrdemServicoUseCase(
        OrdemServicoRepositorySQLAlchemy(session), ClienteRepositorySQLAlchemy(session),
        CaixaRepositorySQLAlchemy(session), TituloFinanceiroRepositorySQLAlchemy(session),
        CobrancaPixRepositorySQLAlchemy(session), AuditoriaRepositorySQLAlchemy(session),
        prazo_faturado_dias=settings.PRAZO_FATURADO_DIAS,
    )


def desconto_os_uc(session: AsyncSession = Depends(get_db_session)) -> AplicarDescontoOSUseCase:
    return AplicarDescontoOSUseCase(
        OrdemServicoRepositorySQLAlchemy(session), ClienteRepositorySQLAlchemy(session),
        UsuarioRepositorySQLAlchemy(session), _validador(session), AuditoriaRepositorySQLAlchemy(session),
        limite_desconto_percentual=settings.LIMITE_DESCONTO_SEM_AUTORIZACAO_PERCENTUAL,
    )


def telegram_uc(
    session: AsyncSession = Depends(get_db_session),
    telegram: TelegramBotGateway = Depends(get_telegram_gateway),
    transcricao: TranscricaoAudioGateway = Depends(get_transcricao_gateway),
    extrator: ExtratorDadosOSGateway = Depends(get_extrator_gateway),
) -> ProcessarMensagemTelegramUseCase:
    usuarios = UsuarioRepositorySQLAlchemy(session)
    clientes = ClienteRepositorySQLAlchemy(session)
    ordens = OrdemServicoRepositorySQLAlchemy(session)
    auditoria = AuditoriaRepositorySQLAlchemy(session)
    return ProcessarMensagemTelegramUseCase(
        usuario_repo=usuarios,
        telegram=telegram,
        transcricao=transcricao,
        extrator=extrator,
        criar_os_use_case=CriarOSPorVozTelegramUseCase(usuarios, clientes, ordens, auditoria),
        gerenciar_os_use_case=GerenciarOrdemServicoUseCase(ordens, clientes, PecaRepositorySQLAlchemy(session), auditoria),
        url_painel=settings.URL_PAINEL,
    )


def caixa_uc(session: AsyncSession = Depends(get_db_session)) -> OperarCaixaUseCase:
    return OperarCaixaUseCase(CaixaRepositorySQLAlchemy(session), AuditoriaRepositorySQLAlchemy(session))


def dre_uc(session: AsyncSession = Depends(get_db_session)) -> GerarRelatorioDREUseCase:
    return GerarRelatorioDREUseCase(
        VendaBalcaoRepositorySQLAlchemy(session), OrdemServicoRepositorySQLAlchemy(session),
        TituloFinanceiroRepositorySQLAlchemy(session)
    )


def titulos_uc(session: AsyncSession = Depends(get_db_session)) -> GerenciarTitulosUseCase:
    return GerenciarTitulosUseCase(
        TituloFinanceiroRepositorySQLAlchemy(session), CaixaRepositorySQLAlchemy(session),
        AuditoriaRepositorySQLAlchemy(session)
    )


def pix_uc(
    session: AsyncSession = Depends(get_db_session),
    gateway: PixGateway = Depends(get_pix_gateway),
) -> PagamentoPixUseCase:
    return PagamentoPixUseCase(
        CobrancaPixRepositorySQLAlchemy(session), gateway, AuditoriaRepositorySQLAlchemy(session),
        expiracao_minutos=settings.PIX_EXPIRACAO_MINUTOS
    )


def comprovante_uc(session: AsyncSession = Depends(get_db_session)) -> EmitirComprovanteUseCase:
    return EmitirComprovanteUseCase(
        VendaBalcaoRepositorySQLAlchemy(session), OrdemServicoRepositorySQLAlchemy(session),
        ClienteRepositorySQLAlchemy(session), nome_empresa=settings.NOME_EMPRESA_COMPROVANTE
    )


def auditoria_uc(session: AsyncSession = Depends(get_db_session)) -> ConsultarAuditoriaUseCase:
    return ConsultarAuditoriaUseCase(AuditoriaRepositorySQLAlchemy(session))
