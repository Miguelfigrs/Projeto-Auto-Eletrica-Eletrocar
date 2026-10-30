"""
Testes de integração: integridade transacional do estoque (RNF05).
- test_atomic_stock_deduction: duas vendas simultâneas da última unidade -> apenas uma vence
- test_acid_transaction_rollback: falha após a baixa desfaz estoque, venda e caixa
"""
import asyncio
from decimal import Decimal
import uuid
import pytest
from sqlalchemy import text
from src.domain.entities.peca import Peca
from src.domain.entities.caixa import CaixaDiario
from src.domain.value_objects.enums import Papel, FormaPagamento
from src.domain.exceptions.domain_exceptions import ConflitoConcorrenciaException, EstoqueInsuficienteException
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy
from src.adapters.repositories.caixa_repository_sqlalchemy import CaixaRepositorySQLAlchemy
from src.adapters.repositories.venda_balcao_repository_sqlalchemy import VendaBalcaoRepositorySQLAlchemy
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.adapters.repositories.financeiro_repository_sqlalchemy import (
    TituloFinanceiroRepositorySQLAlchemy, CobrancaPixRepositorySQLAlchemy
)
from src.application.services.validador_alcada import ValidadorAlcadaGerencial
from src.application.use_cases.realizar_venda_use_case import RealizarVendaBalcaoUseCase
from src.application.dtos.venda_dtos import RealizarVendaInputDTO, ItemVendaInputDTO
from src.adapters.controllers.dependencies import get_password_hasher, get_limitador
from tests.fakes.fake_repositories import FakeAuditoriaRepository
from tests.integration.conftest import USANDO_POSTGRES


async def _ultima_unidade(fabrica) -> uuid.UUID:
    peca = Peca(id=uuid.uuid4(), codigo_barras="7899999999999", sku="ULTIMA-UN", descricao="Alternador recondicionado",
                preco_custo=Decimal("300.00"), preco_venda=Decimal("500.00"), estoque_atual=1)
    async with fabrica() as session:
        await PecaRepositorySQLAlchemy(session).salvar(peca)
        await session.commit()
    return peca.id


def _venda_uc(session, audit_repo=None) -> RealizarVendaBalcaoUseCase:
    from src.adapters.repositories.auditoria_repository_sqlalchemy import AuditoriaRepositorySQLAlchemy
    return RealizarVendaBalcaoUseCase(
        PecaRepositorySQLAlchemy(session), VendaBalcaoRepositorySQLAlchemy(session), CaixaRepositorySQLAlchemy(session),
        audit_repo or AuditoriaRepositorySQLAlchemy(session), UsuarioRepositorySQLAlchemy(session),
        TituloFinanceiroRepositorySQLAlchemy(session), CobrancaPixRepositorySQLAlchemy(session),
        ValidadorAlcadaGerencial(UsuarioRepositorySQLAlchemy(session), get_password_hasher(), get_limitador()),
    )


async def test_atomic_stock_deduction(fabrica_teste):
    """Bloqueio otimista: a segunda transação que leu o mesmo saldo é rejeitada ao gravar."""
    peca_id = await _ultima_unidade(fabrica_teste)

    async with fabrica_teste() as sessao_a, fabrica_teste() as sessao_b:
        repo_a, repo_b = PecaRepositorySQLAlchemy(sessao_a), PecaRepositorySQLAlchemy(sessao_b)
        peca_a = await repo_a.buscar_por_id(peca_id)
        peca_b = await repo_b.buscar_por_id(peca_id)  # ambas leem estoque = 1

        peca_a.baixar_estoque(1)
        await repo_a.salvar(peca_a)
        await sessao_a.commit()

        peca_b.baixar_estoque(1)
        with pytest.raises(ConflitoConcorrenciaException):
            await repo_b.salvar(peca_b)
        await sessao_b.rollback()

    async with fabrica_teste() as session:
        final = await PecaRepositorySQLAlchemy(session).buscar_por_id(peca_id)
    assert final.estoque_atual == 0


@pytest.mark.skipif(not USANDO_POSTGRES, reason="SELECT ... FOR UPDATE concorrente exige PostgreSQL (TEST_POSTGRES_URL)")
async def test_vendas_simultaneas_da_ultima_unidade_no_postgres(fabrica_teste, criar_usuario):
    """Com FOR UPDATE a segunda venda espera a primeira e enxerga o saldo zerado."""
    operador, _ = await criar_usuario(Papel.BALCONISTA)
    peca_id = await _ultima_unidade(fabrica_teste)
    async with fabrica_teste() as session:
        await CaixaRepositorySQLAlchemy(session).salvar(CaixaDiario(id=uuid.uuid4(), operador_id=operador.id))
        await session.commit()

    async def vender():
        async with fabrica_teste() as session:
            try:
                await _venda_uc(session).executar(RealizarVendaInputDTO(
                    operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca_id, quantidade=1)],
                    forma_pagamento=FormaPagamento.DINHEIRO
                ))
                await session.commit()
                return "ok"
            except (EstoqueInsuficienteException, ConflitoConcorrenciaException):
                await session.rollback()
                return "recusada"

    resultados = await asyncio.gather(vender(), vender())
    assert sorted(resultados) == ["ok", "recusada"]


async def test_acid_transaction_rollback(fabrica_teste, criar_usuario):
    """Falha no último passo (auditoria) desfaz baixa de estoque, venda e entrada no caixa."""
    operador, _ = await criar_usuario(Papel.BALCONISTA)
    peca_id = await _ultima_unidade(fabrica_teste)
    caixa_id = uuid.uuid4()
    async with fabrica_teste() as session:
        await CaixaRepositorySQLAlchemy(session).salvar(CaixaDiario(id=caixa_id, operador_id=operador.id))
        await session.commit()

    class AuditoriaComFalha(FakeAuditoriaRepository):
        async def registrar(self, log):
            raise RuntimeError("Falha simulada de infraestrutura")

    async with fabrica_teste() as session:
        with pytest.raises(RuntimeError):
            try:
                await _venda_uc(session, AuditoriaComFalha()).executar(RealizarVendaInputDTO(
                    operador_id=operador.id, itens=[ItemVendaInputDTO(peca_id=peca_id, quantidade=1)],
                    forma_pagamento=FormaPagamento.DINHEIRO
                ))
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async with fabrica_teste() as session:
        peca = await PecaRepositorySQLAlchemy(session).buscar_por_id(peca_id)
        caixa = await CaixaRepositorySQLAlchemy(session).buscar_por_id(caixa_id)
        vendas = (await session.execute(text("SELECT COUNT(*) FROM vendas_balcao"))).scalar_one()
    assert peca.estoque_atual == 1
    assert caixa.movimentacoes == []
    assert vendas == 0


async def test_banco_rejeita_estoque_negativo(fabrica_teste):
    """Defesa em profundidade: CHECK constraint impede saldo negativo mesmo fora do domínio."""
    peca_id = await _ultima_unidade(fabrica_teste)
    async with fabrica_teste() as session:
        with pytest.raises(Exception):
            await session.execute(text("UPDATE pecas SET estoque_atual = -1 WHERE sku = 'ULTIMA-UN'"))
            await session.commit()
        await session.rollback()


async def test_numeracao_sequencial_atomica(fabrica_teste):
    from src.adapters.repositories.base import proximo_numero
    async with fabrica_teste() as session:
        numeros = [await proximo_numero(session, "OS") for _ in range(3)]
        await session.commit()
    sufixos = [int(n.rsplit("-", 1)[1]) for n in numeros]
    assert sufixos == [sufixos[0], sufixos[0] + 1, sufixos[0] + 2]
    assert all(n.startswith("OS-") for n in numeros)
