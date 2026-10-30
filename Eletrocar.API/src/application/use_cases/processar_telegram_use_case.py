"""
Caso de Uso: ProcessarMensagemTelegramUseCase (Pipeline de Voz -> OS - Diagrama de Sequência 07)
1. Whitelist do colaborador ANTES de baixar/transcrever (não consome ASR/LLM com intrusos)
2. Download do áudio (.oga/.ogg) pela Bot API
3. Transcrição PT-BR (Whisper ASR) e calibração do vocabulário de auto elétrica
4. Extração estruturada (LLM + JSON Schema rígido)
5. Abertura da OS e resposta com card + botões inline [Confirmar] [Editar] [Ver no Sistema]
"""
import uuid
from src.domain.gateways.interfaces import (
    TelegramBotGateway,
    TranscricaoAudioGateway,
    ExtratorDadosOSGateway,
    BotaoInline,
)
from src.domain.services.normalizador_termos_eletricos_service import NormalizadorTermosEletricosService
from src.domain.value_objects.enums import StatusOS
from src.domain.repositories.interfaces import UsuarioRepositoryInterface
from src.domain.exceptions.domain_exceptions import (
    AcessoNegadoException,
    DomainException,
    IntegracaoExternaException,
    RegraNegocioException,
)
from src.application.use_cases.criar_os_voz_use_case import CriarOSPorVozTelegramUseCase, obter_colaborador_autorizado
from src.application.use_cases.gerenciar_os_use_case import GerenciarOrdemServicoUseCase
from src.application.dtos.os_dtos import CriarOSVozInputDTO, AtualizarStatusOSInputDTO, OrdemServicoOutputDTO
from src.application.dtos.telegram_dtos import AudioTelegramInputDTO, CallbackTelegramInputDTO, ResultadoTelegramDTO

MENSAGEM_NAO_AUTORIZADO = "⛔ Usuário não autorizado a abrir Ordens de Serviço pelo bot da Eletrocar."


class ProcessarMensagemTelegramUseCase:
    def __init__(
        self,
        usuario_repo: UsuarioRepositoryInterface,
        telegram: TelegramBotGateway,
        transcricao: TranscricaoAudioGateway,
        extrator: ExtratorDadosOSGateway,
        criar_os_use_case: CriarOSPorVozTelegramUseCase,
        gerenciar_os_use_case: GerenciarOrdemServicoUseCase,
        url_painel: str,
    ):
        self.usuario_repo = usuario_repo
        self.telegram = telegram
        self.transcricao = transcricao
        self.extrator = extrator
        self.criar_os_use_case = criar_os_use_case
        self.gerenciar_os_use_case = gerenciar_os_use_case
        self.url_painel = url_painel.rstrip("/")

    async def processar_audio(self, dto: AudioTelegramInputDTO) -> OrdemServicoOutputDTO:
        await self._autorizar(dto.telegram_user_id, dto.chat_id)

        try:
            audio = await self.telegram.baixar_arquivo(dto.file_id)
            texto = NormalizadorTermosEletricosService.normalizar(
                await self.transcricao.transcrever(audio, dto.nome_arquivo)
            )
            dados = await self.extrator.extrair(texto)
        except RegraNegocioException as exc:
            await self.telegram.enviar_mensagem(
                dto.chat_id, f"⚠️ Não consegui abrir a OS: {exc.mensagem}\nGrave um novo áudio informando cliente, carro e defeito."
            )
            raise
        except IntegracaoExternaException as exc:
            await self._avisar_falha(dto.chat_id, exc.mensagem)
            raise

        os = await self.criar_os_use_case.executar(CriarOSVozInputDTO(
            telegram_user_id=dto.telegram_user_id,
            nome_cliente=dados.nome_cliente,
            carro_modelo=dados.carro_modelo,
            carro_marca=dados.carro_marca,
            carro_placa=dados.carro_placa,
            carro_ano=dados.carro_ano,
            telefone_cliente=dados.telefone_cliente,
            sintomas_relatados=dados.sintomas_relatados,
            hipotese_diagnostica=dados.hipotese_diagnostica,
            checklist_eletrico=dados.checklist_eletrico,
            servicos_sugeridos=list(dados.servicos_sugeridos),
            prioridade=dados.prioridade.value,
        ))
        await self.telegram.enviar_mensagem(dto.chat_id, self._card(os, texto), self._botoes(os))
        return os

    async def processar_callback(self, dto: CallbackTelegramInputDTO) -> ResultadoTelegramDTO:
        usuario = await self._autorizar(dto.telegram_user_id, dto.chat_id)
        acao, _, os_id_texto = (dto.dados or "").partition(":")
        try:
            os_id = uuid.UUID(os_id_texto)
        except ValueError:
            await self.telegram.responder_callback(dto.callback_query_id, "Ação inválida.")
            return ResultadoTelegramDTO(ok=False, mensagem="Ação inválida.")

        if acao == "confirmar":
            try:
                os = await self.gerenciar_os_use_case.atualizar_status(AtualizarStatusOSInputDTO(
                    os_id=os_id, novo_status=StatusOS.ORCAMENTO_PENDENTE.value, usuario_id=usuario.id
                ))
                mensagem = f"✅ OS {os.numero_os} confirmada e enviada para orçamento."
            except DomainException as exc:
                mensagem = f"⚠️ {exc.mensagem}"
        elif acao == "editar":
            mensagem = "✏️ Grave um novo áudio com a correção ou ajuste os dados pelo balcão."
        else:
            mensagem = "Ação não reconhecida."

        await self.telegram.responder_callback(dto.callback_query_id, mensagem)
        return ResultadoTelegramDTO(ok=True, mensagem=mensagem, os_id=str(os_id))

    async def _avisar_falha(self, chat_id: int, motivo: str):
        try:
            await self.telegram.enviar_mensagem(chat_id, f"⚠️ Falha ao processar o áudio ({motivo}). Tente novamente em instantes.")
        except IntegracaoExternaException:
            pass  # O Telegram também está indisponível: o erro original é propagado

    async def _autorizar(self, telegram_user_id: str, chat_id: int):
        try:
            return await obter_colaborador_autorizado(self.usuario_repo, telegram_user_id)
        except AcessoNegadoException:
            await self.telegram.enviar_mensagem(chat_id, MENSAGEM_NAO_AUTORIZADO)
            raise

    @staticmethod
    def _card(os: OrdemServicoOutputDTO, transcricao: str) -> str:
        linhas = [
            f"🛠️ Nova OS aberta: {os.numero_os}",
            f"👤 Cliente: {os.nome_cliente}",
            f"🚗 Veículo: {os.descricao_carro}",
            f"⚡ Sintomas: {os.sintomas}",
        ]
        if os.hipotese_diagnostica:
            linhas.append(f"🔎 Hipótese: {os.hipotese_diagnostica}")
        linhas.append(f"🚦 Prioridade: {os.prioridade}")
        linhas.append(f"🎙️ Transcrição: \"{transcricao}\"")
        return "\n".join(linhas)

    def _botoes(self, os: OrdemServicoOutputDTO):
        return [
            BotaoInline(texto="✅ Confirmar", callback_data=f"confirmar:{os.id}"),
            BotaoInline(texto="✏️ Editar", callback_data=f"editar:{os.id}"),
            BotaoInline(texto="📋 Ver no Sistema", url=f"{self.url_painel}/ordens-servico/{os.id}"),
        ]
