"""
Teste do Use Case: GerarRelatorioDREUseCase (TDD).
DRE por período com CMV real (custo congelado nos itens), descontos como deduções
e despesas vindas das contas a pagar quitadas no período.
"""
import pytest
from datetime import date, datetime
from decimal import Decimal
import uuid
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.value_objects.enums import (
    FormaPagamento, StatusOS, TipoTitulo, CategoriaTitulo
)
from src.application.dtos.dre_dtos import PeriodoDREInputDTO
from src.application.use_cases.gerar_dre_use_case import GerarRelatorioDREUseCase
from tests.fakes.fake_repositories import (
    FakeVendaBalcaoRepository, FakeOrdemServicoRepository, FakeTituloFinanceiroRepository
)


def _venda(valor: str, custo: str, quando: datetime, desconto: str = "0.00", cancelar=False) -> VendaBalcao:
    venda = VendaBalcao(id=uuid.uuid4(), numero_venda=f"VB-{uuid.uuid4().hex[:4]}", operador_id=uuid.uuid4(), created_at=quando)
    venda.adicionar_item(uuid.uuid4(), "Peça", 1, Decimal(valor), Decimal(custo))
    venda.aplicar_desconto(Decimal(desconto))
    venda.finalizar(FormaPagamento.DINHEIRO)
    if cancelar:
        venda.cancelar("teste")
    return venda


def _os_entregue(pecas: str, custo: str, servicos: str, quando: datetime, desconto: str = "0.00") -> OrdemServico:
    os = OrdemServico(id=uuid.uuid4(), numero_os=f"OS-{uuid.uuid4().hex[:4]}", cliente_id=uuid.uuid4(),
                      carro_id=uuid.uuid4(), usuario_id=uuid.uuid4())
    os.adicionar_item_peca(uuid.uuid4(), "Alternador", 1, Decimal(pecas), Decimal(custo))
    os.adicionar_servico("Mão de obra", Decimal(servicos))
    os.aplicar_desconto(Decimal(desconto))
    os.status = StatusOS.FINALIZADO
    os.entregar(FormaPagamento.PIX)
    os.entregue_em = quando
    return os


@pytest.mark.asyncio
async def test_dre_calculation_cmv():
    vendas, ordens, titulos = FakeVendaBalcaoRepository(), FakeOrdemServicoRepository(), FakeTituloFinanceiroRepository()
    dentro = datetime(2026, 10, 9, 10, 0)
    fora = datetime(2026, 9, 1, 10, 0)

    for v in (
        _venda("500.00", "300.00", dentro, desconto="20.00"),
        _venda("100.00", "60.00", dentro),
        _venda("999.00", "1.00", fora),                    # fora do período
        _venda("400.00", "200.00", dentro, cancelar=True),  # cancelada não é receita
    ):
        await vendas.salvar(v)
    await ordens.salvar(_os_entregue("700.00", "450.00", "300.00", dentro, desconto="50.00"))
    await ordens.salvar(_os_entregue("100.00", "50.00", "100.00", fora))

    aluguel = TituloFinanceiro(id=uuid.uuid4(), tipo=TipoTitulo.PAGAR, descricao="Aluguel", valor=Decimal("1000.00"),
                               data_vencimento=date(2026, 10, 5), categoria=CategoriaTitulo.DESPESA_FIXA)
    aluguel.baixar(date(2026, 10, 5), FormaPagamento.PIX)
    energia = TituloFinanceiro(id=uuid.uuid4(), tipo=TipoTitulo.PAGAR, descricao="Energia", valor=Decimal("200.00"),
                               data_vencimento=date(2026, 10, 8), categoria=CategoriaTitulo.DESPESA_VARIAVEL)
    energia.baixar(date(2026, 10, 8), FormaPagamento.PIX)
    compra = TituloFinanceiro(id=uuid.uuid4(), tipo=TipoTitulo.PAGAR, descricao="Compra Bosch", valor=Decimal("5000.00"),
                              data_vencimento=date(2026, 10, 8), categoria=CategoriaTitulo.COMPRA_MERCADORIA)
    compra.baixar(date(2026, 10, 8), FormaPagamento.PIX)  # Compra de estoque não é despesa (vira CMV ao vender)
    for t in (aluguel, energia, compra):
        await titulos.salvar(t)

    dre = await GerarRelatorioDREUseCase(vendas, ordens, titulos).executar(PeriodoDREInputDTO(
        data_inicio=date(2026, 10, 1), data_fim=date(2026, 10, 31),
        percentual_custo_mao_obra=Decimal("40")
    ))

    assert dre.receita_vendas_produtos == Decimal("1300.00")   # 500 + 100 (balcão) + 700 (peças da OS)
    assert dre.receita_servicos_os == Decimal("300.00")
    assert dre.receita_bruta_total == Decimal("1600.00")
    assert dre.deducoes_descontos == Decimal("70.00")            # 20 (venda) + 50 (OS)
    assert dre.receita_liquida == Decimal("1530.00")
    assert dre.custo_mercadorias_vendidas == Decimal("810.00")   # 300 + 60 + 450 (custo real)
    assert dre.custo_mao_obra_direta == Decimal("120.00")        # 40% de 300
    assert dre.lucro_bruto == Decimal("600.00")
    assert dre.despesas_operacionais_fixas == Decimal("1000.00")
    assert dre.despesas_variaveis == Decimal("200.00")
    assert dre.lucro_liquido == Decimal("-600.00")
    assert dre.quantidade_vendas == 2
    assert dre.quantidade_os == 1
    assert dre.periodo == "01/10/2026 a 31/10/2026"
