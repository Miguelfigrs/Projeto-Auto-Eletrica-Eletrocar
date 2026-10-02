"""
Testes unitários das Entidades de Domínio (TDD).
Testa regras de negócio puras: estoque, transições de estado de OS, cálculo de totais.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.peca import Peca
from src.domain.entities.ordem_servico import OrdemServico, ItemOS, ServicoOS
from src.domain.entities.venda_balcao import VendaBalcao, ItemVenda
from src.domain.entities.caixa import CaixaDiario, MovimentacaoCaixa
from src.domain.value_objects.enums import (
    Role,
    StatusOS,
    OrigemOS,
    FormaPagamento,
    TipoMovimentacaoCaixa,
    StatusCaixa
)
from src.domain.exceptions.domain_exceptions import (
    EstoqueInsuficienteException,
    TransicaoStatusInvalidaException,
    RegraNegocioException
)


def test_peca_baixa_e_reposicao_estoque():
    peca = Peca(
        id=uuid.uuid4(),
        codigo_barras="7891049281023",
        sku="REG-BOSCH-12V",
        descricao="Regulador de Voltagem Bosch 12V",
        preco_custo=Decimal("110.00"),
        preco_venda=Decimal("185.00"),
        estoque_atual=10,
        estoque_minimo=3,
        localizacao="Prateleira B3"
    )
    
    assert peca.esta_abaixo_minimo() is False
    
    peca.baixar_estoque(8)
    assert peca.estoque_atual == 2
    assert peca.esta_abaixo_minimo() is True
    
    # Tentativa de baixar mais do que disponível deve lançar exceção
    with pytest.raises(EstoqueInsuficienteException):
        peca.baixar_estoque(5)
        
    peca.adicionar_estoque(10)
    assert peca.estoque_atual == 12
    assert peca.esta_abaixo_minimo() is False


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
    os_id = uuid.uuid4()
    cliente_id = uuid.uuid4()
    carro_id = uuid.uuid4()
    usuario_id = uuid.uuid4()
    
    os = OrdemServico(
        id=os_id,
        numero_os="OS-2026-0001",
        cliente_id=cliente_id,
        carro_id=carro_id,
        usuario_id=usuario_id,
        origem=OrigemOS.TELEGRAM_VOICE,
        sintomas="Alternador não carrega bateria",
        status=StatusOS.TRIAGEM
    )
    
    assert os.status == StatusOS.TRIAGEM
    
    # Triagem -> OrcamentoPendente
    os.transicionar_para(StatusOS.ORCAMENTO_PENDENTE)
    assert os.status == StatusOS.ORCAMENTO_PENDENTE
    
    # Adicionar serviço e peça
    os.adicionar_servico("Mão de obra de substituição do regulador", Decimal("120.00"))
    os.adicionar_item_peca(uuid.uuid4(), "Regulador Bosch 12V", 1, Decimal("185.00"))
    
    assert os.valor_servicos == Decimal("120.00")
    assert os.valor_pecas == Decimal("185.00")
    assert os.valor_total == Decimal("305.00")
    
    # OrcamentoPendente -> Aprovado
    os.transicionar_para(StatusOS.APROVADO)
    assert os.status == StatusOS.APROVADO
    
    # Aprovado -> EmExecucao
    os.transicionar_para(StatusOS.EM_EXECUCAO)
    assert os.status == StatusOS.EM_EXECUCAO
    
    # EmExecucao -> TestesEletricos
    os.transicionar_para(StatusOS.TESTES_ELETRICOS)
    assert os.status == StatusOS.TESTES_ELETRICOS
    
    # TestesEletricos -> Finalizado
    os.transicionar_para(StatusOS.FINALIZADO)
    assert os.status == StatusOS.FINALIZADO
    
    # Finalizado -> Entregue
    os.transicionar_para(StatusOS.ENTREGUE)
    assert os.status == StatusOS.ENTREGUE
    
    # Não pode transicionar de Entregue para Triagem (transição proibida)
    with pytest.raises(TransicaoStatusInvalidaException):
        os.transicionar_para(StatusOS.TRIAGEM)


def test_venda_balcao_adicao_itens_e_desconto():
    venda = VendaBalcao(
        id=uuid.uuid4(),
        numero_venda="VND-0001",
        operador_id=uuid.uuid4()
    )
    
    peca_id = uuid.uuid4()
    venda.adicionar_item(peca_id, "Lâmpada H7 Philips", 2, Decimal("45.00"))
    assert venda.subtotal == Decimal("90.00")
    assert venda.valor_total == Decimal("90.00")
    
    # Aplicar desconto de 10 reais
    venda.aplicar_desconto(Decimal("10.00"))
    assert venda.valor_total == Decimal("80.00")
    
    # Finalizar venda
    venda.finalizar(FormaPagamento.PIX)
    assert venda.forma_pagamento == FormaPagamento.PIX
    
    # Não pode modificar venda finalizada
    with pytest.raises(RegraNegocioException):
        venda.adicionar_item(uuid.uuid4(), "Outro item", 1, Decimal("10.00"))


def test_caixa_diario_sangria_suprimento_fechamento_cego():
    caixa = CaixaDiario(
        id=uuid.uuid4(),
        operador_id=uuid.uuid4(),
        saldo_inicial=Decimal("200.00")
    )
    assert caixa.status == StatusCaixa.ABERTO
    assert caixa.saldo_teorico == Decimal("200.00")
    
    # Suprimento de troco
    caixa.registrar_movimentacao(
        TipoMovimentacaoCaixa.SUPRIMENTO,
        Decimal("100.00"),
        FormaPagamento.DINHEIRO,
        "Troco adicional de moedas"
    )
    assert caixa.saldo_teorico == Decimal("300.00")
    
    # Venda em dinheiro
    caixa.registrar_movimentacao(
        TipoMovimentacaoCaixa.ENTRADA_VENDA,
        Decimal("150.00"),
        FormaPagamento.DINHEIRO,
        "Venda VND-0001"
    )
    assert caixa.saldo_teorico == Decimal("450.00")
    
    # Sangria para cofre
    caixa.registrar_movimentacao(
        TipoMovimentacaoCaixa.SANGRIA,
        Decimal("200.00"),
        FormaPagamento.DINHEIRO,
        "Retirada de excesso para cofre"
    )
    assert caixa.saldo_teorico == Decimal("250.00")
    
    # Fechamento cego: operador conta R$ 250,00 fisicamente
    resultado = caixa.fechar_cego(valores_contados_por_forma={
        FormaPagamento.DINHEIRO: Decimal("250.00")
    })
    
    assert caixa.status == StatusCaixa.FECHADO
    assert resultado["diferenca_total"] == Decimal("0.00")
    assert resultado["quebra_ou_sobra"] == "CORRETO"
