"""
Testes unitários de Value Objects do Domínio (TDD).
Zero dependências externas.
"""
import pytest
from decimal import Decimal
from src.domain.value_objects.dinheiro import Dinheiro
from src.domain.value_objects.codigo_barras import CodigoBarras
from src.domain.value_objects.cpf_cnpj import CpfCnpj
from src.domain.value_objects.enums import Role, StatusOS, FormaPagamento
from src.domain.exceptions.domain_exceptions import RegraNegocioException


def test_dinheiro_criacao_e_operacoes():
    d1 = Dinheiro(Decimal("100.50"))
    d2 = Dinheiro("50.25")
    
    soma = d1 + d2
    assert soma.valor == Decimal("150.75")
    
    sub = d1 - d2
    assert sub.valor == Decimal("50.25")
    
    mult = d2 * 2
    assert mult.valor == Decimal("100.50")
    
    assert d1.formatar() == "R$ 100,50"


def test_dinheiro_nao_permite_valor_negativo_se_configurado():
    with pytest.raises(RegraNegocioException):
        Dinheiro("-10.00", permitir_negativo=False)


def test_codigo_barras_valido_ean13():
    # Código EAN-13 válido (7891049281023)
    cb = CodigoBarras("7891049281023")
    assert cb.valor == "7891049281023"
    assert cb.tipo == "EAN13"


def test_codigo_barras_sku_alfanumerico():
    cb = CodigoBarras("BOSCH-REG-12V")
    assert cb.valor == "BOSCH-REG-12V"
    assert cb.tipo == "SKU"


def test_codigo_barras_vazio_lanca_excecao():
    with pytest.raises(RegraNegocioException):
        CodigoBarras("   ")


def test_cpf_cnpj_valido_cpf():
    # CPF válido formatado ou numérico
    cpf = CpfCnpj("52998224725")
    assert cpf.tipo == "CPF"
    assert cpf.formatado() == "529.982.247-25"


def test_cpf_cnpj_valido_cnpj():
    # CNPJ válido de teste
    cnpj = CpfCnpj("11.222.333/0001-81")
    assert cnpj.tipo == "CNPJ"
    assert len(cnpj.somente_digitos()) == 14


def test_cpf_cnpj_invalido_lanca_excecao():
    with pytest.raises(RegraNegocioException):
        CpfCnpj("12345678900")  # Dígitos verificadores inválidos


def test_cpf_cnpj_nulo_ou_vazio_quando_opcional():
    doc = CpfCnpj(None)
    assert doc.valor is None
    assert doc.eh_valido() is True
