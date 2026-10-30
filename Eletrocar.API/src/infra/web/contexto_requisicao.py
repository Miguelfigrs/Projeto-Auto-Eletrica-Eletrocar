"""
Contexto da requisição HTTP (IP de origem) disponível para a infraestrutura de auditoria,
sem acoplar os casos de uso ao framework web.
"""
from contextvars import ContextVar
from typing import Optional

ip_requisicao: ContextVar[Optional[str]] = ContextVar("ip_requisicao", default=None)
