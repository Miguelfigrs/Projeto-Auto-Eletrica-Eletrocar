"""
Entidade: OrdemServico (Aggregate Root) e Componentes (ItemOS, ServicoOS)
Controle de ciclo de vida por máquina de estados e cálculo integrado de peças e mão de obra.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
import uuid
from src.domain.value_objects.enums import StatusOS, OrigemOS
from src.domain.exceptions.domain_exceptions import (
    TransicaoStatusInvalidaException,
    RegraNegocioException
)


@dataclass
class ItemOS:
    """Peça/componente elétrico vinculado à Ordem de Serviço."""
    id: uuid.UUID
    ordem_servico_id: uuid.UUID
    peca_id: uuid.UUID
    descricao_peca: str
    quantidade: int
    preco_unitario: Decimal

    @property
    def subtotal(self) -> Decimal:
        return (self.preco_unitario * Decimal(self.quantidade)).quantize(Decimal("0.01"))


@dataclass
class ServicoOS:
    """Mão de obra técnica / diagnóstico elétrico executado na OS."""
    id: uuid.UUID
    ordem_servico_id: uuid.UUID
    descricao: str
    valor: Decimal
    eletricista_responsavel_id: Optional[uuid.UUID] = None


class OrdemServicoStateMachine:
    """Matriz de transições permitidas para o ciclo de vida da OS."""
    TRANSIÇÕES_PERMITIDAS: Dict[StatusOS, List[StatusOS]] = {
        StatusOS.TRIAGEM: [
            StatusOS.ORCAMENTO_PENDENTE,
            StatusOS.CANCELADO
        ],
        StatusOS.ORCAMENTO_PENDENTE: [
            StatusOS.APROVADO,
            StatusOS.CANCELADO
        ],
        StatusOS.APROVADO: [
            StatusOS.EM_EXECUCAO,
            StatusOS.CANCELADO
        ],
        StatusOS.EM_EXECUCAO: [
            StatusOS.AGUARDANDO_PECA,
            StatusOS.TESTES_ELETRICOS,
            StatusOS.CANCELADO
        ],
        StatusOS.AGUARDANDO_PECA: [
            StatusOS.EM_EXECUCAO,
            StatusOS.CANCELADO
        ],
        StatusOS.TESTES_ELETRICOS: [
            StatusOS.FINALIZADO,
            StatusOS.EM_EXECUCAO,  # Falha no teste elétrico, volta para correção
            StatusOS.CANCELADO
        ],
        StatusOS.FINALIZADO: [
            StatusOS.ENTREGUE
        ],
        StatusOS.ENTREGUE: [],   # Estado terminal
        StatusOS.CANCELADO: []   # Estado terminal
    }

    @classmethod
    def validar_transicao(cls, status_atual: StatusOS, status_destino: StatusOS) -> bool:
        if status_atual == status_destino:
            return True
        permitidos = cls.TRANSIÇÕES_PERMITIDAS.get(status_atual, [])
        return status_destino in permitidos


@dataclass
class OrdemServico:
    id: uuid.UUID
    numero_os: str
    cliente_id: uuid.UUID
    carro_id: uuid.UUID
    usuario_id: uuid.UUID
    status: StatusOS = StatusOS.TRIAGEM
    origem: OrigemOS = OrigemOS.BALCAO
    sintomas: str = ""
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = field(default_factory=dict)
    itens: List[ItemOS] = field(default_factory=list)
    servicos: List[ServicoOS] = field(default_factory=list)
    desconto: Decimal = Decimal("0.00")
    observacoes: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if not self.numero_os or not self.numero_os.strip():
            raise RegraNegocioException("Número da OS é obrigatório.")

    @property
    def valor_pecas(self) -> Decimal:
        return sum((item.subtotal for item in self.itens), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def valor_servicos(self) -> Decimal:
        return sum((srv.valor for srv in self.servicos), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def valor_total(self) -> Decimal:
        bruto = self.valor_pecas + self.valor_servicos
        liquido = bruto - self.desconto
        return max(Decimal("0.00"), liquido).quantize(Decimal("0.01"))

    def transicionar_para(self, novo_status: StatusOS):
        if not OrdemServicoStateMachine.validar_transicao(self.status, novo_status):
            raise TransicaoStatusInvalidaException(self.status.value, novo_status.value)
        self.status = novo_status
        self.updated_at = datetime.utcnow()

    def adicionar_item_peca(self, peca_id: uuid.UUID, descricao_peca: str, quantidade: int, preco_unitario: Decimal):
        if self.status in [StatusOS.FINALIZADO, StatusOS.ENTREGUE, StatusOS.CANCELADO]:
            raise RegraNegocioException(f"Não é permitido adicionar peças em OS no status '{self.status.value}'.")
        if quantidade <= 0:
            raise RegraNegocioException("A quantidade da peça deve ser maior que zero.")
        if preco_unitario < Decimal("0.00"):
            raise RegraNegocioException("Preço unitário não pode ser negativo.")

        item = ItemOS(
            id=uuid.uuid4(),
            ordem_servico_id=self.id,
            peca_id=peca_id,
            descricao_peca=descricao_peca,
            quantidade=quantidade,
            preco_unitario=preco_unitario
        )
        self.itens.append(item)
        self.updated_at = datetime.utcnow()

    def adicionar_servico(self, descricao: str, valor: Decimal, eletricista_id: Optional[uuid.UUID] = None):
        if self.status in [StatusOS.FINALIZADO, StatusOS.ENTREGUE, StatusOS.CANCELADO]:
            raise RegraNegocioException(f"Não é permitido adicionar serviços em OS no status '{self.status.value}'.")
        if valor < Decimal("0.00"):
            raise RegraNegocioException("O valor do serviço não pode ser negativo.")

        servico = ServicoOS(
            id=uuid.uuid4(),
            ordem_servico_id=self.id,
            descricao=descricao,
            valor=valor,
            eletricista_responsavel_id=eletricista_id
        )
        self.servicos.append(servico)
        self.updated_at = datetime.utcnow()

    def aplicar_desconto(self, valor_desconto: Decimal):
        if valor_desconto < Decimal("0.00"):
            raise RegraNegocioException("Desconto não pode ser negativo.")
        total_bruto = self.valor_pecas + self.valor_servicos
        if valor_desconto > total_bruto:
            raise RegraNegocioException("Desconto não pode ser maior que o valor total da OS.")
        self.desconto = valor_desconto.quantize(Decimal("0.01"))
        self.updated_at = datetime.utcnow()
