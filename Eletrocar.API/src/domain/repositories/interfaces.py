"""
Interfaces Abstratas de Repositório (Domain Layer).
Princípio da Inversão de Dependência (DIP) da Clean Architecture.
"""
from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Dict, List, Optional
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
from src.domain.value_objects.enums import TipoTitulo, StatusTitulo


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
    async def buscar_por_login(self, identificador: str) -> Optional[Usuario]:
        """Localiza por e-mail ou nome de usuário (login por E-mail/Usuário)."""

    @abstractmethod
    async def buscar_por_telegram_id(self, telegram_id: str) -> Optional[Usuario]:
        pass

    @abstractmethod
    async def listar_todos(self) -> List[Usuario]:
        pass

    @abstractmethod
    async def contar(self) -> int:
        pass


class SessaoRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, sessao: SessaoRefresh) -> SessaoRefresh:
        pass

    @abstractmethod
    async def buscar_por_id(self, sessao_id: uuid.UUID) -> Optional[SessaoRefresh]:
        pass

    @abstractmethod
    async def revogar_todas_do_usuario(self, usuario_id: uuid.UUID, agora: datetime) -> None:
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
    async def buscar_por_id_para_atualizacao(self, peca_id: uuid.UUID) -> Optional[Peca]:
        """Carrega a peça com bloqueio de linha (SELECT ... FOR UPDATE) para baixa/reserva atômica."""

    @abstractmethod
    async def buscar_por_codigo_barras(self, codigo_barras: str) -> Optional[Peca]:
        pass

    @abstractmethod
    async def buscar_por_sku(self, sku: str) -> Optional[Peca]:
        pass

    @abstractmethod
    async def buscar_por_termo(self, termo: str) -> List[Peca]:
        """Busca por descrição, SKU, código de barras, código original, fabricante ou aplicação veicular.
        Termos separados por espaço devem TODOS aparecer (ex: 'alternador gol 1.6')."""

    @abstractmethod
    async def listar_ativas(self) -> List[Peca]:
        pass

    @abstractmethod
    async def listar_baixo_estoque(self) -> List[Peca]:
        pass

    @abstractmethod
    async def consumo_por_peca(self, desde: datetime) -> Dict[uuid.UUID, int]:
        """Quantidade consumida por peça (vendas concluídas + OS finalizadas/entregues) desde a data."""


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
    async def listar_entregues_no_periodo(self, inicio: datetime, fim: datetime) -> List[OrdemServico]:
        pass

    @abstractmethod
    async def obter_proximo_numero_os(self) -> str:
        """Numeração sequencial atômica (segura para concorrência) no formato OS-AAAA-NNNN."""


class VendaBalcaoRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, venda: VendaBalcao) -> VendaBalcao:
        pass

    @abstractmethod
    async def buscar_por_id(self, venda_id: uuid.UUID) -> Optional[VendaBalcao]:
        pass

    @abstractmethod
    async def listar_recentes(self, limite: int = 50, operador_id: Optional[uuid.UUID] = None) -> List[VendaBalcao]:
        pass

    @abstractmethod
    async def listar_concluidas_no_periodo(self, inicio: datetime, fim: datetime) -> List[VendaBalcao]:
        pass

    @abstractmethod
    async def obter_proximo_numero_venda(self) -> str:
        """Numeração sequencial atômica (segura para concorrência) no formato VB-AAAA-NNNN."""


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


class TituloFinanceiroRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, titulo: TituloFinanceiro) -> TituloFinanceiro:
        pass

    @abstractmethod
    async def buscar_por_id(self, titulo_id: uuid.UUID) -> Optional[TituloFinanceiro]:
        pass

    @abstractmethod
    async def buscar_por_venda(self, venda_id: uuid.UUID) -> Optional[TituloFinanceiro]:
        pass

    @abstractmethod
    async def listar(self, tipo: Optional[TipoTitulo] = None, status: Optional[StatusTitulo] = None) -> List[TituloFinanceiro]:
        pass

    @abstractmethod
    async def listar_pagos_no_periodo(self, tipo: TipoTitulo, inicio: date, fim: date) -> List[TituloFinanceiro]:
        pass


class CobrancaPixRepositoryInterface(ABC):
    @abstractmethod
    async def salvar(self, cobranca: CobrancaPix) -> CobrancaPix:
        pass

    @abstractmethod
    async def buscar_por_id(self, cobranca_id: uuid.UUID) -> Optional[CobrancaPix]:
        pass

    @abstractmethod
    async def buscar_por_txid(self, txid: str) -> Optional[CobrancaPix]:
        pass


class AuditoriaRepositoryInterface(ABC):
    @abstractmethod
    async def registrar(self, log: LogAuditoria) -> None:
        pass

    @abstractmethod
    async def listar_ultimos(
        self,
        limite: int = 100,
        acao: Optional[str] = None,
        usuario_id: Optional[uuid.UUID] = None
    ) -> List[LogAuditoria]:
        pass
