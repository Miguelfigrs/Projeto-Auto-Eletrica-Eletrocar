"""
Fake Repositories em memória para testes unitários de casos de uso (TDD puro).
Permitem testar as regras de negócio da aplicação sem dependência de banco de dados.
"""
from datetime import date, datetime
from typing import Dict, List, Optional
import copy
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.peca import Peca
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.entities.caixa import CaixaDiario
from src.domain.entities.auditoria import LogAuditoria
from src.domain.entities.sessao import SessaoRefresh
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.entities.cobranca_pix import CobrancaPix
from src.domain.value_objects.enums import (
    StatusCaixa,
    StatusOS,
    StatusVenda,
    StatusTitulo,
    TipoTitulo
)
from src.domain.repositories.interfaces import (
    UsuarioRepositoryInterface,
    SessaoRepositoryInterface,
    ClienteRepositoryInterface,
    PecaRepositoryInterface,
    OrdemServicoRepositoryInterface,
    VendaBalcaoRepositoryInterface,
    CaixaRepositoryInterface,
    TituloFinanceiroRepositoryInterface,
    CobrancaPixRepositoryInterface,
    AuditoriaRepositoryInterface
)


class FakeUsuarioRepository(UsuarioRepositoryInterface):
    def __init__(self):
        self.usuarios: Dict[uuid.UUID, Usuario] = {}

    async def salvar(self, usuario: Usuario) -> Usuario:
        self.usuarios[usuario.id] = usuario
        return usuario

    async def buscar_por_id(self, usuario_id: uuid.UUID) -> Optional[Usuario]:
        return self.usuarios.get(usuario_id)

    async def buscar_por_email(self, email: str) -> Optional[Usuario]:
        for u in self.usuarios.values():
            if u.email == email.strip().lower():
                return u
        return None

    async def buscar_por_login(self, identificador: str) -> Optional[Usuario]:
        ident = identificador.strip().lower()
        for u in self.usuarios.values():
            if u.email == ident or (u.username and u.username == ident):
                return u
        return None

    async def buscar_por_telegram_id(self, telegram_id: str) -> Optional[Usuario]:
        for u in self.usuarios.values():
            if u.telegram_user_id == telegram_id:
                return u
        return None

    async def listar_todos(self) -> List[Usuario]:
        return list(self.usuarios.values())

    async def contar(self) -> int:
        return len(self.usuarios)


class FakeSessaoRepository(SessaoRepositoryInterface):
    def __init__(self):
        self.sessoes: Dict[uuid.UUID, SessaoRefresh] = {}

    async def salvar(self, sessao: SessaoRefresh) -> SessaoRefresh:
        self.sessoes[sessao.id] = sessao
        return sessao

    async def buscar_por_id(self, sessao_id: uuid.UUID) -> Optional[SessaoRefresh]:
        return self.sessoes.get(sessao_id)

    async def revogar_todas_do_usuario(self, usuario_id: uuid.UUID, agora: datetime) -> None:
        for s in self.sessoes.values():
            if s.usuario_id == usuario_id:
                s.revogar(agora)


class FakeClienteRepository(ClienteRepositoryInterface):
    def __init__(self):
        self.clientes: Dict[uuid.UUID, Cliente] = {}

    async def salvar(self, cliente: Cliente) -> Cliente:
        self.clientes[cliente.id] = cliente
        return cliente

    async def buscar_por_id(self, cliente_id: uuid.UUID) -> Optional[Cliente]:
        return self.clientes.get(cliente_id)

    async def buscar_por_cpf_cnpj(self, cpf_cnpj: str) -> Optional[Cliente]:
        for c in self.clientes.values():
            if c.cpf_cnpj == cpf_cnpj:
                return c
        return None

    async def buscar_por_termo(self, termo: str) -> List[Cliente]:
        termo_lower = termo.lower()
        resultado = []
        for c in self.clientes.values():
            if termo_lower in c.nome.lower():
                resultado.append(c)
                continue
            for carro in c.carros:
                if termo_lower in carro.modelo.lower() or (carro.placa and termo_lower in carro.placa.lower()):
                    resultado.append(c)
                    break
        return resultado

    async def buscar_carro_por_placa(self, placa: str) -> Optional[Carro]:
        placa_limpa = placa.upper().replace("-", "")
        for c in self.clientes.values():
            for carro in c.carros:
                if carro.placa and carro.placa == placa_limpa:
                    return carro
        return None


class FakePecaRepository(PecaRepositoryInterface):
    def __init__(self):
        self.pecas: Dict[uuid.UUID, Peca] = {}
        self.bloqueios: List[uuid.UUID] = []  # Ordem em que as linhas foram bloqueadas (FOR UPDATE)
        self.consumo: Dict[uuid.UUID, int] = {}

    async def salvar(self, peca: Peca) -> Peca:
        self.pecas[peca.id] = peca
        return peca

    async def buscar_por_id(self, peca_id: uuid.UUID) -> Optional[Peca]:
        return self.pecas.get(peca_id)

    async def buscar_por_id_para_atualizacao(self, peca_id: uuid.UUID) -> Optional[Peca]:
        self.bloqueios.append(peca_id)
        return self.pecas.get(peca_id)

    async def buscar_por_codigo_barras(self, codigo_barras: str) -> Optional[Peca]:
        for p in self.pecas.values():
            if p.codigo_barras == codigo_barras.strip():
                return p
        return None

    async def buscar_por_sku(self, sku: str) -> Optional[Peca]:
        for p in self.pecas.values():
            if p.sku == sku.strip().upper():
                return p
        return None

    async def buscar_por_termo(self, termo: str) -> List[Peca]:
        termos = termo.lower().split()

        def texto(p: Peca) -> str:
            campos = [p.descricao, p.sku, p.codigo_barras, p.codigo_original_fabricante,
                      p.fabricante, p.aplicacao_veicular]
            return " ".join(c for c in campos if c).lower()

        return [p for p in self.pecas.values() if all(t in texto(p) for t in termos)]

    async def listar_ativas(self) -> List[Peca]:
        return [p for p in self.pecas.values() if p.ativo]

    async def listar_baixo_estoque(self) -> List[Peca]:
        return [p for p in self.pecas.values() if p.esta_abaixo_minimo()]

    async def consumo_por_peca(self, desde: datetime) -> Dict[uuid.UUID, int]:
        return dict(self.consumo)


class FakeOrdemServicoRepository(OrdemServicoRepositoryInterface):
    def __init__(self):
        self.ordens: Dict[uuid.UUID, OrdemServico] = {}
        self.sequencia = 1

    async def salvar(self, os: OrdemServico) -> OrdemServico:
        self.ordens[os.id] = os
        return os

    async def buscar_por_id(self, os_id: uuid.UUID) -> Optional[OrdemServico]:
        return self.ordens.get(os_id)

    async def buscar_por_numero(self, numero_os: str) -> Optional[OrdemServico]:
        for os in self.ordens.values():
            if os.numero_os == numero_os:
                return os
        return None

    async def listar(self, status: Optional[str] = None) -> List[OrdemServico]:
        if status:
            return [os for os in self.ordens.values() if os.status.value == status]
        return list(self.ordens.values())

    async def listar_entregues_no_periodo(self, inicio: datetime, fim: datetime) -> List[OrdemServico]:
        return [
            os for os in self.ordens.values()
            if os.status == StatusOS.ENTREGUE and os.entregue_em and inicio <= os.entregue_em <= fim
        ]

    async def obter_proximo_numero_os(self) -> str:
        num = f"OS-2026-{self.sequencia:04d}"
        self.sequencia += 1
        return num


class FakeVendaBalcaoRepository(VendaBalcaoRepositoryInterface):
    def __init__(self):
        self.vendas: Dict[uuid.UUID, VendaBalcao] = {}
        self.sequencia = 1

    async def salvar(self, venda: VendaBalcao) -> VendaBalcao:
        self.vendas[venda.id] = venda
        return venda

    async def buscar_por_id(self, venda_id: uuid.UUID) -> Optional[VendaBalcao]:
        return self.vendas.get(venda_id)

    async def listar_recentes(self, limite: int = 50, operador_id: Optional[uuid.UUID] = None) -> List[VendaBalcao]:
        vendas = [v for v in self.vendas.values() if operador_id is None or v.operador_id == operador_id]
        return vendas[:limite]

    async def listar_concluidas_no_periodo(self, inicio: datetime, fim: datetime) -> List[VendaBalcao]:
        return [
            v for v in self.vendas.values()
            if v.status == StatusVenda.CONCLUIDA and inicio <= v.created_at <= fim
        ]

    async def obter_proximo_numero_venda(self) -> str:
        num = f"VB-2026-{self.sequencia:04d}"
        self.sequencia += 1
        return num


class FakeCaixaRepository(CaixaRepositoryInterface):
    def __init__(self):
        self.caixas: Dict[uuid.UUID, CaixaDiario] = {}

    async def salvar(self, caixa: CaixaDiario) -> CaixaDiario:
        self.caixas[caixa.id] = caixa
        return caixa

    async def buscar_por_id(self, caixa_id: uuid.UUID) -> Optional[CaixaDiario]:
        return self.caixas.get(caixa_id)

    async def obter_caixa_aberto(self) -> Optional[CaixaDiario]:
        for c in self.caixas.values():
            if c.status == StatusCaixa.ABERTO:
                return c
        return None


class FakeTituloFinanceiroRepository(TituloFinanceiroRepositoryInterface):
    def __init__(self):
        self.titulos: Dict[uuid.UUID, TituloFinanceiro] = {}

    async def salvar(self, titulo: TituloFinanceiro) -> TituloFinanceiro:
        self.titulos[titulo.id] = titulo
        return titulo

    async def buscar_por_id(self, titulo_id: uuid.UUID) -> Optional[TituloFinanceiro]:
        return self.titulos.get(titulo_id)

    async def buscar_por_venda(self, venda_id: uuid.UUID) -> Optional[TituloFinanceiro]:
        for t in self.titulos.values():
            if t.venda_id == venda_id:
                return t
        return None

    async def listar(self, tipo: Optional[TipoTitulo] = None, status: Optional[StatusTitulo] = None) -> List[TituloFinanceiro]:
        return [
            t for t in self.titulos.values()
            if (tipo is None or t.tipo == tipo) and (status is None or t.status == status)
        ]

    async def listar_pagos_no_periodo(self, tipo: TipoTitulo, inicio: date, fim: date) -> List[TituloFinanceiro]:
        return [
            t for t in self.titulos.values()
            if t.tipo == tipo and t.status == StatusTitulo.PAGO and t.data_pagamento
            and inicio <= t.data_pagamento <= fim
        ]


class FakeCobrancaPixRepository(CobrancaPixRepositoryInterface):
    def __init__(self):
        self.cobrancas: Dict[uuid.UUID, CobrancaPix] = {}

    async def salvar(self, cobranca: CobrancaPix) -> CobrancaPix:
        self.cobrancas[cobranca.id] = cobranca
        return cobranca

    async def buscar_por_id(self, cobranca_id: uuid.UUID) -> Optional[CobrancaPix]:
        return self.cobrancas.get(cobranca_id)

    async def buscar_por_txid(self, txid: str) -> Optional[CobrancaPix]:
        for c in self.cobrancas.values():
            if c.txid == txid:
                return c
        return None


class FakeAuditoriaRepository(AuditoriaRepositoryInterface):
    def __init__(self):
        self.logs: List[LogAuditoria] = []

    async def registrar(self, log: LogAuditoria) -> None:
        self.logs.append(copy.deepcopy(log))

    async def listar_ultimos(self, limite: int = 100, acao: Optional[str] = None,
                             usuario_id: Optional[uuid.UUID] = None) -> List[LogAuditoria]:
        logs = [
            log for log in self.logs
            if (acao is None or log.acao == acao) and (usuario_id is None or log.usuario_id == usuario_id)
        ]
        return logs[-limite:]

    def acoes(self) -> List[str]:
        return [log.acao for log in self.logs]
