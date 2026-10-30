"""
Cenário compartilhado dos testes de casos de uso (repositórios e serviços falsos em memória).
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import pytest
from src.domain.entities.usuario import Usuario
from src.domain.entities.peca import Peca
from src.domain.entities.caixa import CaixaDiario
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.cobranca_pix import CobrancaPix
from src.domain.value_objects.enums import Papel
from src.application.services.validador_alcada import ValidadorAlcadaGerencial
from tests.fakes.fake_repositories import (
    FakeUsuarioRepository,
    FakeClienteRepository,
    FakePecaRepository,
    FakeOrdemServicoRepository,
    FakeVendaBalcaoRepository,
    FakeCaixaRepository,
    FakeTituloFinanceiroRepository,
    FakeCobrancaPixRepository,
    FakeAuditoriaRepository,
)
from tests.fakes.fake_servicos import FakePasswordHasher, FakeLimitadorTentativas

AGORA = datetime(2026, 10, 13, 10, 0, 0)


@dataclass
class Cenario:
    usuarios: FakeUsuarioRepository = field(default_factory=FakeUsuarioRepository)
    clientes: FakeClienteRepository = field(default_factory=FakeClienteRepository)
    pecas: FakePecaRepository = field(default_factory=FakePecaRepository)
    ordens: FakeOrdemServicoRepository = field(default_factory=FakeOrdemServicoRepository)
    vendas: FakeVendaBalcaoRepository = field(default_factory=FakeVendaBalcaoRepository)
    caixas: FakeCaixaRepository = field(default_factory=FakeCaixaRepository)
    titulos: FakeTituloFinanceiroRepository = field(default_factory=FakeTituloFinanceiroRepository)
    cobrancas: FakeCobrancaPixRepository = field(default_factory=FakeCobrancaPixRepository)
    auditoria: FakeAuditoriaRepository = field(default_factory=FakeAuditoriaRepository)
    hasher: FakePasswordHasher = field(default_factory=FakePasswordHasher)
    limitador: FakeLimitadorTentativas = field(default_factory=FakeLimitadorTentativas)

    @property
    def validador(self) -> ValidadorAlcadaGerencial:
        return ValidadorAlcadaGerencial(self.usuarios, self.hasher, self.limitador)

    async def usuario(self, *papeis: Papel, email: str = None, pin: str = None) -> Usuario:
        usuario = Usuario(
            id=uuid.uuid4(),
            nome=f"Usuário {'/'.join(p.value for p in papeis)}",
            email=email or f"{uuid.uuid4().hex[:8]}@eletrocar.com.br",
            senha_hash="x",
            papeis=set(papeis),
            pin_hash=self.hasher.hash(pin) if pin else None,
        )
        await self.usuarios.salvar(usuario)
        return usuario

    async def peca(self, estoque: int = 10, preco_venda: str = "180.00", preco_custo: str = "100.00", **kw) -> Peca:
        dados = dict(
            id=uuid.uuid4(),
            codigo_barras=kw.pop("codigo_barras", str(7890000000000 + len(self.pecas.pecas))),
            sku=kw.pop("sku", f"SKU-{len(self.pecas.pecas)}"),
            descricao=kw.pop("descricao", "Regulador Bosch 12V"),
            preco_custo=Decimal(preco_custo),
            preco_venda=Decimal(preco_venda),
            estoque_atual=estoque,
            estoque_minimo=2,
        )
        dados.update(kw)
        peca = Peca(**dados)
        await self.pecas.salvar(peca)
        return peca

    async def caixa_aberto(self, operador_id: uuid.UUID = None, saldo: str = "100.00") -> CaixaDiario:
        caixa = CaixaDiario(id=uuid.uuid4(), operador_id=operador_id or uuid.uuid4(), saldo_inicial=Decimal(saldo))
        await self.caixas.salvar(caixa)
        return caixa

    async def cliente(self) -> Cliente:
        cliente = Cliente(id=uuid.uuid4(), nome="Transportadora TransRápido", telefone="(11) 98765-1122")
        cliente.adicionar_carro(Carro(id=uuid.uuid4(), cliente_id=cliente.id, modelo="Sprinter", marca="Mercedes"))
        await self.clientes.salvar(cliente)
        return cliente

    async def cobranca_pix(self, valor: str, liquidada: bool = True) -> CobrancaPix:
        cobranca = CobrancaPix(
            id=uuid.uuid4(), txid="ELC" + uuid.uuid4().hex[:29], valor=Decimal(valor),
            copia_e_cola="000201", criada_em=AGORA, expira_em=AGORA + timedelta(minutes=30)
        )
        if liquidada:
            cobranca.liquidar(Decimal(valor), "E" + uuid.uuid4().hex, AGORA)
        await self.cobrancas.salvar(cobranca)
        return cobranca


@pytest.fixture
def cenario() -> Cenario:
    return Cenario()
