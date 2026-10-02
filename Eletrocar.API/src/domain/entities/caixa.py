"""
Entidade: CaixaDiario (Aggregate Root) e MovimentacaoCaixa
Controle rígido de turnos de caixa, suprimentos, sangrias e fechamento cego.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
import uuid
from src.domain.value_objects.enums import (
    FormaPagamento,
    TipoMovimentacaoCaixa,
    StatusCaixa
)
from src.domain.exceptions.domain_exceptions import (
    CaixaFechadoException,
    RegraNegocioException
)


@dataclass
class MovimentacaoCaixa:
    id: uuid.UUID
    caixa_id: uuid.UUID
    tipo: TipoMovimentacaoCaixa
    valor: Decimal
    forma_pagamento: FormaPagamento
    descricao: str
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        if self.valor <= Decimal("0.00"):
            raise RegraNegocioException("Valor da movimentação deve ser maior que zero.")


@dataclass
class CaixaDiario:
    id: uuid.UUID
    operador_id: uuid.UUID
    saldo_inicial: Decimal = Decimal("0.00")
    status: StatusCaixa = StatusCaixa.ABERTO
    movimentacoes: List[MovimentacaoCaixa] = field(default_factory=list)
    data_abertura: datetime = field(default_factory=datetime.utcnow)
    data_fechamento: Optional[datetime] = None
    totais_informados_fechamento: Optional[Dict[str, Decimal]] = None
    diferenca_fechamento: Optional[Decimal] = None

    def __post_init__(self):
        if self.saldo_inicial < Decimal("0.00"):
            raise RegraNegocioException("Saldo inicial do caixa não pode ser negativo.")

    @property
    def saldo_teorico(self) -> Decimal:
        """Calcula o saldo teórico de dinheiro físico em caixa."""
        saldo = self.saldo_inicial
        for mov in self.movimentacoes:
            if mov.forma_pagamento == FormaPagamento.DINHEIRO:
                if mov.tipo in [TipoMovimentacaoCaixa.ENTRADA_VENDA, TipoMovimentacaoCaixa.ENTRADA_OS, TipoMovimentacaoCaixa.SUPRIMENTO]:
                    saldo += mov.valor
                elif mov.tipo == TipoMovimentacaoCaixa.SANGRIA:
                    saldo -= mov.valor
        return saldo.quantize(Decimal("0.01"))

    def calcular_total_por_forma_pagamento(self) -> Dict[FormaPagamento, Decimal]:
        totais: Dict[FormaPagamento, Decimal] = {
            FormaPagamento.DINHEIRO: self.saldo_teorico,
            FormaPagamento.PIX: Decimal("0.00"),
            FormaPagamento.CARTAO_CREDITO: Decimal("0.00"),
            FormaPagamento.CARTAO_DEBITO: Decimal("0.00"),
            FormaPagamento.FATURADO: Decimal("0.00"),
        }
        for mov in self.movimentacoes:
            if mov.forma_pagamento != FormaPagamento.DINHEIRO:
                if mov.tipo in [TipoMovimentacaoCaixa.ENTRADA_VENDA, TipoMovimentacaoCaixa.ENTRADA_OS]:
                    totais[mov.forma_pagamento] += mov.valor
        return totais

    def registrar_movimentacao(
        self,
        tipo: TipoMovimentacaoCaixa,
        valor: Decimal,
        forma_pagamento: FormaPagamento,
        descricao: str
    ) -> MovimentacaoCaixa:
        if self.status == StatusCaixa.FECHADO:
            raise CaixaFechadoException("Não é permitido registrar movimentações em um caixa fechado.")
        if valor <= Decimal("0.00"):
            raise RegraNegocioException("O valor da movimentação deve ser estritamente positivo.")

        if tipo == TipoMovimentacaoCaixa.SANGRIA:
            if forma_pagamento == FormaPagamento.DINHEIRO and valor > self.saldo_teorico:
                raise RegraNegocioException(
                    f"Saldo em dinheiro insuficiente para sangria. Disponível: R$ {self.saldo_teorico}, Solicitado: R$ {valor}"
                )

        movimentacao = MovimentacaoCaixa(
            id=uuid.uuid4(),
            caixa_id=self.id,
            tipo=tipo,
            valor=valor.quantize(Decimal("0.01")),
            forma_pagamento=forma_pagamento,
            descricao=descricao
        )
        self.movimentacoes.append(movimentacao)
        return movimentacao

    def fechar_cego(self, valores_contados_por_forma: Dict[FormaPagamento, Decimal]) -> Dict[str, Any]:
        """
        Fechamento Cego de Caixa:
        O operador digita o que contou fisicamente, sem ver os totais calculados pelo sistema.
        O sistema gera o diagnóstico de quebra/sobra para a gerência.
        """
        if self.status == StatusCaixa.FECHADO:
            raise CaixaFechadoException("Caixa já se encontra fechado.")

        saldo_teorico_dinheiro = self.saldo_teorico
        valor_contado_dinheiro = valores_contados_por_forma.get(FormaPagamento.DINHEIRO, Decimal("0.00"))
        
        diferenca_dinheiro = (valor_contado_dinheiro - saldo_teorico_dinheiro).quantize(Decimal("0.01"))
        
        if diferenca_dinheiro < Decimal("0.00"):
            diagnostico = "QUEBRA_DE_CAIXA"
        elif diferenca_dinheiro > Decimal("0.00"):
            diagnostico = "SOBRA_DE_CAIXA"
        else:
            diagnostico = "CORRETO"

        self.status = StatusCaixa.FECHADO
        self.data_fechamento = datetime.utcnow()
        self.totais_informados_fechamento = {k.value: v for k, v in valores_contados_por_forma.items()}
        self.diferenca_fechamento = diferenca_dinheiro

        return {
            "caixa_id": self.id,
            "saldo_teorico_dinheiro": saldo_teorico_dinheiro,
            "saldo_contado_dinheiro": valor_contado_dinheiro,
            "diferenca_total": diferenca_dinheiro,
            "quebra_ou_sobra": diagnostico,
            "data_fechamento": self.data_fechamento
        }
