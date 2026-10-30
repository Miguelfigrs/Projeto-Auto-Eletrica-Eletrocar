"""
Testes dos Use Cases do Telegram Voice Bot (TDD).
Pipeline: whitelist -> download do áudio -> Whisper ASR -> normalização de termos -> LLM (JSON) -> OS -> card.
"""
import pytest
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel, StatusOS, OrigemOS
from src.domain.exceptions.domain_exceptions import AcessoNegadoException, RegraNegocioException
from src.application.dtos.os_dtos import CriarOSVozInputDTO
from src.application.dtos.telegram_dtos import AudioTelegramInputDTO, CallbackTelegramInputDTO
from src.application.use_cases.criar_os_voz_use_case import CriarOSPorVozTelegramUseCase
from src.application.use_cases.gerenciar_os_use_case import GerenciarOrdemServicoUseCase
from src.application.use_cases.processar_telegram_use_case import ProcessarMensagemTelegramUseCase
from tests.fakes.fake_repositories import (
    FakeUsuarioRepository,
    FakeClienteRepository,
    FakeOrdemServicoRepository,
    FakePecaRepository,
    FakeAuditoriaRepository
)
from tests.fakes.fake_servicos import FakeTranscricaoGateway, FakeExtratorGateway, FakeTelegramGateway


class Ambiente:
    def __init__(self):
        self.usuarios = FakeUsuarioRepository()
        self.clientes = FakeClienteRepository()
        self.ordens = FakeOrdemServicoRepository()
        self.pecas = FakePecaRepository()
        self.auditoria = FakeAuditoriaRepository()
        self.telegram = FakeTelegramGateway()
        self.asr = FakeTranscricaoGateway()
        self.extrator = FakeExtratorGateway()

    async def usuario(self, telegram_id: str, *papeis: Papel, ativo: bool = True) -> Usuario:
        usuario = Usuario(
            id=uuid.uuid4(), nome="Marcio Eletricista", email=f"{telegram_id}@eletrocar.com.br",
            senha_hash="x", papeis=set(papeis), telegram_user_id=telegram_id, ativo=ativo
        )
        await self.usuarios.salvar(usuario)
        return usuario

    @property
    def criar_os(self) -> CriarOSPorVozTelegramUseCase:
        return CriarOSPorVozTelegramUseCase(self.usuarios, self.clientes, self.ordens, self.auditoria)

    @property
    def processar(self) -> ProcessarMensagemTelegramUseCase:
        return ProcessarMensagemTelegramUseCase(
            usuario_repo=self.usuarios,
            telegram=self.telegram,
            transcricao=self.asr,
            extrator=self.extrator,
            criar_os_use_case=self.criar_os,
            gerenciar_os_use_case=GerenciarOrdemServicoUseCase(self.ordens, self.clientes, self.pecas, self.auditoria),
            url_painel="https://eletrocar.local",
        )


@pytest.fixture
def amb() -> Ambiente:
    return Ambiente()


def _dto(telegram_id="987654321") -> CriarOSVozInputDTO:
    return CriarOSVozInputDTO(
        telegram_user_id=telegram_id,
        nome_cliente="Carlos Silva",
        carro_modelo="Gol 1.6",
        carro_marca="Volkswagen",
        carro_placa="ABC1D23",
        sintomas_relatados="Bateria descarregando e luz da bateria acesa no painel",
        hipotese_diagnostica="Falha de geração no alternador",
        checklist_eletrico={"alternador": "falha na geracao"},
        servicos_sugeridos=["Diagnóstico de alternador"],
        prioridade="ALTA",
    )


@pytest.mark.asyncio
async def test_criar_os_por_voz_telegram_com_sucesso(amb: Ambiente):
    await amb.usuario("987654321", Papel.ELETRICISTA)

    os_criada = await amb.criar_os.executar(_dto())

    assert os_criada.status == StatusOS.TRIAGEM.value
    assert os_criada.origem == OrigemOS.TELEGRAM_VOICE.value
    assert os_criada.prioridade == "ALTA"
    clientes = await amb.clientes.buscar_por_termo("Carlos")
    assert len(clientes) == 1 and clientes[0].carros[0].modelo == "Gol 1.6"

    # Segunda OS do mesmo cliente/carro reaproveita o cadastro
    await amb.criar_os.executar(_dto())
    assert len(await amb.clientes.buscar_por_termo("Carlos")) == 1


@pytest.mark.asyncio
async def test_criar_os_por_voz_telegram_usuario_nao_autorizado_rejeita(amb: Ambiente):
    with pytest.raises(AcessoNegadoException):
        await amb.criar_os.executar(_dto("usuario_desconhecido_999"))


@pytest.mark.asyncio
async def test_balconista_sem_papel_de_eletricista_nao_abre_os_por_voz(amb: Ambiente):
    await amb.usuario("555", Papel.BALCONISTA)
    with pytest.raises(AcessoNegadoException):
        await amb.criar_os.executar(_dto("555"))


@pytest.mark.asyncio
async def test_voice_os_creation_pipeline(amb: Ambiente):
    await amb.usuario("987654321", Papel.ELETRICISTA)

    os_criada = await amb.processar.processar_audio(AudioTelegramInputDTO(
        telegram_user_id="987654321", chat_id=42, file_id="voice-file-1"
    ))

    assert amb.telegram.downloads == ["voice-file-1"]
    assert amb.asr.chamadas[0][0] == b"OggS-audio-fake"
    # Termos técnicos corrigidos antes da extração pela IA
    assert "alternador" in amb.extrator.textos_recebidos[0]
    assert os_criada.origem == "TELEGRAM_VOICE"
    chat_id, texto, botoes = amb.telegram.mensagens[-1]
    assert chat_id == 42
    assert os_criada.numero_os in texto
    assert [b.texto for b in botoes] == ["✅ Confirmar", "✏️ Editar", "📋 Ver no Sistema"]
    assert botoes[0].callback_data == f"confirmar:{os_criada.id}"
    assert botoes[2].url.endswith(f"/ordens-servico/{os_criada.id}")


@pytest.mark.asyncio
async def test_audio_de_usuario_fora_da_whitelist_nao_e_baixado_nem_transcrito(amb: Ambiente):
    with pytest.raises(AcessoNegadoException):
        await amb.processar.processar_audio(AudioTelegramInputDTO(
            telegram_user_id="intruso", chat_id=7, file_id="voice-x"
        ))
    assert amb.telegram.downloads == []
    assert amb.asr.chamadas == []
    assert "não autorizado" in amb.telegram.mensagens[-1][1].lower()


@pytest.mark.asyncio
async def test_audio_sem_dados_suficientes_pede_novo_audio(amb: Ambiente):
    await amb.usuario("987654321", Papel.ELETRICISTA)

    class ExtratorIncompleto(FakeExtratorGateway):
        async def extrair(self, transcricao):
            raise RegraNegocioException("O áudio não identificou o modelo do carro.")

    amb.extrator = ExtratorIncompleto()
    with pytest.raises(RegraNegocioException):
        await amb.processar.processar_audio(AudioTelegramInputDTO(
            telegram_user_id="987654321", chat_id=42, file_id="voice-2"
        ))
    assert "modelo do carro" in amb.telegram.mensagens[-1][1]
    assert amb.ordens.ordens == {}


@pytest.mark.asyncio
async def test_botao_confirmar_move_os_para_orcamento_pendente(amb: Ambiente):
    await amb.usuario("987654321", Papel.ELETRICISTA)
    os_criada = await amb.processar.processar_audio(AudioTelegramInputDTO(
        telegram_user_id="987654321", chat_id=42, file_id="voice-1"
    ))

    await amb.processar.processar_callback(CallbackTelegramInputDTO(
        telegram_user_id="987654321", chat_id=42, callback_query_id="cb-1",
        dados=f"confirmar:{os_criada.id}"
    ))

    assert (await amb.ordens.buscar_por_id(os_criada.id)).status == StatusOS.ORCAMENTO_PENDENTE
    assert amb.telegram.callbacks[-1][0] == "cb-1"


@pytest.mark.asyncio
async def test_callback_de_usuario_nao_autorizado_e_ignorado(amb: Ambiente):
    await amb.usuario("987654321", Papel.ELETRICISTA)
    os_criada = await amb.processar.processar_audio(AudioTelegramInputDTO(
        telegram_user_id="987654321", chat_id=42, file_id="voice-1"
    ))
    with pytest.raises(AcessoNegadoException):
        await amb.processar.processar_callback(CallbackTelegramInputDTO(
            telegram_user_id="intruso", chat_id=9, callback_query_id="cb-2", dados=f"confirmar:{os_criada.id}"
        ))
    assert (await amb.ordens.buscar_por_id(os_criada.id)).status == StatusOS.TRIAGEM


@pytest.mark.asyncio
async def test_falha_no_whisper_avisa_o_eletricista(amb: Ambiente):
    from src.domain.exceptions.domain_exceptions import IntegracaoExternaException
    await amb.usuario("987654321", Papel.ELETRICISTA)

    class WhisperForaDoAr(FakeTranscricaoGateway):
        async def transcrever(self, audio, nome_arquivo):
            raise IntegracaoExternaException("Falha ao transcrever o áudio (Whisper).")

    amb.asr = WhisperForaDoAr()
    with pytest.raises(IntegracaoExternaException):
        await amb.processar.processar_audio(AudioTelegramInputDTO(telegram_user_id="987654321", chat_id=42, file_id="v"))
    assert "Falha ao processar o áudio" in amb.telegram.mensagens[-1][1]
    assert amb.ordens.ordens == {}
