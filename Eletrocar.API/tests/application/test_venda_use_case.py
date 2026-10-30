"""
Teste do Use Case: RealizarVendaBalcaoUseCase (TDD).
Baixa atômica de estoque, caixa aberto obrigatório (UC02), alçada gerencial de desconto/preço,
PIX com liquidação confirmada, venda faturada (conta a receber) e auditoria imutável.
"""
import pytest
from decimal import Decimal
from src.domain.value_objects.enums import Papel, FormaPagamento, TipoTitulo, CategoriaTitulo
from src.domain.exceptions.domain_exceptions import (
    EstoqueInsuficienteException,
    RegraNegocioException,
    CaixaFechadoException,
    AutorizacaoGerencialNecessariaException,
    CredenciaisInvalidasException,
)
from src.application.dtos.venda_dtos import ItemVendaInputDTO, RealizarVendaInputDTO, AutorizacaoGerencialDTO
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from tests.application.conftest import Cenario


def _use_case(c: Cenario) -> RealizarVendaBalcaoUseCase:
    return RealizarVendaBalcaoUseCase(
        peca_repo=c.pecas,
        venda_repo=c.vendas,
        caixa_repo=c.caixas,
        audit_repo=c.auditoria,
        usuario_repo=c.usuarios,
        titulo_repo=c.titulos,
        cobranca_repo=c.cobrancas,
        validador_alcada=c.validador,
        limite_desconto_percentual=Decimal("5"),
        prazo_faturado_dias=30,
    )


@pytest.mark.asyncio
async def test_realizar_venda_balcao_sucesso(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    peca = await cenario.peca(estoque=10, preco_venda="180.00", preco_custo="100.00")
    caixa = await cenario.caixa_aberto(operador.id, saldo="100.00")

    output = await _use_case(cenario).executar(RealizarVendaInputDTO(
        operador_id=operador.id,
        itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=2)],
        desconto=Decimal("10.00"),  # 2,78% -> dentro da alçada do balconista
        forma_pagamento=FormaPagamento.DINHEIRO
    ))

    assert output.valor_total == Decimal("350.00")
    assert output.numero_venda.startswith("VB-")
    assert (await cenario.pecas.buscar_por_id(peca.id)).estoque_atual == 8
    assert (await cenario.caixas.buscar_por_id(caixa.id)).saldo_teorico == Decimal("450.00")
    # Custo congelado no item para o CMV real do DRE
    venda = await cenario.vendas.buscar_por_id(output.id)
    assert venda.custo_total == Decimal("200.00")
    assert cenario.auditoria.acoes() == ["VENDA_BALCAO_FINALIZADA", "DESCONTO_APLICADO"]


@pytest.mark.asyncio
async def test_venda_exige_caixa_aberto(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    peca = await cenario.peca(estoque=5)

    with pytest.raises(CaixaFechadoException):
        await _use_case(cenario).executar(RealizarVendaInputDTO(
            operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)],
            forma_pagamento=FormaPagamento.DINHEIRO
        ))
    assert (await cenario.pecas.buscar_por_id(peca.id)).estoque_atual == 5


@pytest.mark.asyncio
async def test_realizar_venda_estoque_insuficiente_nao_altera_nenhuma_peca(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    peca_ok = await cenario.peca(estoque=10)
    peca_sem_saldo = await cenario.peca(estoque=2)

    with pytest.raises(EstoqueInsuficienteException):
        await _use_case(cenario).executar(RealizarVendaInputDTO(
            operador_id=operador.id,
            itens=[
                ItemVendaInputDTO(peca_id=peca_ok.id, quantidade=3),
                ItemVendaInputDTO(peca_id=peca_sem_saldo.id, quantidade=5),
            ],
            forma_pagamento=FormaPagamento.PIX
        ))

    assert (await cenario.pecas.buscar_por_id(peca_ok.id)).estoque_atual == 10
    assert (await cenario.pecas.buscar_por_id(peca_sem_saldo.id)).estoque_atual == 2
    assert cenario.vendas.vendas == {}


@pytest.mark.asyncio
async def test_venda_respeita_estoque_reservado_para_os(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=3)
    peca.reservar(2)

    with pytest.raises(EstoqueInsuficienteException):
        await _use_case(cenario).executar(RealizarVendaInputDTO(
            operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=2)],
            forma_pagamento=FormaPagamento.DINHEIRO
        ))


@pytest.mark.asyncio
async def test_bloqueia_pecas_em_ordem_deterministica_para_evitar_deadlock(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    pecas = [await cenario.peca(estoque=10) for _ in range(3)]

    await _use_case(cenario).executar(RealizarVendaInputDTO(
        operador_id=operador.id,
        itens=[ItemVendaInputDTO(peca_id=p.id, quantidade=1) for p in reversed(pecas)],
        forma_pagamento=FormaPagamento.DINHEIRO
    ))

    assert cenario.pecas.bloqueios == sorted((p.id for p in pecas), key=str)


@pytest.mark.asyncio
async def test_desconto_acima_da_alcada_sem_autorizacao_e_negado(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=5, preco_venda="100.00")

    with pytest.raises(AutorizacaoGerencialNecessariaException):
        await _use_case(cenario).executar(RealizarVendaInputDTO(
            operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)],
            desconto_percentual=Decimal("10"), forma_pagamento=FormaPagamento.DINHEIRO
        ))
    assert (await cenario.pecas.buscar_por_id(peca.id)).estoque_atual == 5


@pytest.mark.asyncio
async def test_desconto_acima_da_alcada_com_pin_do_gestor_e_auditado(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    gestor = await cenario.usuario(Papel.ADMIN, email="gestor@eletrocar.com.br", pin="4321")
    await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=5, preco_venda="100.00")

    output = await _use_case(cenario).executar(RealizarVendaInputDTO(
        operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)],
        desconto_percentual=Decimal("10"), forma_pagamento=FormaPagamento.DINHEIRO,
        autorizacao=AutorizacaoGerencialDTO(identificador_gestor="gestor@eletrocar.com.br", pin="4321")
    ))

    assert output.valor_total == Decimal("90.00")
    assert output.autorizado_por_id == gestor.id
    log = next(l for l in cenario.auditoria.logs if l.acao == "DESCONTO_APLICADO")
    assert log.payload_antes == {"desconto": "0.00"}
    assert log.payload_depois["desconto"] == "10.00"
    assert log.detalhes["autorizado_por_id"] == str(gestor.id)


@pytest.mark.asyncio
async def test_autorizacao_com_pin_errado_ou_por_nao_gestor_e_negada(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.usuario(Papel.BALCONISTA, email="colega@eletrocar.com.br", pin="1111")
    await cenario.usuario(Papel.ADMIN, email="gestor@eletrocar.com.br", pin="4321")
    await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=5, preco_venda="100.00")

    for autorizacao in (
        AutorizacaoGerencialDTO(identificador_gestor="gestor@eletrocar.com.br", pin="0000"),
        AutorizacaoGerencialDTO(identificador_gestor="colega@eletrocar.com.br", pin="1111"),
    ):
        with pytest.raises((CredenciaisInvalidasException, AutorizacaoGerencialNecessariaException)):
            await _use_case(cenario).executar(RealizarVendaInputDTO(
                operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)],
                desconto_percentual=Decimal("10"), forma_pagamento=FormaPagamento.DINHEIRO,
                autorizacao=autorizacao
            ))


@pytest.mark.asyncio
async def test_alteracao_de_preco_exige_alcada_e_gera_log_antes_depois(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=5, preco_venda="100.00")
    item = ItemVendaInputDTO(peca_id=peca.id, quantidade=1, preco_unitario_customizado=Decimal("80.00"))

    with pytest.raises(AutorizacaoGerencialNecessariaException):
        await _use_case(cenario).executar(RealizarVendaInputDTO(
            operador_id=operador.id, itens=[item], forma_pagamento=FormaPagamento.DINHEIRO
        ))

    # Administrador (ou dono multi-papel) tem alçada própria
    dono = await cenario.usuario(Papel.ADMIN, Papel.BALCONISTA)
    output = await _use_case(cenario).executar(RealizarVendaInputDTO(
        operador_id=dono.id, itens=[item], forma_pagamento=FormaPagamento.DINHEIRO
    ))
    assert output.valor_total == Decimal("80.00")
    log = next(l for l in cenario.auditoria.logs if l.acao == "PRECO_ALTERADO_NA_VENDA")
    assert log.payload_antes["preco_unitario"] == "100.00"
    assert log.payload_depois["preco_unitario"] == "80.00"


@pytest.mark.asyncio
async def test_venda_pix_exige_cobranca_liquidada_com_valor_exato(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    caixa = await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=5, preco_venda="489.00")
    pendente = await cenario.cobranca_pix("489.00", liquidada=False)
    valor_errado = await cenario.cobranca_pix("400.00")
    correta = await cenario.cobranca_pix("489.00")

    def _dto(cobranca):
        return RealizarVendaInputDTO(
            operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)],
            forma_pagamento=FormaPagamento.PIX, cobranca_pix_id=cobranca.id
        )

    for invalida in (pendente, valor_errado):
        with pytest.raises(RegraNegocioException):
            await _use_case(cenario).executar(_dto(invalida))

    output = await _use_case(cenario).executar(_dto(correta))
    assert (await cenario.cobrancas.buscar_por_id(correta.id)).referencia_uso == output.numero_venda
    assert caixa.calcular_total_por_forma_pagamento()[FormaPagamento.PIX] == Decimal("489.00")

    # A mesma cobrança não quita duas vendas
    with pytest.raises(RegraNegocioException):
        await _use_case(cenario).executar(_dto(correta))


@pytest.mark.asyncio
async def test_venda_faturada_gera_conta_a_receber_e_nao_entra_no_caixa(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    caixa = await cenario.caixa_aberto(operador.id, saldo="100.00")
    cliente = await cenario.cliente()
    peca = await cenario.peca(estoque=5, preco_venda="250.00")

    output = await _use_case(cenario).executar(RealizarVendaInputDTO(
        operador_id=operador.id, cliente_id=cliente.id,
        itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=2)],
        forma_pagamento=FormaPagamento.FATURADO
    ))

    titulos = await cenario.titulos.listar(tipo=TipoTitulo.RECEBER)
    assert len(titulos) == 1
    assert titulos[0].valor == Decimal("500.00")
    assert titulos[0].categoria == CategoriaTitulo.VENDA_A_PRAZO
    assert titulos[0].venda_id == output.id
    assert titulos[0].cliente_id == cliente.id
    assert caixa.movimentacoes == []


@pytest.mark.asyncio
async def test_venda_faturada_exige_cliente(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    peca = await cenario.peca(estoque=5)
    with pytest.raises(RegraNegocioException):
        await _use_case(cenario).executar(RealizarVendaInputDTO(
            operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)],
            forma_pagamento=FormaPagamento.BOLETO
        ))


@pytest.mark.asyncio
async def test_balconista_consulta_somente_as_proprias_vendas(cenario: Cenario):
    from src.application.use_cases.consultar_vendas_use_case import ConsultarVendasUseCase
    carlos = await cenario.usuario(Papel.BALCONISTA)
    juliana = await cenario.usuario(Papel.BALCONISTA)
    admin = await cenario.usuario(Papel.ADMIN)
    await cenario.caixa_aberto(carlos.id)
    peca = await cenario.peca(estoque=10)
    for operador in (carlos, juliana):
        await _use_case(cenario).executar(RealizarVendaInputDTO(
            operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)],
            forma_pagamento=FormaPagamento.DINHEIRO
        ))

    consulta = ConsultarVendasUseCase(cenario.vendas)
    assert [v.operador_id for v in await consulta.listar(carlos)] == [carlos.id]
    assert len(await consulta.listar(admin)) == 2
