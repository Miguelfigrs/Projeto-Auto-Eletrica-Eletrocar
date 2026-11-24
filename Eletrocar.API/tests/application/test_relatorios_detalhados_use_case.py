"""
Testes: detalhamento da DRE (o que foi vendido / gasto) e histórico de movimentações de estoque.
"""
from datetime import date, datetime
from decimal import Decimal
import uuid
import pytest
from src.domain.entities.auditoria import novo_log
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.peca import Peca
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.entities.usuario import Usuario
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.domain.value_objects.enums import CategoriaTitulo, FormaPagamento, Papel, StatusOS, TipoTitulo
from src.application.dtos.dre_dtos import PeriodoDREInputDTO
from src.application.use_cases.gerar_dre_use_case import GerarRelatorioDREUseCase
from src.application.use_cases.consultar_movimentacoes_estoque_use_case import ConsultarMovimentacoesEstoqueUseCase
from tests.fakes.fake_repositories import (
    FakeAuditoriaRepository, FakeOrdemServicoRepository, FakePecaRepository,
    FakeTituloFinanceiroRepository, FakeUsuarioRepository, FakeVendaBalcaoRepository,
)

OUTUBRO = datetime(2026, 10, 9, 10, 0)
SETEMBRO = datetime(2026, 9, 1, 10, 0)


def _peca(sku: str) -> Peca:
    return Peca(id=uuid.uuid4(), codigo_barras=f"789{uuid.uuid4().int % 10**10:010d}", sku=sku,
                descricao=f"Peça {sku}", preco_custo=Decimal("10.00"), preco_venda=Decimal("25.00"), estoque_atual=50)


def _venda(operador_id, peca: Peca, qtd: int, quando: datetime, desconto="0.00") -> VendaBalcao:
    venda = VendaBalcao(id=uuid.uuid4(), numero_venda=f"VB-{uuid.uuid4().hex[:4]}", operador_id=operador_id,
                        created_at=quando)
    venda.adicionar_item(peca.id, peca.descricao, qtd, peca.preco_venda, peca.preco_custo)
    venda.aplicar_desconto(Decimal(desconto))
    venda.finalizar(FormaPagamento.PIX)
    return venda


def _os(peca: Peca, quando: datetime) -> OrdemServico:
    os = OrdemServico(id=uuid.uuid4(), numero_os=f"OS-{uuid.uuid4().hex[:4]}", cliente_id=uuid.uuid4(),
                      carro_id=uuid.uuid4(), usuario_id=uuid.uuid4())
    os.adicionar_item_peca(peca.id, peca.descricao, 2, Decimal("30.00"), Decimal("10.00"))
    os.adicionar_servico("Troca do alternador", Decimal("150.00"))
    os.status = StatusOS.FINALIZADO
    os.finalizada_em = quando
    os.entregar(FormaPagamento.DINHEIRO)
    os.entregue_em = quando
    return os


def _titulo(descricao: str, valor: str, categoria: CategoriaTitulo, pago_em: date) -> TituloFinanceiro:
    titulo = TituloFinanceiro(id=uuid.uuid4(), tipo=TipoTitulo.PAGAR, descricao=descricao, valor=Decimal(valor),
                              data_vencimento=pago_em, categoria=categoria)
    titulo.baixar(pago_em, FormaPagamento.PIX)
    return titulo


@pytest.fixture
async def cenario():
    vendas, ordens, titulos = FakeVendaBalcaoRepository(), FakeOrdemServicoRepository(), FakeTituloFinanceiroRepository()
    pecas, usuarios, auditoria = FakePecaRepository(), FakeUsuarioRepository(), FakeAuditoriaRepository()
    operador = Usuario(id=uuid.uuid4(), nome="Juliana", email="juliana@eletrocar.com.br", senha_hash="x",
                       papeis={Papel.BALCONISTA})
    await usuarios.salvar(operador)
    rele, alternador = _peca("RELE-01"), _peca("ALT-01")
    for p in (rele, alternador):
        await pecas.salvar(p)

    venda_ok = _venda(operador.id, rele, 4, OUTUBRO, desconto="10.00")
    venda_cancelada = _venda(operador.id, rele, 1, OUTUBRO)
    venda_cancelada.cancelar("Cliente desistiu")
    venda_cancelada.cancelada_em = datetime(2026, 10, 10, 9, 0)
    for v in (venda_ok, venda_cancelada, _venda(operador.id, rele, 9, SETEMBRO)):
        await vendas.salvar(v)
    await ordens.salvar(_os(alternador, OUTUBRO))

    for t in (
        _titulo("Aluguel", "3500.00", CategoriaTitulo.DESPESA_FIXA, date(2026, 10, 5)),
        _titulo("Frete", "80.00", CategoriaTitulo.DESPESA_VARIAVEL, date(2026, 10, 7)),
        _titulo("Compra Bosch", "900.00", CategoriaTitulo.COMPRA_MERCADORIA, date(2026, 10, 8)),
        _titulo("Aluguel setembro", "3500.00", CategoriaTitulo.DESPESA_FIXA, date(2026, 9, 5)),
    ):
        await titulos.salvar(t)

    def log(acao, detalhes, depois, quando):
        registro = novo_log(operador.id, "ESTOQUE", acao, detalhes=detalhes, depois=depois)
        object.__setattr__(registro, "timestamp", quando)
        return registro

    for registro in (
        log("PECA_CADASTRADA", {"peca_id": str(alternador.id), "sku": "ALT-01"},
            {"estoque_atual": 5, "preco_custo": "10.00"}, datetime(2026, 10, 1, 8, 0)),
        log("ESTOQUE_ENTRADA", {"peca_id": str(rele.id), "sku": "RELE-01", "quantidade": 20, "observacao": "NF 123"},
            {"estoque_atual": 70, "preco_custo": "9.50"}, datetime(2026, 10, 2, 8, 0)),
        log("ESTOQUE_AJUSTADO", {"peca_id": str(rele.id), "sku": "RELE-01", "diferenca": -3, "motivo": "Avaria"},
            {"estoque_atual": 67}, datetime(2026, 10, 3, 8, 0)),
        log("ESTOQUE_ENTRADA", {"peca_id": str(rele.id), "quantidade": 7}, {}, SETEMBRO),
        log("LOGIN_REALIZADO", {}, {}, OUTUBRO),
    ):
        await auditoria.registrar(registro)

    return dict(vendas=vendas, ordens=ordens, titulos=titulos, pecas=pecas, usuarios=usuarios,
                auditoria=auditoria, rele=rele, alternador=alternador)


OUTUBRO_DTO = PeriodoDREInputDTO(data_inicio=date(2026, 10, 1), data_fim=date(2026, 10, 31))


async def test_detalhamento_lista_vendas_os_e_despesas_do_periodo(cenario):
    uc = GerarRelatorioDREUseCase(cenario["vendas"], cenario["ordens"], cenario["titulos"], cenario["usuarios"])
    detalhe = await uc.detalhar(OUTUBRO_DTO)

    assert detalhe.periodo == "01/10/2026 a 31/10/2026"
    assert len(detalhe.vendas) == 1  # cancelada e de setembro ficam de fora (mesma regra da DRE)
    venda = detalhe.vendas[0]
    assert venda.operador == "Juliana"
    assert venda.forma_pagamento == "PIX"
    assert (venda.subtotal, venda.desconto, venda.total) == (Decimal("100.00"), Decimal("10.00"), Decimal("90.00"))
    assert venda.custo == Decimal("40.00") and venda.lucro_bruto == Decimal("50.00")
    assert venda.itens[0].quantidade == 4 and venda.itens[0].total == Decimal("100.00")

    assert len(detalhe.ordens_servico) == 1
    os = detalhe.ordens_servico[0]
    assert (os.valor_pecas, os.valor_servicos, os.total) == (Decimal("60.00"), Decimal("150.00"), Decimal("210.00"))
    assert os.servicos[0].descricao == "Troca do alternador"

    assert [d.descricao for d in detalhe.despesas] == ["Compra Bosch", "Frete", "Aluguel"]
    assert [d.entra_no_dre for d in detalhe.despesas] == [False, True, True]
    assert detalhe.total_vendas == Decimal("90.00")
    assert detalhe.total_ordens_servico == Decimal("210.00")
    assert detalhe.total_despesas == Decimal("3580.00")  # compra de mercadoria não é despesa da DRE


async def test_detalhamento_sem_repositorio_de_usuarios_nao_informa_operador(cenario):
    uc = GerarRelatorioDREUseCase(cenario["vendas"], cenario["ordens"], cenario["titulos"])
    detalhe = await uc.detalhar(OUTUBRO_DTO)
    assert detalhe.vendas[0].operador is None


async def test_detalhamento_valida_periodo(cenario):
    uc = GerarRelatorioDREUseCase(cenario["vendas"], cenario["ordens"], cenario["titulos"])
    with pytest.raises(RegraNegocioException):
        await uc.detalhar(PeriodoDREInputDTO(data_inicio=date(2026, 10, 31), data_fim=date(2026, 10, 1)))


def _uc_mov(c) -> ConsultarMovimentacoesEstoqueUseCase:
    return ConsultarMovimentacoesEstoqueUseCase(c["vendas"], c["ordens"], c["auditoria"], c["pecas"], c["usuarios"])


async def test_historico_de_estoque_reune_todas_as_origens(cenario):
    resultado = await _uc_mov(cenario).executar(date(2026, 10, 1), date(2026, 10, 31))

    por_origem = {}
    for m in resultado.movimentacoes:
        por_origem.setdefault(m.origem, []).append(m)

    assert sorted(por_origem) == [
        "AJUSTE_INVENTARIO", "CADASTRO", "CANCELAMENTO_VENDA", "ENTRADA_FORNECEDOR", "ORDEM_SERVICO", "VENDA",
    ]
    assert sorted(m.quantidade for m in por_origem["VENDA"]) == [1, 4]  # inclui a venda depois cancelada
    assert por_origem["VENDA"][0].usuario == "Juliana"
    estorno = por_origem["CANCELAMENTO_VENDA"][0]
    assert (estorno.tipo, estorno.quantidade, estorno.observacao) == ("ENTRADA", 1, "Cliente desistiu")
    assert por_origem["ORDEM_SERVICO"][0].sku == "ALT-01"
    entrada = por_origem["ENTRADA_FORNECEDOR"][0]
    assert (entrada.quantidade, entrada.valor_unitario, entrada.observacao) == (20, Decimal("9.50"), "NF 123")
    ajuste = por_origem["AJUSTE_INVENTARIO"][0]
    assert (ajuste.tipo, ajuste.quantidade, ajuste.observacao) == ("SAIDA", 3, "Avaria")
    assert por_origem["CADASTRO"][0].quantidade == 5

    assert resultado.total_entradas == 1 + 20 + 5
    assert resultado.total_saidas == 4 + 1 + 2 + 3
    datas = [m.data for m in resultado.movimentacoes]
    assert datas == sorted(datas, reverse=True)


async def test_historico_filtra_por_peca_e_tipo(cenario):
    uc = _uc_mov(cenario)
    so_alternador = await uc.executar(date(2026, 10, 1), date(2026, 10, 31), peca_id=cenario["alternador"].id)
    assert {m.origem for m in so_alternador.movimentacoes} == {"CADASTRO", "ORDEM_SERVICO"}

    entradas = await uc.executar(date(2026, 10, 1), date(2026, 10, 31), tipo="entrada")
    assert {m.tipo for m in entradas.movimentacoes} == {"ENTRADA"}
    assert entradas.total_saidas == 0


async def test_historico_valida_parametros(cenario):
    uc = _uc_mov(cenario)
    with pytest.raises(RegraNegocioException):
        await uc.executar(date(2026, 10, 31), date(2026, 10, 1))
    with pytest.raises(RegraNegocioException):
        await uc.executar(date(2026, 10, 1), date(2026, 10, 31), tipo="TRANSFERENCIA")


async def test_historico_tolera_logs_incompletos(cenario):
    auditoria = FakeAuditoriaRepository()
    for acao, detalhes, depois in (
        ("ESTOQUE_ENTRADA", {"peca_id": "nao-e-uuid", "quantidade": 0}, {}),
        ("ESTOQUE_AJUSTADO", {"peca_id": str(uuid.uuid4()), "sku": "SUMIU", "diferenca": 2}, {}),
        ("ESTOQUE_AJUSTADO", {"diferenca": 0}, {}),
        ("PECA_CADASTRADA", {"sku": "ZERO"}, {"estoque_atual": 0, "preco_custo": "abc"}),
        ("PECA_CADASTRADA", {"sku": "X"}, {"estoque_atual": 2, "preco_custo": "abc"}),
    ):
        registro = novo_log(None, "ESTOQUE", acao, detalhes=detalhes, depois=depois)
        object.__setattr__(registro, "timestamp", OUTUBRO)
        await auditoria.registrar(registro)

    uc = ConsultarMovimentacoesEstoqueUseCase(FakeVendaBalcaoRepository(), FakeOrdemServicoRepository(),
                                              auditoria, cenario["pecas"])
    resultado = await uc.executar(date(2026, 10, 1), date(2026, 10, 31))

    assert [(m.origem, m.sku, m.descricao, m.quantidade) for m in resultado.movimentacoes] == [
        ("AJUSTE_INVENTARIO", "SUMIU", "SUMIU", 2),
        ("CADASTRO", "X", "X", 2),
    ]
    assert resultado.movimentacoes[1].valor_unitario is None
    assert all(m.usuario is None for m in resultado.movimentacoes)


def test_limites_utc_usam_o_dia_do_fuso_da_oficina():
    from src.domain.value_objects.tempo import limites_utc
    inicio, fim = limites_utc(date(2026, 11, 23), date(2026, 11, 23), "America/Sao_Paulo")
    assert inicio == datetime(2026, 11, 23, 3, 0)
    assert fim == datetime(2026, 11, 24, 2, 59, 59, 999999)
    assert limites_utc(date(2026, 11, 23), date(2026, 11, 23), "UTC") == (
        datetime(2026, 11, 23, 0, 0), datetime(2026, 11, 23, 23, 59, 59, 999999)
    )


async def test_movimentacao_a_noite_conta_no_dia_local(cenario):
    """23:50 em Brasília = 02:50 UTC do dia seguinte: deve aparecer no dia local, não no seguinte."""
    auditoria = FakeAuditoriaRepository()
    registro = novo_log(None, "ESTOQUE", "ESTOQUE_ENTRADA",
                        detalhes={"peca_id": str(cenario["rele"].id), "quantidade": 6}, depois={})
    object.__setattr__(registro, "timestamp", datetime(2026, 11, 24, 2, 50))
    await auditoria.registrar(registro)
    uc = ConsultarMovimentacoesEstoqueUseCase(FakeVendaBalcaoRepository(), FakeOrdemServicoRepository(),
                                              auditoria, cenario["pecas"], fuso="America/Sao_Paulo")

    assert (await uc.executar(date(2026, 11, 23), date(2026, 11, 23))).total_entradas == 6
    assert (await uc.executar(date(2026, 11, 24), date(2026, 11, 24))).total_entradas == 0
