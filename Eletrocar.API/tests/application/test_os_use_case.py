"""
Teste dos Use Cases de Ordem de Serviço (TDD).
RF15: peças alocadas são reservadas e baixadas automaticamente na finalização da OS;
cancelamento libera a reserva; faturamento registra no caixa ou gera conta a receber.
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.value_objects.enums import (
    Papel, StatusOS, FormaPagamento, TipoMovimentacaoCaixa, TipoTitulo, CategoriaTitulo
)
from src.domain.exceptions.domain_exceptions import (
    EntidadeNaoEncontradaException,
    EstoqueInsuficienteException,
    RegraNegocioException,
    CaixaFechadoException,
    AutorizacaoGerencialNecessariaException,
)
from src.application.dtos.os_dtos import (
    CriarOSBalcaoInputDTO,
    AtualizarStatusOSInputDTO,
    AlocarPecaOSInputDTO,
    AdicionarServicoOSInputDTO,
    AplicarDescontoOSInputDTO,
    FaturarOSInputDTO,
)
from src.application.dtos.venda_dtos import AutorizacaoGerencialDTO
from src.application.use_cases.gerenciar_os_use_case import GerenciarOrdemServicoUseCase
from src.application.use_cases.faturar_os_use_case import FaturarOrdemServicoUseCase
from src.application.use_cases.aplicar_desconto_os_use_case import AplicarDescontoOSUseCase
from tests.application.conftest import Cenario


def _os_uc(c: Cenario) -> GerenciarOrdemServicoUseCase:
    return GerenciarOrdemServicoUseCase(c.ordens, c.clientes, c.pecas, c.auditoria)


def _faturar_uc(c: Cenario) -> FaturarOrdemServicoUseCase:
    return FaturarOrdemServicoUseCase(c.ordens, c.clientes, c.caixas, c.titulos, c.cobrancas, c.auditoria, prazo_faturado_dias=30)


async def _abrir(c: Cenario):
    usuario = await c.usuario(Papel.ELETRICISTA)
    cliente = await c.cliente()
    os = await _os_uc(c).abrir_os_balcao(CriarOSBalcaoInputDTO(
        usuario_id=usuario.id, cliente_id=cliente.id, carro_id=cliente.carros[0].id,
        sintomas="Motor de partida estalando"
    ))
    return os, usuario


async def _levar_ate(c: Cenario, os_id, usuario_id, *status: StatusOS):
    for s in status:
        await _os_uc(c).atualizar_status(AtualizarStatusOSInputDTO(os_id=os_id, novo_status=s.value, usuario_id=usuario_id))


FLUXO_ATE_FINALIZAR = (
    StatusOS.ORCAMENTO_PENDENTE, StatusOS.APROVADO, StatusOS.EM_EXECUCAO,
    StatusOS.TESTES_ELETRICOS, StatusOS.FINALIZADO
)


@pytest.mark.asyncio
async def test_abertura_da_os_valida_carro_do_cliente_e_audita(cenario: Cenario):
    os, _ = await _abrir(cenario)
    assert os.status == StatusOS.TRIAGEM.value
    assert os.numero_os.startswith("OS-")
    assert "OS_ABERTA" in cenario.auditoria.acoes()

    outro_cliente = await cenario.cliente()
    with pytest.raises(EntidadeNaoEncontradaException):
        await _os_uc(cenario).abrir_os_balcao(CriarOSBalcaoInputDTO(
            usuario_id=uuid.uuid4(), cliente_id=outro_cliente.id, carro_id=uuid.uuid4(), sintomas="x"
        ))


@pytest.mark.asyncio
async def test_alocar_peca_reserva_e_finalizacao_baixa_estoque(cenario: Cenario):
    os, usuario = await _abrir(cenario)
    peca = await cenario.peca(estoque=5, preco_venda="115.00", preco_custo="65.00")

    alocada = await _os_uc(cenario).alocar_peca(AlocarPecaOSInputDTO(
        os_id=os.id, peca_id=peca.id, quantidade=2, usuario_id=usuario.id
    ))
    assert alocada.valor_pecas == Decimal("230.00")
    peca_reservada = await cenario.pecas.buscar_por_id(peca.id)
    assert (peca_reservada.estoque_atual, peca_reservada.estoque_reservado) == (5, 2)
    assert cenario.pecas.bloqueios == [peca.id]

    await _levar_ate(cenario, os.id, usuario.id, *FLUXO_ATE_FINALIZAR)

    peca_final = await cenario.pecas.buscar_por_id(peca.id)
    assert (peca_final.estoque_atual, peca_final.estoque_reservado) == (3, 0)
    os_final = await cenario.ordens.buscar_por_id(os.id)
    assert os_final.custo_pecas == Decimal("130.00")


@pytest.mark.asyncio
async def test_alocar_peca_sem_saldo_disponivel_falha_sem_alterar_os(cenario: Cenario):
    os, usuario = await _abrir(cenario)
    peca = await cenario.peca(estoque=1)
    with pytest.raises(EstoqueInsuficienteException):
        await _os_uc(cenario).alocar_peca(AlocarPecaOSInputDTO(os_id=os.id, peca_id=peca.id, quantidade=2, usuario_id=usuario.id))
    assert (await cenario.ordens.buscar_por_id(os.id)).itens == []


@pytest.mark.asyncio
async def test_cancelamento_da_os_libera_reserva(cenario: Cenario):
    os, usuario = await _abrir(cenario)
    peca = await cenario.peca(estoque=5)
    await _os_uc(cenario).alocar_peca(AlocarPecaOSInputDTO(os_id=os.id, peca_id=peca.id, quantidade=3, usuario_id=usuario.id))

    await _levar_ate(cenario, os.id, usuario.id, StatusOS.CANCELADO)

    peca_final = await cenario.pecas.buscar_por_id(peca.id)
    assert (peca_final.estoque_atual, peca_final.estoque_reservado) == (5, 0)
    log = cenario.auditoria.logs[-1]
    assert log.acao == "OS_STATUS_ATUALIZADO"
    assert log.payload_antes == {"status": "TRIAGEM"}
    assert log.payload_depois == {"status": "CANCELADO"}


@pytest.mark.asyncio
async def test_status_entregue_so_por_faturamento(cenario: Cenario):
    os, usuario = await _abrir(cenario)
    await _levar_ate(cenario, os.id, usuario.id, *FLUXO_ATE_FINALIZAR)
    with pytest.raises(RegraNegocioException):
        await _levar_ate(cenario, os.id, usuario.id, StatusOS.ENTREGUE)


@pytest.mark.asyncio
async def test_status_inexistente_e_rejeitado(cenario: Cenario):
    os, usuario = await _abrir(cenario)
    with pytest.raises(RegraNegocioException):
        await _os_uc(cenario).atualizar_status(AtualizarStatusOSInputDTO(os_id=os.id, novo_status="XPTO", usuario_id=usuario.id))


async def _os_finalizada_com_valor(c: Cenario):
    os, usuario = await _abrir(c)
    peca = await c.peca(estoque=5, preco_venda="200.00", preco_custo="120.00")
    await _os_uc(c).alocar_peca(AlocarPecaOSInputDTO(os_id=os.id, peca_id=peca.id, quantidade=1, usuario_id=usuario.id))
    await _os_uc(c).adicionar_servico(AdicionarServicoOSInputDTO(os_id=os.id, descricao="Revisão do motor de partida", valor=Decimal("150.00")))
    await _levar_ate(c, os.id, usuario.id, *FLUXO_ATE_FINALIZAR)
    return os, usuario


@pytest.mark.asyncio
async def test_faturar_os_registra_entrada_no_caixa(cenario: Cenario):
    os, _ = await _os_finalizada_com_valor(cenario)
    balconista = await cenario.usuario(Papel.BALCONISTA)
    caixa = await cenario.caixa_aberto(balconista.id)

    faturada = await _faturar_uc(cenario).executar(FaturarOSInputDTO(
        os_id=os.id, forma_pagamento=FormaPagamento.CARTAO_DEBITO, operador_id=balconista.id
    ))

    assert faturada.status == StatusOS.ENTREGUE.value
    mov = caixa.movimentacoes[-1]
    assert (mov.tipo, mov.valor, mov.forma_pagamento) == (
        TipoMovimentacaoCaixa.ENTRADA_OS, Decimal("350.00"), FormaPagamento.CARTAO_DEBITO
    )
    assert "OS_FATURADA" in cenario.auditoria.acoes()


@pytest.mark.asyncio
async def test_faturar_os_exige_caixa_aberto_para_pagamento_a_vista(cenario: Cenario):
    os, usuario = await _os_finalizada_com_valor(cenario)
    with pytest.raises(CaixaFechadoException):
        await _faturar_uc(cenario).executar(FaturarOSInputDTO(
            os_id=os.id, forma_pagamento=FormaPagamento.DINHEIRO, operador_id=usuario.id
        ))
    assert (await cenario.ordens.buscar_por_id(os.id)).status == StatusOS.FINALIZADO


@pytest.mark.asyncio
async def test_faturar_os_para_frota_gera_conta_a_receber(cenario: Cenario):
    os, usuario = await _os_finalizada_com_valor(cenario)
    await _faturar_uc(cenario).executar(FaturarOSInputDTO(
        os_id=os.id, forma_pagamento=FormaPagamento.FATURADO, operador_id=usuario.id
    ))
    titulos = await cenario.titulos.listar(tipo=TipoTitulo.RECEBER)
    assert len(titulos) == 1
    assert titulos[0].categoria == CategoriaTitulo.SERVICO_A_PRAZO
    assert titulos[0].ordem_servico_id == os.id
    assert titulos[0].valor == Decimal("350.00")


@pytest.mark.asyncio
async def test_faturar_os_com_pix_consome_cobranca_liquidada(cenario: Cenario):
    os, usuario = await _os_finalizada_com_valor(cenario)
    await cenario.caixa_aberto(usuario.id)
    cobranca = await cenario.cobranca_pix("350.00")
    await _faturar_uc(cenario).executar(FaturarOSInputDTO(
        os_id=os.id, forma_pagamento=FormaPagamento.PIX, operador_id=usuario.id, cobranca_pix_id=cobranca.id
    ))
    assert (await cenario.cobrancas.buscar_por_id(cobranca.id)).referencia_uso == os.numero_os


@pytest.mark.asyncio
async def test_desconto_na_os_respeita_alcada_gerencial(cenario: Cenario):
    os, _ = await _os_finalizada_com_valor(cenario)  # valor bruto 350,00
    balconista = await cenario.usuario(Papel.BALCONISTA)
    gestor = await cenario.usuario(Papel.ADMIN, email="gestor@eletrocar.com.br", pin="4321")
    uc = AplicarDescontoOSUseCase(cenario.ordens, cenario.clientes, cenario.usuarios, cenario.validador, cenario.auditoria,
                                  limite_desconto_percentual=Decimal("5"))

    # 17,50 = 5% -> dentro da alçada
    await uc.executar(AplicarDescontoOSInputDTO(os_id=os.id, desconto=Decimal("17.50"), operador_id=balconista.id))

    with pytest.raises(AutorizacaoGerencialNecessariaException):
        await uc.executar(AplicarDescontoOSInputDTO(os_id=os.id, desconto=Decimal("50.00"), operador_id=balconista.id))

    resultado = await uc.executar(AplicarDescontoOSInputDTO(
        os_id=os.id, desconto=Decimal("50.00"), operador_id=balconista.id,
        autorizacao=AutorizacaoGerencialDTO(identificador_gestor="gestor@eletrocar.com.br", pin="4321")
    ))
    assert resultado.valor_total == Decimal("300.00")
    log = cenario.auditoria.logs[-1]
    assert log.acao == "DESCONTO_APLICADO"
    assert log.payload_antes == {"desconto": "17.50"}
    assert log.detalhes["autorizado_por_id"] == str(gestor.id)
