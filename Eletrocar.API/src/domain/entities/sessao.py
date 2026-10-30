"""
Entidade: SessaoRefresh
Sessão de refresh token com rotação: cada renovação revoga o token anterior.
O reuso de um token revogado indica roubo e derruba todas as sessões do usuário.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid
from src.domain.value_objects.tempo import agora_utc


@dataclass
class SessaoRefresh:
    id: uuid.UUID  # jti do refresh token
    usuario_id: uuid.UUID
    expira_em: datetime
    criada_em: datetime = field(default_factory=agora_utc)
    revogada_em: Optional[datetime] = None
    substituida_por: Optional[uuid.UUID] = None

    def esta_ativa(self, agora: datetime) -> bool:
        return self.revogada_em is None and self.expira_em > agora

    def revogar(self, agora: datetime, substituida_por: Optional[uuid.UUID] = None):
        if self.revogada_em is None:
            self.revogada_em = agora
            self.substituida_por = substituida_por
