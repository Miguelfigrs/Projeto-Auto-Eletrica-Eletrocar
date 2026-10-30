"""
Utilitários comuns dos repositórios SQLAlchemy: flush com bloqueio otimista e numeração sequencial atômica.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError
from src.domain.value_objects.tempo import agora_utc
from src.domain.exceptions.domain_exceptions import ConflitoConcorrenciaException


async def flush_com_bloqueio_otimista(session: AsyncSession, entidade: str) -> None:
    try:
        await session.flush()
    except StaleDataError as exc:
        raise ConflitoConcorrenciaException(
            f"{entidade} foi alterado(a) por outra operação simultânea. Recarregue e tente novamente."
        ) from exc


async def proximo_numero(session: AsyncSession, prefixo: str) -> str:
    """Gera PREFIXO-AAAA-NNNN de forma atômica (segura para concorrência) via UPDATE ... RETURNING."""
    ano = agora_utc().year
    chave = f"{prefixo}-{ano}"
    await session.execute(
        text("INSERT INTO contadores_sequenciais (chave, valor) VALUES (:chave, 0) ON CONFLICT (chave) DO NOTHING"),
        {"chave": chave},
    )
    valor = (await session.execute(
        text("UPDATE contadores_sequenciais SET valor = valor + 1 WHERE chave = :chave RETURNING valor"),
        {"chave": chave},
    )).scalar_one()
    return f"{chave}-{valor:04d}"
