"""
Entidade: CobrancaPix
Cobrança PIX dinâmica (QR Code / copia-e-cola) com confirmação automática de liquidação via webhook.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional
import re
import uuid
from src.domain.value_objects.enums import StatusCobrancaPix
from src.domain.value_objects.tempo import agora_utc
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass
class CobrancaPix:
    id: uuid.UUID
    txid: str
    valor: Decimal
    copia_e_cola: str
    expira_em: datetime
    status: StatusCobrancaPix = StatusCobrancaPix.PENDENTE
    descricao: Optional[str] = None
    end_to_end_id: Optional[str] = None
    liquidada_em: Optional[datetime] = None
    utilizada_em: Optional[datetime] = None
    referencia_uso: Optional[str] = None  # ex: número da venda / OS que consumiu o pagamento
    criada_em: datetime = field(default_factory=agora_utc)

    def __post_init__(self):
        # Padrão BACEN: até 25 caracteres no BR Code com chave do recebedor; 26 a 35 na cobrança via API do PSP
        if not re.fullmatch(r"[A-Za-z0-9]{25,35}", self.txid or ""):
            raise RegraNegocioException("txid da cobrança PIX deve ter de 25 a 35 caracteres alfanuméricos.")
        if self.valor <= Decimal("0.00"):
            raise RegraNegocioException("O valor da cobrança PIX deve ser maior que zero.")
        self.valor = self.valor.quantize(Decimal("0.01"))

    def esta_expirada(self, agora: datetime) -> bool:
        return self.status == StatusCobrancaPix.PENDENTE and agora > self.expira_em

    def liquidar(self, valor_pago: Decimal, end_to_end_id: str, quando: datetime):
        if self.status == StatusCobrancaPix.LIQUIDADA and self.end_to_end_id == end_to_end_id:
            return  # Webhook reentregue: operação idempotente
        if self.status != StatusCobrancaPix.PENDENTE:
            raise RegraNegocioException(f"Cobrança PIX no status '{self.status.value}' não pode ser liquidada.")
        if Decimal(valor_pago).quantize(Decimal("0.01")) != self.valor:
            raise RegraNegocioException(
                f"Valor pago (R$ {valor_pago}) diverge do valor da cobrança (R$ {self.valor})."
            )
        self.status = StatusCobrancaPix.LIQUIDADA
        self.end_to_end_id = end_to_end_id
        self.liquidada_em = quando

    def consumir(self, referencia: str, quando: datetime):
        """Vincula o pagamento confirmado a uma venda/OS. Cada cobrança só quita uma operação."""
        if self.status != StatusCobrancaPix.LIQUIDADA:
            raise RegraNegocioException("O pagamento PIX ainda não foi confirmado pelo banco.")
        if self.utilizada_em is not None:
            raise RegraNegocioException(f"Esta cobrança PIX já foi utilizada em '{self.referencia_uso}'.")
        self.utilizada_em = quando
        self.referencia_uso = referencia

    def expirar(self, agora: datetime):
        if self.esta_expirada(agora):
            self.status = StatusCobrancaPix.EXPIRADA
