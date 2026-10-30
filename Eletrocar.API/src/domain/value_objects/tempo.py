"""
Utilitário de tempo do domínio: instantes em UTC sem fuso (naive), compatíveis com as colunas TIMESTAMP.
"""
from datetime import datetime, timezone


def agora_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
