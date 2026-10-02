"""
Teste do Use Case: BuscarPecaPorCodigoBarrasUseCase (TDD).
Simula captura de leitura de leitor USB / Bluetooth HID para PDV rápido.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.entities.peca import Peca
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException
from src.application.use_cases.buscar_peca_barcode_use_case import BuscarPecaPorCodigoBarrasUseCase
from tests.fakes.fake_repositories import FakePecaRepository


@pytest.mark.asyncio
async def test_buscar_peca_por_leitor_codigo_barras():
    peca_repo = FakePecaRepository()
    
    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7891049281023",
        sku="ALT-BOSCH-12V",
        descricao="Alternador Bosch 12V 90A",
        preco_custo=Decimal("450.00"),
        preco_venda=Decimal("780.00"),
        estoque_atual=4,
        estoque_minimo=1,
        localizacao="Baia A1"
    )
    await peca_repo.salvar(peca)

    use_case = BuscarPecaPorCodigoBarrasUseCase(peca_repo=peca_repo)

    # Simula entrada do leitor USB com caractere Enter (\r\n)
    resultado = await use_case.executar("7891049281023\r\n")
    assert resultado.id == peca.id
    assert resultado.descricao == "Alternador Bosch 12V 90A"
    assert resultado.preco_venda == Decimal("780.00")
    assert resultado.estoque_atual == 4


@pytest.mark.asyncio
async def test_buscar_peca_por_sku_quando_leitor_le_etiqueta_interna():
    peca_repo = FakePecaRepository()
    
    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7899999999999",
        sku="BOSCH-REG-14V",
        descricao="Regulador de Voltagem 14V",
        preco_custo=Decimal("60.00"),
        preco_venda=Decimal("120.00"),
        estoque_atual=15,
        estoque_minimo=3
    )
    await peca_repo.salvar(peca)

    use_case = BuscarPecaPorCodigoBarrasUseCase(peca_repo=peca_repo)

    resultado = await use_case.executar("BOSCH-REG-14V")
    assert resultado.id == peca.id
    assert resultado.sku == "BOSCH-REG-14V"


@pytest.mark.asyncio
async def test_buscar_peca_inexistente_lanca_excecao():
    peca_repo = FakePecaRepository()
    use_case = BuscarPecaPorCodigoBarrasUseCase(peca_repo=peca_repo)

    with pytest.raises(EntidadeNaoEncontradaException):
        await use_case.executar("9999999999999")
