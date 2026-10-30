"""
Serviços de Aplicação compartilhados entre Venda Balcão e Faturamento de OS:
consumo de cobrança PIX liquidada e geração de título a receber para formas a prazo.
"""
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
import uuid
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.value_objects.enums import FormaPagamento, TipoTitulo, CategoriaTitulo
from src.domain.value_objects.tempo import agora_utc
from src.domain.repositories.interfaces import CobrancaPixRepositoryInterface, TituloFinanceiroRepositoryInterface
from src.domain.exceptions.domain_exceptions import RegraNegocioException, EntidadeNaoEncontradaException


async def consumir_cobranca_pix(
    cobranca_repo: CobrancaPixRepositoryInterface,
    cobranca_pix_id: Optional[uuid.UUID],
    forma_pagamento: FormaPagamento,
    valor_esperado: Decimal,
    referencia: str
) -> Optional[str]:
    """Valida e vincula a cobrança PIX liquidada à operação. Retorna o txid usado (ou None)."""
    if cobranca_pix_id is None:
        return None
    if forma_pagamento != FormaPagamento.PIX:
        raise RegraNegocioException("Cobrança PIX informada para forma de pagamento diferente de PIX.")
    cobranca = await cobranca_repo.buscar_por_id(cobranca_pix_id)
    if not cobranca:
        raise EntidadeNaoEncontradaException("Cobrança PIX não encontrada.")
    if cobranca.valor != valor_esperado:
        raise RegraNegocioException(
            f"Valor da cobrança PIX (R$ {cobranca.valor}) diferente do total a pagar (R$ {valor_esperado})."
        )
    cobranca.consumir(referencia, agora_utc())
    await cobranca_repo.salvar(cobranca)
    return cobranca.txid


async def gerar_titulo_a_receber(
    titulo_repo: TituloFinanceiroRepositoryInterface,
    descricao: str,
    valor: Decimal,
    categoria: CategoriaTitulo,
    cliente_id: Optional[uuid.UUID],
    prazo_dias: int,
    venda_id: Optional[uuid.UUID] = None,
    ordem_servico_id: Optional[uuid.UUID] = None,
) -> TituloFinanceiro:
    titulo = TituloFinanceiro(
        id=uuid.uuid4(),
        tipo=TipoTitulo.RECEBER,
        descricao=descricao,
        valor=valor,
        data_vencimento=date.today() + timedelta(days=prazo_dias),
        categoria=categoria,
        cliente_id=cliente_id,
        venda_id=venda_id,
        ordem_servico_id=ordem_servico_id,
    )
    await titulo_repo.salvar(titulo)
    return titulo
