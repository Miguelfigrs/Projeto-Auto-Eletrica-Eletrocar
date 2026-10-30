"""
Testes unitários das Entidades de Domínio (TDD).
Testa regras de negócio puras: estoque com reserva, transições de estado de OS, cálculo de totais.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.peca import Peca
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.value_objects.enums import (
    StatusOS,
    OrigemOS,
    FormaPagamento,
    StatusVenda
)
from src.domain.exceptions.domain_exceptions import (
    EstoqueInsuficienteException,
    TransicaoStatusInvalidaException,
    RegraNegocioException
)


def _peca(estoque=10, **kwargs) -> Peca:
    dados = dict(
        id=uuid.uuid4(),
        codigo_barras="7891049281023",
        sku="reg-bosch-12v",
        descricao="Regulador de Voltagem Bosch 12V",
        preco_custo=Decimal("110.00"),
        preco_venda=Decimal("185.00"),
        estoque_atual=estoque,
        estoque_minimo=3,
        localizacao="Prateleira B3"
    )
    dados.update(kwargs)
    return Peca(**dados)


def _os(**kwargs) -> OrdemServico:
    dados = dict(
        id=uuid.uuid4(),
        numero_os="OS-2026-0001",
        cliente_id=uuid.uuid4(),
        carro_id=uuid.uuid4(),
        usuario_id=uuid.uuid4(),
        origem=OrigemOS.TELEGRAM_VOICE,
        sintomas="Alternador não carrega bateria",
    )
    dados.update(kwargs)
    return OrdemServico(**dados)


def test_peca_baixa_e_reposicao_estoque():
    peca = _peca(estoque=10)
    assert peca.sku == "REG-BOSCH-12V"  # SKU sempre normalizado em maiúsculas
    assert peca.esta_abaixo_minimo() is False

    peca.baixar_estoque(8)
    assert peca.estoque_atual == 2
    assert peca.esta_abaixo_minimo() is True

    with pytest.raises(EstoqueInsuficienteException):
        peca.baixar_estoque(5)

    peca.adicionar_estoque(10)
    assert peca.estoque_atual == 12
    assert peca.esta_abaixo_minimo() is False


def test_peca_reserva_para_os_reduz_saldo_disponivel():
    peca = _peca(estoque=5)

    peca.reservar(3)
    assert peca.estoque_atual == 5
    assert peca.estoque_reservado == 3
    assert peca.estoque_disponivel == 2

    # Venda de balcão só enxerga o saldo disponível (não reservado)
    with pytest.raises(EstoqueInsuficienteException):
        peca.baixar_estoque(3)

    # Finalização da OS converte a reserva em baixa definitiva
    peca.baixar_reserva(3)
    assert peca.estoque_atual == 2
    assert peca.estoque_reservado == 0


def test_peca_liberar_reserva_no_cancelamento_da_os():
    peca = _peca(estoque=4)
    peca.reservar(2)
    peca.liberar_reserva(2)
    assert peca.estoque_disponivel == 4

    with pytest.raises(RegraNegocioException):
        peca.liberar_reserva(1)


def test_peca_ajuste_de_inventario_retorna_diferenca():
    peca = _peca(estoque=10)
    peca.reservar(2)
    assert peca.ajustar_saldo(7) == -3
    assert peca.estoque_atual == 7

    # Não pode ajustar abaixo do que já está reservado para OS
    with pytest.raises(RegraNegocioException):
        peca.ajustar_saldo(1)


def test_peca_alterar_precos_valida_valores():
    peca = _peca()
    peca.alterar_precos(preco_custo=Decimal("120.00"), preco_venda=Decimal("199.90"))
    assert peca.preco_venda == Decimal("199.90")
    with pytest.raises(RegraNegocioException):
        peca.alterar_precos(preco_custo=Decimal("10.00"), preco_venda=Decimal("-1.00"))


def test_cliente_com_carros():
    cliente = Cliente(
        id=uuid.uuid4(),
        nome="Carlos Silva",
        cpf_cnpj="52998224725",
        telefone="11999998888"
    )
    assert len(cliente.carros) == 0

    carro = Carro(
        id=uuid.uuid4(),
        cliente_id=cliente.id,
        placa="ABC1D23",
        modelo="Gol 1.6",
        marca="Volkswagen",
        ano="2019"
    )
    cliente.adicionar_carro(carro)
    assert len(cliente.carros) == 1
    assert cliente.carros[0].modelo == "Gol 1.6"


def test_ordem_servico_ciclo_de_vida_state_machine():
    os = _os()
    assert os.status == StatusOS.TRIAGEM

    os.transicionar_para(StatusOS.ORCAMENTO_PENDENTE)
    os.adicionar_servico("Mão de obra de substituição do regulador", Decimal("120.00"))
    os.adicionar_item_peca(uuid.uuid4(), "Regulador Bosch 12V", 1, Decimal("185.00"), Decimal("110.00"))

    assert os.valor_servicos == Decimal("120.00")
    assert os.valor_pecas == Decimal("185.00")
    assert os.custo_pecas == Decimal("110.00")
    assert os.valor_total == Decimal("305.00")

    os.transicionar_para(StatusOS.APROVADO)
    os.transicionar_para(StatusOS.EM_EXECUCAO)
    os.transicionar_para(StatusOS.TESTES_ELETRICOS)
    os.transicionar_para(StatusOS.FINALIZADO)
    assert os.status == StatusOS.FINALIZADO
    assert os.finalizada_em is not None

    # A entrega só ocorre via faturamento (exige forma de pagamento)
    with pytest.raises(RegraNegocioException):
        os.transicionar_para(StatusOS.ENTREGUE)

    os.entregar(FormaPagamento.PIX)
    assert os.status == StatusOS.ENTREGUE
    assert os.forma_pagamento == FormaPagamento.PIX
    assert os.entregue_em is not None

    with pytest.raises(TransicaoStatusInvalidaException):
        os.transicionar_para(StatusOS.TRIAGEM)


def test_os_nao_pode_ser_entregue_antes_de_finalizada():
    os = _os()
    with pytest.raises(TransicaoStatusInvalidaException):
        os.entregar(FormaPagamento.DINHEIRO)


def test_os_quantidades_por_peca_agrupa_itens():
    os = _os()
    peca_id = uuid.uuid4()
    os.adicionar_item_peca(peca_id, "Relé", 1, Decimal("25.00"))
    os.adicionar_item_peca(peca_id, "Relé", 2, Decimal("25.00"))
    assert os.quantidades_por_peca() == {peca_id: 3}


def test_venda_balcao_adicao_itens_e_desconto():
    venda = VendaBalcao(
        id=uuid.uuid4(),
        numero_venda="VB-2026-0001",
        operador_id=uuid.uuid4()
    )

    peca_id = uuid.uuid4()
    venda.adicionar_item(peca_id, "Lâmpada H7 Philips", 2, Decimal("45.00"), Decimal("28.00"))
    assert venda.subtotal == Decimal("90.00")
    assert venda.custo_total == Decimal("56.00")

    venda.aplicar_desconto(Decimal("9.00"))
    assert venda.valor_total == Decimal("81.00")
    assert venda.percentual_desconto == Decimal("10.00")

    venda.finalizar(FormaPagamento.PIX)
    assert venda.forma_pagamento == FormaPagamento.PIX

    with pytest.raises(RegraNegocioException):
        venda.adicionar_item(uuid.uuid4(), "Outro item", 1, Decimal("10.00"))


def test_venda_desconto_percentual():
    venda = VendaBalcao(id=uuid.uuid4(), numero_venda="VB-2026-0002", operador_id=uuid.uuid4())
    venda.adicionar_item(uuid.uuid4(), "Bateria", 1, Decimal("489.00"))
    venda.aplicar_desconto_percentual(Decimal("5"))
    assert venda.desconto == Decimal("24.45")

    with pytest.raises(RegraNegocioException):
        venda.aplicar_desconto_percentual(Decimal("101"))


def test_cancelamento_de_venda_exige_motivo_e_e_unico():
    venda = VendaBalcao(id=uuid.uuid4(), numero_venda="VB-2026-0003", operador_id=uuid.uuid4())
    venda.adicionar_item(uuid.uuid4(), "Fusível", 1, Decimal("14.00"))
    venda.finalizar(FormaPagamento.DINHEIRO)

    with pytest.raises(RegraNegocioException):
        venda.cancelar("")

    venda.cancelar("Cliente desistiu da compra")
    assert venda.status == StatusVenda.CANCELADA
    assert venda.cancelada_em is not None

    with pytest.raises(RegraNegocioException):
        venda.cancelar("Novamente")
