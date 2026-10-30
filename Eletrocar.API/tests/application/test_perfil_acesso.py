"""
Testes: redirecionamento automático por perfil após o login (Módulo 0 da especificação).
Admin -> Dashboard financeiro; Balconista -> Balcão/PDV; Eletricista -> fila de OS.
"""
import uuid
import pytest
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.application.dtos.auth_dtos import UsuarioOutputDTO, LoginInputDTO
from src.application.services.perfil_acesso import definir_perfil_acesso
from src.application.use_cases.autenticar_usuario_use_case import AutenticarUsuarioUseCase
from src.application.use_cases.gerenciar_sessao_use_case import GerenciarSessaoUseCase
from tests.fakes.fake_repositories import FakeUsuarioRepository, FakeSessaoRepository, FakeAuditoriaRepository
from tests.fakes.fake_servicos import FakePasswordHasher, FakeLimitadorTentativas, FakeTokenService


def _usuario(*papeis: Papel) -> Usuario:
    return Usuario(id=uuid.uuid4(), nome="Teste", email=f"{uuid.uuid4().hex[:6]}@eletrocar.com.br",
                   senha_hash=FakePasswordHasher().hash("senha123"), papeis=set(papeis))


def test_tela_inicial_por_perfil():
    assert definir_perfil_acesso({Papel.ADMIN}).tela_inicial == "DASHBOARD_FINANCEIRO"
    assert definir_perfil_acesso({Papel.BALCONISTA}).tela_inicial == "BALCAO_PDV"
    assert definir_perfil_acesso({Papel.ELETRICISTA}).tela_inicial == "FILA_OS"
    # Acúmulo de papéis: prevalece o perfil de maior abrangência
    assert definir_perfil_acesso({Papel.BALCONISTA, Papel.ELETRICISTA}).tela_inicial == "BALCAO_PDV"
    assert definir_perfil_acesso({Papel.ADMIN, Papel.ELETRICISTA}).tela_inicial == "DASHBOARD_FINANCEIRO"


def test_modulos_permitidos_seguem_a_matriz_rbac():
    eletricista = definir_perfil_acesso({Papel.ELETRICISTA}).modulos
    assert "FILA_OS" in eletricista and "BALCAO_PDV" not in eletricista and "FINANCEIRO" not in eletricista

    balconista = definir_perfil_acesso({Papel.BALCONISTA}).modulos
    assert {"BALCAO_PDV", "CAIXA", "ORDENS_SERVICO"} <= set(balconista)
    assert "USUARIOS" not in balconista and "AUDITORIA" not in balconista

    multi = definir_perfil_acesso({Papel.BALCONISTA, Papel.ELETRICISTA}).modulos
    assert {"BALCAO_PDV", "FILA_OS"} <= set(multi)

    admin = definir_perfil_acesso({Papel.ADMIN}).modulos
    assert {"DASHBOARD_FINANCEIRO", "USUARIOS", "AUDITORIA", "FINANCEIRO", "BALCAO_PDV", "FILA_OS"} <= set(admin)
    assert len(admin) == len(set(admin))


def test_dto_do_usuario_traz_tela_inicial_e_modulos():
    dto = UsuarioOutputDTO.de(_usuario(Papel.ELETRICISTA))
    assert dto.tela_inicial == "FILA_OS"
    assert "FILA_OS" in dto.modulos


@pytest.mark.asyncio
async def test_sessao_informa_validade_do_access_token():
    repo = FakeUsuarioRepository()
    usuario = _usuario(Papel.BALCONISTA)
    await repo.salvar(usuario)
    tokens = await GerenciarSessaoUseCase(repo, FakeSessaoRepository(), FakeTokenService(),
                                          validade_access_minutos=30).iniciar(usuario.id)
    assert tokens.expira_em_segundos == 1800
    assert tokens.usuario.tela_inicial == "BALCAO_PDV"


@pytest.mark.asyncio
async def test_login_e_troca_de_operador_sao_auditados():
    repo, audit = FakeUsuarioRepository(), FakeAuditoriaRepository()
    hasher = FakePasswordHasher()
    usuario = _usuario(Papel.BALCONISTA)
    usuario.username = "carlos"
    usuario.pin_hash = hasher.hash("1122")
    await repo.salvar(usuario)
    uc = AutenticarUsuarioUseCase(repo, hasher, FakeLimitadorTentativas(), audit_repo=audit)

    await uc.login(LoginInputDTO(identificador="carlos", senha="senha123"))
    from src.application.dtos.auth_dtos import TrocaOperadorPinInputDTO
    await uc.trocar_operador_por_pin(TrocaOperadorPinInputDTO(usuario_id=usuario.id, pin="1122"))

    assert audit.acoes() == ["LOGIN_REALIZADO", "OPERADOR_TROCADO_POR_PIN"]
    assert audit.logs[0].usuario_id == usuario.id
    assert "senha123" not in str(audit.logs[0])
