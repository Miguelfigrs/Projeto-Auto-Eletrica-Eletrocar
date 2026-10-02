"""
Caso de Uso: OperarCaixaUseCase
Abertura de caixa, sangrias, suprimentos e fechamento cego de turno para prevenção de furos financeiros.
"""
from typing import Optional
import uuid
from decimal import Decimal
from src.domain.entities.caixa import CaixaDiario
from src.domain.entities.auditoria import LogAuditoria
from src.domain.value_objects.enums import TipoMovimentacaoCaixa, StatusCaixa, FormaPagamento
from src.domain.repositories.interfaces import CaixaRepositoryInterface, AuditoriaRepositoryInterface
from src.domain.exceptions.domain_exceptions import RegraNegocioException, CaixaFechadoException
from src.application.dtos.caixa_dtos import (
    AbrirCaixaInputDTO,
    MovimentarCaixaInputDTO,
    FechamentoCegoInputDTO,
    CaixaOutputDTO,
    MovimentacaoOutputDTO,
    FechamentoCegoOutputDTO
)


class OperarCaixaUseCase:
    def __init__(self, caixa_repo: CaixaRepositoryInterface, audit_repo: AuditoriaRepositoryInterface):
        self.caixa_repo = caixa_repo
        self.audit_repo = audit_repo

    async def abrir_caixa(self, input_dto: AbrirCaixaInputDTO) -> CaixaOutputDTO:
        aberto = await self.caixa_repo.obter_caixa_aberto()
        if aberto:
            raise RegraNegocioException("Já existe um caixa aberto no momento. Finalize o caixa anterior antes de abrir um novo.")

        caixa = CaixaDiario(
            id=uuid.uuid4(),
            operador_id=input_dto.operador_id,
            saldo_inicial=input_dto.saldo_inicial,
            status=StatusCaixa.ABERTO
        )

        salvo = await self.caixa_repo.salvar(caixa)

        await self.audit_repo.registrar(
            LogAuditoria(
                id=uuid.uuid4(),
                usuario_id=input_dto.operador_id,
                origem="CAIXA",
                acao="CAIXA_ABERTO",
                detalhes={"caixa_id": str(caixa.id), "saldo_inicial": str(caixa.saldo_inicial)}
            )
        )

        return self._to_dto(salvo)

    async def registrar_movimentacao(self, input_dto: MovimentarCaixaInputDTO):
        caixa = await self.caixa_repo.obter_caixa_aberto()
        if not caixa:
            raise CaixaFechadoException("Não há caixa aberto para registrar movimentação.")

        tipo_enum = TipoMovimentacaoCaixa(input_dto.tipo)
        mov = caixa.registrar_movimentacao(
            tipo=tipo_enum,
            valor=input_dto.valor,
            forma_pagamento=input_dto.forma_pagamento,
            descricao=input_dto.descricao
        )

        await self.caixa_repo.salvar(caixa)

        await self.audit_repo.registrar(
            LogAuditoria(
                id=uuid.uuid4(),
                usuario_id=input_dto.operador_id,
                origem="CAIXA",
                acao=f"CAIXA_{input_dto.tipo}",
                detalhes={
                    "caixa_id": str(caixa.id),
                    "tipo": input_dto.tipo,
                    "valor": str(input_dto.valor),
                    "forma_pagamento": input_dto.forma_pagamento.value
                }
            )
        )

        return MovimentacaoOutputDTO(
            id=mov.id,
            tipo=mov.tipo.value,
            valor=mov.valor,
            forma_pagamento=mov.forma_pagamento.value,
            descricao=mov.descricao,
            created_at=mov.created_at
        )

    async def fechar_caixa_cego(self, input_dto: FechamentoCegoInputDTO) -> FechamentoCegoOutputDTO:
        caixa = await self.caixa_repo.obter_caixa_aberto()
        if not caixa:
            raise CaixaFechadoException("Não há nenhum caixa aberto para ser fechado.")

        resultado = caixa.fechar_cego(input_dto.valores_contados)
        await self.caixa_repo.salvar(caixa)

        await self.audit_repo.registrar(
            LogAuditoria(
                id=uuid.uuid4(),
                usuario_id=input_dto.operador_id,
                origem="CAIXA",
                acao="CAIXA_FECHAMENTO_CEGO",
                detalhes={
                    "caixa_id": str(caixa.id),
                    "saldo_teorico": str(resultado["saldo_teorico_dinheiro"]),
                    "saldo_contado": str(resultado["saldo_contado_dinheiro"]),
                    "diferenca": str(resultado["diferenca_total"]),
                    "diagnostico": resultado["quebra_ou_sobra"]
                }
            )
        )

        return FechamentoCegoOutputDTO(
            caixa_id=caixa.id,
            saldo_teorico_dinheiro=resultado["saldo_teorico_dinheiro"],
            saldo_contado_dinheiro=resultado["saldo_contado_dinheiro"],
            diferenca_total=resultado["diferenca_total"],
            quebra_ou_sobra=resultado["quebra_ou_sobra"],
            data_fechamento=resultado["data_fechamento"],
            sucesso=True
        )

    async def consultar_caixa_aberto(self) -> Optional[CaixaOutputDTO]:
        caixa = await self.caixa_repo.obter_caixa_aberto()
        if not caixa:
            return None
        return self._to_dto(caixa)

    def _to_dto(self, c: CaixaDiario) -> CaixaOutputDTO:
        return CaixaOutputDTO(
            id=c.id,
            operador_id=c.operador_id,
            status=c.status.value,
            saldo_inicial=c.saldo_inicial,
            saldo_teorico=c.saldo_teorico,
            data_abertura=c.data_abertura,
            data_fechamento=c.data_fechamento,
            movimentacoes=[
                MovimentacaoOutputDTO(
                    id=m.id,
                    tipo=m.tipo.value,
                    valor=m.valor,
                    forma_pagamento=m.forma_pagamento.value,
                    descricao=m.descricao,
                    created_at=m.created_at
                )
                for m in c.movimentacoes
            ]
        )
