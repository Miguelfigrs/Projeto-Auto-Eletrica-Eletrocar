"""
Testes unitários: Usuario com RBAC multi-papel (tabela N:N USUARIOS_PAPEIS).
O dono da oficina pode acumular os papéis de Administrador, Balconista e Eletricista.
"""
import pytest
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.domain.value_objects.pin_operador import PinOperador
from src.domain.exceptions.domain_exceptions import RegraNegocioException


def _usuario(**kwargs) -> Usuario:
    dados = dict(
        id=uuid.uuid4(),
        nome="Dono da Oficina",
        email="Dono@Eletrocar.com.br",
        senha_hash="hash",
        papeis={Papel.ADMIN},
    )
    dados.update(kwargs)
    return Usuario(**dados)


def test_usuario_dono_acumula_multiplos_papeis():
    dono = _usuario(papeis={Papel.ADMIN, Papel.BALCONISTA, Papel.ELETRICISTA})

    assert dono.possui_papel(Papel.ADMIN)
    assert dono.possui_papel(Papel.BALCONISTA)
    assert dono.possui_papel(Papel.ELETRICISTA)
    assert dono.eh_admin()
    assert dono.pode_operar_balcao()
    assert dono.pode_executar_servico()


def test_balconista_que_tambem_e_eletricista_nao_e_admin():
    usuario = _usuario(papeis=[Papel.BALCONISTA, Papel.ELETRICISTA])

    assert not usuario.eh_admin()
    assert usuario.pode_operar_balcao()
    assert usuario.pode_executar_servico()
    assert usuario.possui_algum_papel(Papel.ELETRICISTA)
    assert not usuario.possui_algum_papel(Papel.ADMIN)


def test_admin_possui_acesso_a_qualquer_papel_operacional():
    admin = _usuario(papeis={Papel.ADMIN})
    assert admin.possui_algum_papel(Papel.BALCONISTA)
    assert admin.possui_algum_papel(Papel.ELETRICISTA)


def test_usuario_sem_papel_e_invalido():
    with pytest.raises(RegraNegocioException):
        _usuario(papeis=set())


def test_nao_permite_remover_o_ultimo_papel():
    usuario = _usuario(papeis={Papel.BALCONISTA})
    usuario.adicionar_papel(Papel.ELETRICISTA)
    usuario.remover_papel(Papel.BALCONISTA)
    assert usuario.papeis == {Papel.ELETRICISTA}

    with pytest.raises(RegraNegocioException):
        usuario.remover_papel(Papel.ELETRICISTA)


def test_email_e_username_normalizados():
    usuario = _usuario(username="  Marcio.Eletro ")
    assert usuario.email == "dono@eletrocar.com.br"
    assert usuario.username == "marcio.eletro"


def test_username_nao_pode_conter_arroba():
    with pytest.raises(RegraNegocioException):
        _usuario(username="marcio@eletrocar")


def test_pin_operador_aceita_apenas_4_a_6_digitos():
    assert PinOperador("1234").valor == "1234"
    assert PinOperador("123456").valor == "123456"
    for invalido in ["123", "1234567", "12a4", "", "    "]:
        with pytest.raises(RegraNegocioException):
            PinOperador(invalido)
