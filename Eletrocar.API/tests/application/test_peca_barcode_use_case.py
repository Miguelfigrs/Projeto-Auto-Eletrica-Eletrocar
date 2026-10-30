"""
Testes dos Use Cases de Peças e Estoque (TDD).
Leitor de código de barras, busca por código original/aplicação veicular (RF06/RF07),
cadastro, alteração de preço auditada, entrada/ajuste de estoque e sugestão de compra (RF23).
"""
import pytest
from decimal import Decimal
import uuid
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException, RegraNegocioException
from src.application.dtos.peca_dtos import (
    CriarPecaInputDTO, AtualizarPecaInputDTO, EntradaEstoqueInputDTO, AjusteEstoqueInputDTO
)
from src.application.use_cases.buscar_peca_barcode_use_case import BuscarPecaPorCodigoBarrasUseCase
from src.application.use_cases.gerenciar_pecas_use_case import GerenciarPecasUseCase
from tests.application.conftest import Cenario


def _uc(c: Cenario) -> GerenciarPecasUseCase:
    return GerenciarPecasUseCase(c.pecas, c.auditoria)


@pytest.mark.asyncio
async def test_buscar_peca_por_leitor_codigo_barras(cenario: Cenario):
    peca = await cenario.peca(codigo_barras="7891049281023")
    # Leitores HID enviam \r\n ou espaços no final
    resultado = await BuscarPecaPorCodigoBarrasUseCase(cenario.pecas).executar(" 7891049281023\r\n")
    assert resultado.id == peca.id


@pytest.mark.asyncio
async def test_buscar_peca_por_sku_quando_leitor_le_etiqueta_interna(cenario: Cenario):
    peca = await cenario.peca(sku="ELC-10492")
    resultado = await BuscarPecaPorCodigoBarrasUseCase(cenario.pecas).executar("elc-10492")
    assert resultado.id == peca.id


@pytest.mark.asyncio
async def test_buscar_peca_inexistente_lanca_excecao(cenario: Cenario):
    with pytest.raises(EntidadeNaoEncontradaException):
        await BuscarPecaPorCodigoBarrasUseCase(cenario.pecas).executar("0000000000000")


@pytest.mark.asyncio
async def test_busca_por_codigo_original_e_aplicacao_veicular(cenario: Cenario):
    alternador = await cenario.peca(
        descricao="Alternador Bosch 12V 90A", codigo_original_fabricante="f000bl0662",
        fabricante="Bosch", aplicacao_veicular="Gol G5 1.6, Fox 1.6"
    )
    await cenario.peca(descricao="Alternador Valeo 110A", aplicacao_veicular="Onix 1.0")

    por_aplicacao = await _uc(cenario).buscar_por_termo("alternador gol 1.6")
    assert [p.id for p in por_aplicacao] == [alternador.id]

    por_codigo_original = await _uc(cenario).buscar_por_termo("F000BL0662")
    assert [p.id for p in por_codigo_original] == [alternador.id]
    assert por_codigo_original[0].codigo_original_fabricante == "F000BL0662"


@pytest.mark.asyncio
async def test_cadastro_rejeita_codigo_de_barras_ou_sku_duplicado(cenario: Cenario):
    executor = uuid.uuid4()
    dto = CriarPecaInputDTO(codigo_barras="7891234567890", sku="LAMP-H4", descricao="Lâmpada H4",
                            preco_custo=Decimal("25.00"), preco_venda=Decimal("45.00"), estoque_atual=10)
    criada = await _uc(cenario).cadastrar_peca(dto, executor_id=executor)
    assert criada.sku == "LAMP-H4"
    assert "PECA_CADASTRADA" in cenario.auditoria.acoes()

    with pytest.raises(RegraNegocioException):
        await _uc(cenario).cadastrar_peca(dto, executor_id=executor)


@pytest.mark.asyncio
async def test_alteracao_de_preco_gera_log_imutavel_antes_depois(cenario: Cenario):
    peca = await cenario.peca(preco_venda="185.00", preco_custo="110.00")
    admin_id = uuid.uuid4()

    atualizada = await _uc(cenario).atualizar_peca(AtualizarPecaInputDTO(
        peca_id=peca.id, executor_id=admin_id, preco_venda=Decimal("199.90"), localizacao="Prateleira C1"
    ))

    assert atualizada.preco_venda == Decimal("199.90")
    log = next(l for l in cenario.auditoria.logs if l.acao == "PRECO_ALTERADO")
    assert log.usuario_id == admin_id
    assert log.payload_antes == {"preco_custo": "110.00", "preco_venda": "185.00"}
    assert log.payload_depois == {"preco_custo": "110.00", "preco_venda": "199.90"}


@pytest.mark.asyncio
async def test_entrada_e_ajuste_de_estoque_sao_auditados(cenario: Cenario):
    peca = await cenario.peca(estoque=5)
    admin_id = uuid.uuid4()

    entrada = await _uc(cenario).registrar_entrada(EntradaEstoqueInputDTO(
        peca_id=peca.id, quantidade=10, executor_id=admin_id, observacao="NF 1234 Bosch"
    ))
    assert entrada.estoque_atual == 15

    ajustada = await _uc(cenario).ajustar_estoque(AjusteEstoqueInputDTO(
        peca_id=peca.id, novo_saldo=13, motivo="Inventário mensal: 2 avariadas", executor_id=admin_id
    ))
    assert ajustada.estoque_atual == 13
    log = cenario.auditoria.logs[-1]
    assert log.acao == "ESTOQUE_AJUSTADO"
    assert log.payload_antes == {"estoque_atual": 15}
    assert log.payload_depois == {"estoque_atual": 13}
    assert cenario.pecas.bloqueios == [peca.id, peca.id]

    with pytest.raises(RegraNegocioException):
        await _uc(cenario).ajustar_estoque(AjusteEstoqueInputDTO(
            peca_id=peca.id, novo_saldo=10, motivo="", executor_id=admin_id
        ))


@pytest.mark.asyncio
async def test_sugestao_de_compra_por_giro_medio(cenario: Cenario):
    giro_alto = await cenario.peca(estoque=10, descricao="Relé auxiliar")
    parada = await cenario.peca(estoque=50, descricao="Sirene de ré")
    cenario.pecas.consumo = {giro_alto.id: 90, parada.id: 1}

    sugestoes = await _uc(cenario).sugerir_compra(dias_analise=90, dias_cobertura=30)

    assert [s.peca_id for s in sugestoes] == [giro_alto.id]
    assert sugestoes[0].quantidade_sugerida == 22  # 1/dia x 30 + mínimo 2 - disponível 10
    assert sugestoes[0].giro_medio_diario == Decimal("1.00")
