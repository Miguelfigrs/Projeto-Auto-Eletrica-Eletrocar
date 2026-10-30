"""
Entidade: CaixaDiario (Aggregate Root) e MovimentacaoCaixa
Controle rígido de turnos de caixa, suprimentos, sangrias, estornos e fechamento cego
com conciliação por meio de pagamento.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
import uuid
from src.domain.value_objects.enums import (
    FormaPagamento,
    TipoMovimentacaoCaixa,
    StatusCaixa
)
from src.domain.value_objects.tempo import agora_utc
from src.domain.services.conciliador_caixa_service import ConciliadorCaixaService, ResultadoConciliacao
from src.domain.exceptions.domain_exceptions import (
    CaixaFechadoException,
    RegraNegocioException
)

FORMAS_DO_CAIXA = [f for f in FormaPagamento if not f.a_prazo]


@dataclass
class MovimentacaoCaixa:
    id: uuid.UUID
    caixa_id: uuid.UUID
    tipo: TipoMovimentacaoCaixa
    valor: Decimal
    forma_pagamento: FormaPagamento
    descricao: str
    created_at: datetime = field(default_factory=agora_utc)

    def __post_init__(self):
        if self.valor <= Decimal("0.00"):
            raise RegraNegocioException("Valor da movimentação deve ser maior que zero.")

    @property
    def valor_com_sinal(self) -> Decimal:
        return -self.valor if self.tipo.eh_saida else self.valor


@dataclass
class CaixaDiario:
    id: uuid.UUID
    operador_id: uuid.UUID
    saldo_inicial: Decimal = Decimal("0.00")
    status: StatusCaixa = StatusCaixa.ABERTO
    movimentacoes: List[MovimentacaoCaixa] = field(default_factory=list)
    data_abertura: datetime = field(default_factory=agora_utc)
    data_fechamento: Optional[datetime] = None
    totais_informados_fechamento: Optional[Dict[FormaPagamento, Decimal]] = None
    diferenca_fechamento: Optional[Decimal] = None

    def __post_init__(self):
        if self.saldo_inicial < Decimal("0.00"):
            raise RegraNegocioException("Saldo inicial do caixa não pode ser negativo.")

    @property
    def saldo_teorico(self) -> Decimal:
        """Saldo teórico de dinheiro físico em caixa (uso exclusivo da gerência)."""
        return self.calcular_total_por_forma_pagamento()[FormaPagamento.DINHEIRO]

    def calcular_total_por_forma_pagamento(self) -> Dict[FormaPagamento, Decimal]:
        totais: Dict[FormaPagamento, Decimal] = {forma: Decimal("0.00") for forma in FORMAS_DO_CAIXA}
        totais[FormaPagamento.DINHEIRO] = self.saldo_inicial
        for mov in self.movimentacoes:
            totais[mov.forma_pagamento] += mov.valor_com_sinal
        return {forma: valor.quantize(Decimal("0.01")) for forma, valor in totais.items()}

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
        if forma_pagamento.a_prazo:
            raise RegraNegocioException(
                f"Recebimentos '{forma_pagamento.value}' não entram no caixa: geram título a receber."
            )
        if tipo.eh_saida:
            disponivel = self.calcular_total_por_forma_pagamento()[forma_pagamento]
            if valor > disponivel:
                raise RegraNegocioException(
                    f"Saldo insuficiente em {forma_pagamento.value} para {tipo.value}. Solicitado: R$ {valor}."
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

    def fechar_cego(self, valores_contados_por_forma: Dict[FormaPagamento, Decimal]) -> ResultadoConciliacao:
        """
        Fechamento Cego de Caixa:
        O operador informa o que contou fisicamente, sem ver os totais calculados pelo sistema.
        A conciliação (quebra/sobra por meio de pagamento) fica disponível somente para a gerência.
        """
        if self.status == StatusCaixa.FECHADO:
            raise CaixaFechadoException("Caixa já se encontra fechado.")
        if any(forma.a_prazo for forma in valores_contados_por_forma):
            raise RegraNegocioException("Formas a prazo não fazem parte da contagem do caixa.")

        contados = {forma: Decimal(valor).quantize(Decimal("0.01")) for forma, valor in valores_contados_por_forma.items()}
        resultado = ConciliadorCaixaService.conciliar(self.calcular_total_por_forma_pagamento(), contados)

        self.status = StatusCaixa.FECHADO
        self.data_fechamento = agora_utc()
        self.totais_informados_fechamento = contados
        self.diferenca_fechamento = resultado.diferenca_total
        return resultado

    def relatorio_fechamento(self) -> ResultadoConciliacao:
        if self.status != StatusCaixa.FECHADO or self.totais_informados_fechamento is None:
            raise RegraNegocioException("O relatório de quebra de caixa só existe após o fechamento cego.")
        return ConciliadorCaixaService.conciliar(
            self.calcular_total_por_forma_pagamento(),
            self.totais_informados_fechamento
        )
