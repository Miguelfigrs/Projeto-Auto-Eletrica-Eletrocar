"""
DTOs do módulo financeiro: contas a pagar/receber, inadimplência e cobranças PIX.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.entities.cobranca_pix import CobrancaPix
from src.domain.value_objects.enums import TipoTitulo, CategoriaTitulo, FormaPagamento


@dataclass
class CriarTituloInputDTO:
    tipo: TipoTitulo
    descricao: str
    valor: Decimal
    data_vencimento: date
    categoria: CategoriaTitulo
    cliente_id: Optional[uuid.UUID] = None


@dataclass
class BaixarTituloInputDTO:
    titulo_id: uuid.UUID
    data_pagamento: date
    forma_pagamento: FormaPagamento
    executor_id: uuid.UUID


@dataclass
class TituloOutputDTO:
    id: uuid.UUID
    tipo: str
    descricao: str
    valor: Decimal
    data_vencimento: date
    categoria: str
    status: str
    cliente_id: Optional[uuid.UUID]
    venda_id: Optional[uuid.UUID]
    ordem_servico_id: Optional[uuid.UUID]
    data_pagamento: Optional[date]
    forma_pagamento_baixa: Optional[str]
    vencido: bool
    dias_em_atraso: int

    @classmethod
    def de(cls, t: TituloFinanceiro, hoje: date) -> "TituloOutputDTO":
        return cls(
            id=t.id, tipo=t.tipo.value, descricao=t.descricao, valor=t.valor,
            data_vencimento=t.data_vencimento, categoria=t.categoria.value, status=t.status.value,
            cliente_id=t.cliente_id, venda_id=t.venda_id, ordem_servico_id=t.ordem_servico_id,
            data_pagamento=t.data_pagamento,
            forma_pagamento_baixa=t.forma_pagamento_baixa.value if t.forma_pagamento_baixa else None,
            vencido=t.esta_vencido(hoje), dias_em_atraso=t.dias_em_atraso(hoje),
        )


@dataclass
class RelatorioInadimplenciaDTO:
    data_referencia: date
    quantidade: int
    valor_total: Decimal
    titulos: List[TituloOutputDTO] = field(default_factory=list)


@dataclass
class GerarCobrancaPixInputDTO:
    valor: Decimal
    descricao: str
    operador_id: uuid.UUID


@dataclass
class LiquidacaoPixInputDTO:
    txid: str
    valor_pago: Decimal
    end_to_end_id: str


@dataclass
class CobrancaPixOutputDTO:
    id: uuid.UUID
    txid: str
    valor: Decimal
    status: str
    copia_e_cola: str
    expira_em: datetime
    liquidada_em: Optional[datetime]
    referencia_uso: Optional[str]

    @classmethod
    def de(cls, c: CobrancaPix) -> "CobrancaPixOutputDTO":
        return cls(
            id=c.id, txid=c.txid, valor=c.valor, status=c.status.value, copia_e_cola=c.copia_e_cola,
            expira_em=c.expira_em, liquidada_em=c.liquidada_em, referencia_uso=c.referencia_uso,
        )
