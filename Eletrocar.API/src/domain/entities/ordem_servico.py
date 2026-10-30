"""
Entidade: OrdemServico (Aggregate Root) e Componentes (ItemOS, ServicoOS)
Controle de ciclo de vida por máquina de estados e cálculo integrado de peças e mão de obra.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
import uuid
from src.domain.value_objects.enums import StatusOS, OrigemOS, FormaPagamento, PrioridadeOS
from src.domain.value_objects.tempo import agora_utc
from src.domain.exceptions.domain_exceptions import (
    TransicaoStatusInvalidaException,
    RegraNegocioException
)


@dataclass
class ItemOS:
    """Peça/componente elétrico vinculado (reservado) à Ordem de Serviço."""
    id: uuid.UUID
    ordem_servico_id: uuid.UUID
    peca_id: uuid.UUID
    descricao_peca: str
    quantidade: int
    preco_unitario: Decimal
    custo_unitario: Decimal = Decimal("0.00")  # Custo da peça no momento da alocação (base do CMV)

    @property
    def subtotal(self) -> Decimal:
        return (self.preco_unitario * Decimal(self.quantidade)).quantize(Decimal("0.01"))

    @property
    def custo_total(self) -> Decimal:
        return (self.custo_unitario * Decimal(self.quantidade)).quantize(Decimal("0.01"))


@dataclass
class ServicoOS:
    """Mão de obra técnica / diagnóstico elétrico executado na OS."""
    id: uuid.UUID
    ordem_servico_id: uuid.UUID
    descricao: str
    valor: Decimal
    eletricista_responsavel_id: Optional[uuid.UUID] = None


class OrdemServicoStateMachine:
    """Matriz de transições permitidas para o ciclo de vida da OS (Diagrama de Estados 05)."""
    TRANSICOES_PERMITIDAS: Dict[StatusOS, List[StatusOS]] = {
        StatusOS.TRIAGEM: [StatusOS.ORCAMENTO_PENDENTE, StatusOS.CANCELADO],
        StatusOS.ORCAMENTO_PENDENTE: [StatusOS.APROVADO, StatusOS.CANCELADO],
        StatusOS.APROVADO: [StatusOS.EM_EXECUCAO, StatusOS.CANCELADO],
        StatusOS.EM_EXECUCAO: [StatusOS.AGUARDANDO_PECA, StatusOS.TESTES_ELETRICOS, StatusOS.CANCELADO],
        StatusOS.AGUARDANDO_PECA: [StatusOS.EM_EXECUCAO, StatusOS.CANCELADO],
        StatusOS.TESTES_ELETRICOS: [
            StatusOS.FINALIZADO,
            StatusOS.EM_EXECUCAO,  # Falha no teste elétrico, volta para correção
            StatusOS.CANCELADO
        ],
        StatusOS.FINALIZADO: [StatusOS.ENTREGUE],
        StatusOS.ENTREGUE: [],   # Estado terminal
        StatusOS.CANCELADO: []   # Estado terminal
    }

    @classmethod
    def validar_transicao(cls, status_atual: StatusOS, status_destino: StatusOS) -> bool:
        if status_atual == status_destino:
            return True
        return status_destino in cls.TRANSICOES_PERMITIDAS.get(status_atual, [])


STATUS_BLOQUEADOS_PARA_EDICAO = (StatusOS.FINALIZADO, StatusOS.ENTREGUE, StatusOS.CANCELADO)


@dataclass
class OrdemServico:
    id: uuid.UUID
    numero_os: str
    cliente_id: uuid.UUID
    carro_id: uuid.UUID
    usuario_id: uuid.UUID
    status: StatusOS = StatusOS.TRIAGEM
    origem: OrigemOS = OrigemOS.BALCAO
    prioridade: PrioridadeOS = PrioridadeOS.MEDIA
    sintomas: str = ""
    hipotese_diagnostica: Optional[str] = None
    checklist_eletrico: Dict[str, Any] = field(default_factory=dict)
    itens: List[ItemOS] = field(default_factory=list)
    servicos: List[ServicoOS] = field(default_factory=list)
    desconto: Decimal = Decimal("0.00")
    observacoes: Optional[str] = None
    forma_pagamento: Optional[FormaPagamento] = None
    finalizada_em: Optional[datetime] = None
    entregue_em: Optional[datetime] = None
    created_at: datetime = field(default_factory=agora_utc)
    updated_at: datetime = field(default_factory=agora_utc)

    def __post_init__(self):
        if not self.numero_os or not self.numero_os.strip():
            raise RegraNegocioException("Número da OS é obrigatório.")

    @property
    def valor_pecas(self) -> Decimal:
        return sum((item.subtotal for item in self.itens), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def custo_pecas(self) -> Decimal:
        return sum((item.custo_total for item in self.itens), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def valor_servicos(self) -> Decimal:
        return sum((srv.valor for srv in self.servicos), Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def valor_bruto(self) -> Decimal:
        return self.valor_pecas + self.valor_servicos

    @property
    def valor_total(self) -> Decimal:
        return max(Decimal("0.00"), self.valor_bruto - self.desconto).quantize(Decimal("0.01"))

    def quantidades_por_peca(self) -> Dict[uuid.UUID, int]:
        quantidades: Dict[uuid.UUID, int] = {}
        for item in self.itens:
            quantidades[item.peca_id] = quantidades.get(item.peca_id, 0) + item.quantidade
        return quantidades

    def transicionar_para(self, novo_status: StatusOS):
        if novo_status == StatusOS.ENTREGUE and self.status != StatusOS.ENTREGUE:
            raise RegraNegocioException(
                "A entrega do veículo exige o faturamento da OS com a forma de pagamento."
            )
        self._aplicar_transicao(novo_status)
        if novo_status == StatusOS.FINALIZADO and self.finalizada_em is None:
            self.finalizada_em = self.updated_at

    def entregar(self, forma_pagamento: FormaPagamento):
        """Faturamento: pagamento confirmado e veículo liberado (FINALIZADO -> ENTREGUE)."""
        self._aplicar_transicao(StatusOS.ENTREGUE)
        self.forma_pagamento = forma_pagamento
        self.entregue_em = self.updated_at

    def _aplicar_transicao(self, novo_status: StatusOS):
        if not OrdemServicoStateMachine.validar_transicao(self.status, novo_status):
            raise TransicaoStatusInvalidaException(self.status.value, novo_status.value)
        self.status = novo_status
        self.updated_at = agora_utc()

    def _validar_edicao(self, oque: str):
        if self.status in STATUS_BLOQUEADOS_PARA_EDICAO:
            raise RegraNegocioException(f"Não é permitido adicionar {oque} em OS no status '{self.status.value}'.")

    def adicionar_item_peca(
        self,
        peca_id: uuid.UUID,
        descricao_peca: str,
        quantidade: int,
        preco_unitario: Decimal,
        custo_unitario: Decimal = Decimal("0.00")
    ) -> ItemOS:
        self._validar_edicao("peças")
        if quantidade <= 0:
            raise RegraNegocioException("A quantidade da peça deve ser maior que zero.")
        if preco_unitario < Decimal("0.00") or custo_unitario < Decimal("0.00"):
            raise RegraNegocioException("Preço unitário não pode ser negativo.")

        item = ItemOS(
            id=uuid.uuid4(),
            ordem_servico_id=self.id,
            peca_id=peca_id,
            descricao_peca=descricao_peca,
            quantidade=quantidade,
            preco_unitario=preco_unitario,
            custo_unitario=custo_unitario
        )
        self.itens.append(item)
        self.updated_at = agora_utc()
        return item

    def adicionar_servico(self, descricao: str, valor: Decimal, eletricista_id: Optional[uuid.UUID] = None) -> ServicoOS:
        self._validar_edicao("serviços")
        if not descricao or not descricao.strip():
            raise RegraNegocioException("A descrição do serviço é obrigatória.")
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
        self.updated_at = agora_utc()
        return servico

    def aplicar_desconto(self, valor_desconto: Decimal):
        if self.status in (StatusOS.ENTREGUE, StatusOS.CANCELADO):
            raise RegraNegocioException(f"Não é permitido aplicar desconto em OS no status '{self.status.value}'.")
        if valor_desconto < Decimal("0.00"):
            raise RegraNegocioException("Desconto não pode ser negativo.")
        if valor_desconto > self.valor_bruto:
            raise RegraNegocioException("Desconto não pode ser maior que o valor total da OS.")
        self.desconto = valor_desconto.quantize(Decimal("0.01"))
        self.updated_at = agora_utc()
