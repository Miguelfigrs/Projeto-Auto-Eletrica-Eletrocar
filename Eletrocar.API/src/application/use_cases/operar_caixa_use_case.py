"""
Caso de Uso: OperarCaixaUseCase (UC10)
Abertura de caixa, sangrias, suprimentos e fechamento cego de turno.
O operador informa os valores contados sem visualizar o saldo teórico;
o relatório de quebra/sobra por meio de pagamento é emitido exclusivamente para a gerência.
"""
from decimal import Decimal
from typing import Optional
import uuid
from src.domain.entities.caixa import CaixaDiario
from src.domain.entities.auditoria import novo_log
from src.domain.value_objects.enums import TipoMovimentacaoCaixa, StatusCaixa
from src.domain.repositories.interfaces import CaixaRepositoryInterface, AuditoriaRepositoryInterface
from src.domain.exceptions.domain_exceptions import (
    RegraNegocioException,
    CaixaFechadoException,
    EntidadeNaoEncontradaException,
)
from src.application.dtos.caixa_dtos import (
    AbrirCaixaInputDTO,
    MovimentarCaixaInputDTO,
    FechamentoCegoInputDTO,
    CaixaOperadorOutputDTO,
    CaixaGerencialOutputDTO,
    MovimentacaoOutputDTO,
    FechamentoCegoConfirmacaoDTO,
    RelatorioFechamentoOutputDTO,
    ConciliacaoFormaDTO,
)

MOVIMENTACOES_MANUAIS = (TipoMovimentacaoCaixa.SANGRIA, TipoMovimentacaoCaixa.SUPRIMENTO)
ORIGEM = "CAIXA"


class OperarCaixaUseCase:
    def __init__(self, caixa_repo: CaixaRepositoryInterface, audit_repo: AuditoriaRepositoryInterface):
        self.caixa_repo = caixa_repo
        self.audit_repo = audit_repo

    async def abrir_caixa(self, dto: AbrirCaixaInputDTO) -> CaixaOperadorOutputDTO:
        if await self.caixa_repo.obter_caixa_aberto():
            raise RegraNegocioException("Já existe um caixa aberto. Finalize o caixa anterior antes de abrir um novo.")

        caixa = CaixaDiario(id=uuid.uuid4(), operador_id=dto.operador_id, saldo_inicial=dto.saldo_inicial)
        await self.caixa_repo.salvar(caixa)
        await self.audit_repo.registrar(novo_log(
            dto.operador_id, ORIGEM, "CAIXA_ABERTO",
            detalhes={"caixa_id": str(caixa.id), "saldo_inicial": str(caixa.saldo_inicial)}
        ))
        return self._visao_operador(caixa)

    async def registrar_movimentacao(self, dto: MovimentarCaixaInputDTO) -> MovimentacaoOutputDTO:
        try:
            tipo = TipoMovimentacaoCaixa(str(dto.tipo).upper())
        except ValueError:
            tipo = None
        if tipo not in MOVIMENTACOES_MANUAIS:
            raise RegraNegocioException("Movimentação manual de caixa aceita apenas SANGRIA ou SUPRIMENTO.")

        caixa = await self.caixa_repo.obter_caixa_aberto()
        if not caixa:
            raise CaixaFechadoException("Não há caixa aberto para registrar movimentação.")

        mov = caixa.registrar_movimentacao(tipo, dto.valor, dto.forma_pagamento, dto.descricao or tipo.value)
        await self.caixa_repo.salvar(caixa)
        await self.audit_repo.registrar(novo_log(
            dto.operador_id, ORIGEM, f"CAIXA_{tipo.value}",
            detalhes={
                "caixa_id": str(caixa.id),
                "valor": str(mov.valor),
                "forma_pagamento": mov.forma_pagamento.value,
                "descricao": mov.descricao,
            }
        ))
        return self._mov_dto(mov)

    async def fechar_caixa_cego(self, dto: FechamentoCegoInputDTO) -> FechamentoCegoConfirmacaoDTO:
        caixa = await self.caixa_repo.obter_caixa_aberto()
        if not caixa:
            raise CaixaFechadoException("Não há nenhum caixa aberto para ser fechado.")

        resultado = caixa.fechar_cego(dto.valores_contados)
        await self.caixa_repo.salvar(caixa)
        await self.audit_repo.registrar(novo_log(
            dto.operador_id, ORIGEM, "CAIXA_FECHAMENTO_CEGO",
            detalhes={
                "caixa_id": str(caixa.id),
                "valores_contados": {f.value: str(v) for f, v in caixa.totais_informados_fechamento.items()},
                "diferenca_total": str(resultado.diferenca_total),
                "diagnostico": resultado.status,
            }
        ))
        return FechamentoCegoConfirmacaoDTO(caixa_id=caixa.id, data_fechamento=caixa.data_fechamento)

    async def consultar_caixa_aberto(self) -> Optional[CaixaOperadorOutputDTO]:
        caixa = await self.caixa_repo.obter_caixa_aberto()
        return self._visao_operador(caixa) if caixa else None

    async def consultar_caixa_gerencial(self, caixa_id: Optional[uuid.UUID] = None) -> Optional[CaixaGerencialOutputDTO]:
        caixa = await self.caixa_repo.buscar_por_id(caixa_id) if caixa_id else await self.caixa_repo.obter_caixa_aberto()
        if not caixa:
            return None
        return CaixaGerencialOutputDTO(
            id=caixa.id,
            operador_id=caixa.operador_id,
            status=caixa.status.value,
            saldo_inicial=caixa.saldo_inicial,
            saldo_teorico_dinheiro=caixa.saldo_teorico,
            totais_por_forma={f.value: v for f, v in caixa.calcular_total_por_forma_pagamento().items()},
            data_abertura=caixa.data_abertura,
            data_fechamento=caixa.data_fechamento,
            movimentacoes=[self._mov_dto(m) for m in caixa.movimentacoes],
        )

    async def relatorio_fechamento(self, caixa_id: uuid.UUID) -> RelatorioFechamentoOutputDTO:
        caixa = await self.caixa_repo.buscar_por_id(caixa_id)
        if not caixa:
            raise EntidadeNaoEncontradaException("Caixa não encontrado.")
        resultado = caixa.relatorio_fechamento()
        formas = sorted(resultado.diferencas_por_forma, key=lambda f: f.value)
        return RelatorioFechamentoOutputDTO(
            caixa_id=caixa.id,
            operador_id=caixa.operador_id,
            data_abertura=caixa.data_abertura,
            data_fechamento=caixa.data_fechamento,
            formas=[
                ConciliacaoFormaDTO(
                    forma_pagamento=f.value,
                    teorico=resultado.saldo_teorico_por_forma.get(f, Decimal("0.00")),
                    contado=resultado.saldo_contado_por_forma.get(f, Decimal("0.00")),
                    diferenca=resultado.diferencas_por_forma[f],
                )
                for f in formas
            ],
            diferenca_total=resultado.diferenca_total,
            status=resultado.status,
        )

    @staticmethod
    def _visao_operador(caixa: CaixaDiario) -> CaixaOperadorOutputDTO:
        return CaixaOperadorOutputDTO(
            id=caixa.id,
            operador_id=caixa.operador_id,
            status=caixa.status.value,
            saldo_inicial=caixa.saldo_inicial,
            data_abertura=caixa.data_abertura,
            quantidade_movimentacoes=len(caixa.movimentacoes),
        )

    @staticmethod
    def _mov_dto(m) -> MovimentacaoOutputDTO:
        return MovimentacaoOutputDTO(
            id=m.id, tipo=m.tipo.value, valor=m.valor, forma_pagamento=m.forma_pagamento.value,
            descricao=m.descricao, created_at=m.created_at
        )
