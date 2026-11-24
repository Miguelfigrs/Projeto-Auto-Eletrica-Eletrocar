"""
Utilitário de tempo do domínio: instantes em UTC sem fuso (naive), compatíveis com as colunas TIMESTAMP.
Relatórios filtram por DIA DO CALENDÁRIO da oficina: os limites do dia local são convertidos para UTC.
"""
from datetime import date, datetime, time, timedelta, timezone
from typing import Tuple
from zoneinfo import ZoneInfo


def agora_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hoje_local(fuso: str) -> date:
    """Data de hoje no fuso da oficina (o servidor/contêiner costuma rodar em UTC)."""
    return datetime.now(ZoneInfo(fuso)).date()


def limites_utc(data_inicio: date, data_fim: date, fuso: str) -> Tuple[datetime, datetime]:
    """Intervalo [00:00 de data_inicio, 23:59:59.999999 de data_fim] no fuso local, em UTC naive."""
    zona = ZoneInfo(fuso)
    inicio = datetime.combine(data_inicio, time.min, tzinfo=zona)
    fim = datetime.combine(data_fim + timedelta(days=1), time.min, tzinfo=zona) - timedelta(microseconds=1)
    return (
        inicio.astimezone(timezone.utc).replace(tzinfo=None),
        fim.astimezone(timezone.utc).replace(tzinfo=None),
    )
