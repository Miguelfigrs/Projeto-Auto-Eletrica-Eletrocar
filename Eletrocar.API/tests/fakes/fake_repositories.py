"""
Fake Repositories em memória para testes unitários de casos de uso (TDD puro).
Permitem testar as regras de negócio da aplicação sem dependência de banco de dados.
"""
from typing import List, Optional, Dict
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.peca import Peca
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.entities.caixa import CaixaDiario
from src.domain.entities.auditoria import LogAuditoria
from src.domain.value_objects.enums import StatusCaixa
from src.domain.repositories.interfaces import (
    UsuarioRepositoryInterface,
    ClienteRepositoryInterface,
    PecaRepositoryInterface,
    OrdemServicoRepositoryInterface,
    VendaBalcaoRepositoryInterface,
    CaixaRepositoryInterface,
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
            if u.email.lower() == email.lower():
                return u
        return None

    async def buscar_por_telegram_id(self, telegram_id: str) -> Optional[Usuario]:
        for u in self.usuarios.values():
            if u.telegram_user_id == telegram_id:
                return u
        return None

    async def listar_todos(self) -> List[Usuario]:
        return list(self.usuarios.values())


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

    async def salvar(self, peca: Peca) -> Peca:
        self.pecas[peca.id] = peca
        return peca

    async def buscar_por_id(self, peca_id: uuid.UUID) -> Optional[Peca]:
        return self.pecas.get(peca_id)

    async def buscar_por_codigo_barras(self, codigo_barras: str) -> Optional[Peca]:
        codigo_limpo = codigo_barras.strip()
        for p in self.pecas.values():
            if p.codigo_barras == codigo_limpo:
                return p
        return None

    async def buscar_por_sku(self, sku: str) -> Optional[Peca]:
        sku_limpo = sku.strip().upper()
        for p in self.pecas.values():
            if p.sku.upper() == sku_limpo:
                return p
        return None

    async def buscar_por_termo(self, termo: str) -> List[Peca]:
        termo_lower = termo.lower()
        return [
            p for p in self.pecas.values()
            if termo_lower in p.descricao.lower() or termo_lower in p.sku.lower() or termo_lower in p.codigo_barras.lower()
        ]

    async def listar_baixo_estoque(self) -> List[Peca]:
        return [p for p in self.pecas.values() if p.esta_abaixo_minimo()]


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

    async def listar_recentes(self, limite: int = 50) -> List[VendaBalcao]:
        return list(self.vendas.values())[:limite]

    async def obter_proximo_numero_venda(self) -> str:
        num = f"VND-{self.sequencia:05d}"
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


class FakeAuditoriaRepository(AuditoriaRepositoryInterface):
    def __init__(self):
        self.logs: List[LogAuditoria] = []

    async def registrar(self, log: LogAuditoria) -> None:
        self.logs.append(log)

    async def listar_ultimos(self, limite: int = 100) -> List[LogAuditoria]:
        return self.logs[-limite:]
