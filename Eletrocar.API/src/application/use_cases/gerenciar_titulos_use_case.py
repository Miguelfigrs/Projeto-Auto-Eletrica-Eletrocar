"""
Caso de Uso: GerenciarTitulosUseCase (Contas a Pagar e a Receber com controle de inadimplência)
Recebimentos baixados com caixa aberto entram no caixa do turno (ENTRADA_TITULO) para a conciliação.
"""
from datetime import date
from decimal import Decimal
from typing import Callable, List, Optional
import uuid
from src.domain.entities.titulo_financeiro import TituloFinanceiro
from src.domain.entities.auditoria import novo_log
from src.domain.value_objects.enums import TipoTitulo, StatusTitulo, TipoMovimentacaoCaixa, FormaPagamento
from src.domain.repositories.interfaces import (
    TituloFinanceiroRepositoryInterface,
    CaixaRepositoryInterface,
    AuditoriaRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException, CaixaFechadoException
from src.application.dtos.financeiro_dtos import (
    CriarTituloInputDTO,
    BaixarTituloInputDTO,
    TituloOutputDTO,
    RelatorioInadimplenciaDTO,
)

ORIGEM = "FINANCEIRO"


class GerenciarTitulosUseCase:
    def __init__(
        self,
        titulo_repo: TituloFinanceiroRepositoryInterface,
        caixa_repo: CaixaRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface,
        hoje: Callable[[], date] = date.today,
    ):
        self.titulo_repo = titulo_repo
        self.caixa_repo = caixa_repo
        self.audit_repo = audit_repo
        self.hoje = hoje

    async def criar(self, dto: CriarTituloInputDTO, executor_id: uuid.UUID) -> TituloOutputDTO:
        titulo = TituloFinanceiro(
            id=uuid.uuid4(), tipo=dto.tipo, descricao=dto.descricao, valor=dto.valor,
            data_vencimento=dto.data_vencimento, categoria=dto.categoria, cliente_id=dto.cliente_id,
        )
        await self.titulo_repo.salvar(titulo)
        await self.audit_repo.registrar(novo_log(
            executor_id, ORIGEM, "TITULO_CRIADO",
            detalhes={"titulo_id": str(titulo.id), "tipo": titulo.tipo.value, "categoria": titulo.categoria.value},
            depois={"valor": str(titulo.valor), "vencimento": titulo.data_vencimento.isoformat()},
        ))
        return TituloOutputDTO.de(titulo, self.hoje())

    async def baixar(self, dto: BaixarTituloInputDTO) -> TituloOutputDTO:
        titulo = await self._obter(dto.titulo_id)
        caixa = None
        if titulo.tipo == TipoTitulo.RECEBER:
            caixa = await self.caixa_repo.obter_caixa_aberto()
            if caixa is None and dto.forma_pagamento == FormaPagamento.DINHEIRO:
                raise CaixaFechadoException("Recebimento em dinheiro exige caixa aberto.")

        antes = {"status": titulo.status.value}
        titulo.baixar(dto.data_pagamento, dto.forma_pagamento)
        if caixa is not None:
            caixa.registrar_movimentacao(
                TipoMovimentacaoCaixa.ENTRADA_TITULO, titulo.valor, dto.forma_pagamento,
                f"Recebimento: {titulo.descricao}"
            )
            await self.caixa_repo.salvar(caixa)

        await self.titulo_repo.salvar(titulo)
        await self.audit_repo.registrar(novo_log(
            dto.executor_id, ORIGEM, "TITULO_BAIXADO",
            detalhes={"titulo_id": str(titulo.id), "valor": str(titulo.valor),
                      "forma_pagamento": dto.forma_pagamento.value},
            antes=antes, depois={"status": titulo.status.value},
        ))
        return TituloOutputDTO.de(titulo, self.hoje())

    async def cancelar(self, titulo_id: uuid.UUID, executor_id: uuid.UUID) -> TituloOutputDTO:
        titulo = await self._obter(titulo_id)
        antes = {"status": titulo.status.value}
        titulo.cancelar()
        await self.titulo_repo.salvar(titulo)
        await self.audit_repo.registrar(novo_log(
            executor_id, ORIGEM, "TITULO_CANCELADO",
            detalhes={"titulo_id": str(titulo.id)}, antes=antes, depois={"status": titulo.status.value},
        ))
        return TituloOutputDTO.de(titulo, self.hoje())

    async def listar(
        self,
        tipo: Optional[TipoTitulo] = None,
        status: Optional[StatusTitulo] = None,
        somente_vencidos: bool = False
    ) -> List[TituloOutputDTO]:
        hoje = self.hoje()
        titulos = await self.titulo_repo.listar(tipo, status)
        if somente_vencidos:
            titulos = [t for t in titulos if t.esta_vencido(hoje)]
        return [TituloOutputDTO.de(t, hoje) for t in sorted(titulos, key=lambda t: t.data_vencimento)]

    async def relatorio_inadimplencia(self) -> RelatorioInadimplenciaDTO:
        hoje = self.hoje()
        vencidos = await self.listar(TipoTitulo.RECEBER, StatusTitulo.ABERTO, somente_vencidos=True)
        return RelatorioInadimplenciaDTO(
            data_referencia=hoje,
            quantidade=len(vencidos),
            valor_total=sum((t.valor for t in vencidos), Decimal("0.00")),
            titulos=sorted(vencidos, key=lambda t: t.dias_em_atraso, reverse=True),
        )

    async def _obter(self, titulo_id: uuid.UUID) -> TituloFinanceiro:
        titulo = await self.titulo_repo.buscar_por_id(titulo_id)
        if not titulo:
            raise EntidadeNaoEncontradaException("Título financeiro não encontrado.")
        return titulo
