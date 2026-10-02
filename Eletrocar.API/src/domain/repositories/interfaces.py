"""
Interfaces Abstratas de Repositório (Domain Layer).
Princípio da Inversão de Dependência (DIP) da Clean Architecture.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.entities.peca import Peca
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.entities.caixa import CaixaDiario
from src.domain.entities.auditoria import LogAuditoria


class UsuarioRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, usuario: Usuario) -> Usuario:
        pass

    @abstractmethod
    async def buscar_por_id(self, usuario_id: uuid.UUID) -> Optional[Usuario]:
        pass

    @abstractmethod
    async def buscar_por_email(self, email: str) -> Optional[Usuario]:
        pass

    @abstractmethod
    async def buscar_por_telegram_id(self, telegram_id: str) -> Optional[Usuario]:
        pass

    @abstractmethod
    async def listar_todos(self) -> List[Usuario]:
        pass


class ClienteRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, cliente: Cliente) -> Cliente:
        pass

    @abstractmethod
    async def buscar_por_id(self, cliente_id: uuid.UUID) -> Optional[Cliente]:
        pass

    @abstractmethod
    async def buscar_por_cpf_cnpj(self, cpf_cnpj: str) -> Optional[Cliente]:
        pass

    @abstractmethod
    async def buscar_por_termo(self, termo: str) -> List[Cliente]:
        pass

    @abstractmethod
    async def buscar_carro_por_placa(self, placa: str) -> Optional[Carro]:
        pass


class PecaRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, peca: Peca) -> Peca:
        pass

    @abstractmethod
    async def buscar_por_id(self, peca_id: uuid.UUID) -> Optional[Peca]:
        pass

    @abstractmethod
    async def buscar_por_codigo_barras(self, codigo_barras: str) -> Optional[Peca]:
        pass

    @abstractmethod
    async def buscar_por_sku(self, sku: str) -> Optional[Peca]:
        pass

    @abstractmethod
    async def buscar_por_termo(self, termo: str) -> List[Peca]:
        pass

    @abstractmethod
    async def listar_baixo_estoque(self) -> List[Peca]:
        pass


class OrdemServicoRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, os: OrdemServico) -> OrdemServico:
        pass

    @abstractmethod
    async def buscar_por_id(self, os_id: uuid.UUID) -> Optional[OrdemServico]:
        pass

    @abstractmethod
    async def buscar_por_numero(self, numero_os: str) -> Optional[OrdemServico]:
        pass

    @abstractmethod
    async def listar(self, status: Optional[str] = None) -> List[OrdemServico]:
        pass

    @abstractmethod
    async def obter_proximo_numero_os(self) -> str:
        pass


class VendaBalcaoRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, venda: VendaBalcao) -> VendaBalcao:
        pass

    @abstractmethod
    async def buscar_por_id(self, venda_id: uuid.UUID) -> Optional[VendaBalcao]:
        pass

    @abstractmethod
    async def listar_recentes(self, limite: int = 50) -> List[VendaBalcao]:
        pass

    @abstractmethod
    async def obter_proximo_numero_venda(self) -> str:
        pass


class CaixaRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, caixa: CaixaDiario) -> CaixaDiario:
        pass

    @abstractmethod
    async def buscar_por_id(self, caixa_id: uuid.UUID) -> Optional[CaixaDiario]:
        pass

    @abstractmethod
    async def obter_caixa_aberto(self) -> Optional[CaixaDiario]:
        pass


class AuditoriaRepositoryInterface(ABC):
    @abstractmethod
    async def registrar(self, log: LogAuditoria) -> None:
        pass

    @abstractmethod
    async def listar_ultimos(self, limite: int = 100) -> List[LogAuditoria]:
        pass
