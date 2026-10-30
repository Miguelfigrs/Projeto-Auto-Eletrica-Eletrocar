"""
Teste do Use Case: EmitirComprovanteUseCase (TDD).
Recibo de venda e orçamento de OS para impressora térmica (80mm/58mm) e envio via WhatsApp (RF22).
"""
import pytest
import uuid
from decimal import Decimal
from urllib.parse import unquote
from src.domain.value_objects.enums import Papel, FormaPagamento
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.application.dtos.venda_dtos import ItemVendaInputDTO, RealizarVendaInputDTO
from src.application.dtos.os_dtos import CriarOSBalcaoInputDTO, AlocarPecaOSInputDTO, AdicionarServicoOSInputDTO
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from src.application.use_cases.gerenciar_os_use_case import GerenciarOrdemServicoUseCase
from src.application.use_cases.emitir_comprovante_use_case import EmitirComprovanteUseCase
from tests.application.conftest import Cenario


def _uc(c: Cenario) -> EmitirComprovanteUseCase:
    return EmitirComprovanteUseCase(c.vendas, c.ordens, c.clientes, nome_empresa="AUTO ELETRICA ELETROCAR")


@pytest.mark.asyncio
async def test_recibo_de_venda_respeita_largura_da_bobina(cenario: Cenario):
    operador = await cenario.usuario(Papel.BALCONISTA)
    await cenario.caixa_aberto(operador.id)
    cliente = await cenario.cliente()
    peca = await cenario.peca(descricao="Bateria Automotiva Moura 60Ah M60GD com garantia estendida", preco_venda="489.00")
    venda = await RealizarVendaBalcaoUseCase(
        cenario.pecas, cenario.vendas, cenario.caixas, cenario.auditoria, cenario.usuarios,
        cenario.titulos, cenario.cobrancas, cenario.validador, Decimal("5"), 30
    ).executar(RealizarVendaInputDTO(
        operador_id=operador.id, cliente_id=cliente.id,
        itens=[ItemVendaInputDTO(peca_id=peca.id, quantidade=1)], forma_pagamento=FormaPagamento.PIX
    ))

    for largura_mm, colunas in ((80, 48), (58, 32)):
        recibo = await _uc(cenario).recibo_venda(venda.id, largura_mm=largura_mm)
        assert all(len(linha) <= colunas for linha in recibo.linhas)
        assert recibo.linhas[0].strip() == "AUTO ELETRICA ELETROCAR"
        assert any(venda.numero_venda in l for l in recibo.linhas)
        assert any("489,00" in l for l in recibo.linhas)

    assert recibo.link_whatsapp.startswith("https://wa.me/5511987651122?text=")
    assert venda.numero_venda in unquote(recibo.link_whatsapp)


@pytest.mark.asyncio
async def test_orcamento_de_os_lista_pecas_e_servicos(cenario: Cenario):
    eletricista = await cenario.usuario(Papel.ELETRICISTA)
    cliente = await cenario.cliente()
    peca = await cenario.peca(descricao="Bendix Valeo 9 dentes", preco_venda="115.00")
    os_uc = GerenciarOrdemServicoUseCase(cenario.ordens, cenario.clientes, cenario.pecas, cenario.auditoria)
    os = await os_uc.abrir_os_balcao(CriarOSBalcaoInputDTO(
        usuario_id=eletricista.id, cliente_id=cliente.id, carro_id=cliente.carros[0].id, sintomas="Não dá partida"
    ))
    await os_uc.alocar_peca(AlocarPecaOSInputDTO(os_id=os.id, peca_id=peca.id, quantidade=1, usuario_id=eletricista.id))
    await os_uc.adicionar_servico(AdicionarServicoOSInputDTO(os_id=os.id, descricao="Revisão motor de partida", valor=Decimal("380.00")))

    orcamento = await _uc(cenario).orcamento_os(os.id, largura_mm=80)

    texto = "\n".join(orcamento.linhas)
    assert "ORCAMENTO" in texto
    assert os.numero_os in texto
    assert "Bendix" in texto
    assert "Revisão motor de partida" in texto
    assert "495,00" in texto


@pytest.mark.asyncio
async def test_largura_de_bobina_invalida(cenario: Cenario):
    with pytest.raises(RegraNegocioException):
        await _uc(cenario).recibo_venda(uuid.uuid4(), largura_mm=100)
