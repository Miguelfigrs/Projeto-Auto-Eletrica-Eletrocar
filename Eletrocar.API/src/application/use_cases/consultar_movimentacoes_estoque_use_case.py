"""
Caso de Uso: ConsultarMovimentacoesEstoqueUseCase (Histórico de entradas e saídas de peças)
Reconstrói o histórico do período a partir dos fatos que alteram o saldo físico:
- SAÍDA por venda de balcão (data da venda) e ENTRADA pelo estorno do cancelamento (data do cancelamento);
- SAÍDA por Ordem de Serviço finalizada (baixa definitiva das peças reservadas);
- ENTRADA de fornecedor, AJUSTE de inventário e saldo inicial do CADASTRO (logs imutáveis de auditoria).
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional
import uuid
from src.domain.entities.peca import Peca
from src.domain.value_objects.enums import StatusVenda
from src.domain.value_objects.tempo import limites_utc
from src.domain.repositories.interfaces import (
    VendaBalcaoRepositoryInterface,
    OrdemServicoRepositoryInterface,
    AuditoriaRepositoryInterface,
    PecaRepositoryInterface,
    UsuarioRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import RegraNegocioException

ENTRADA = "ENTRADA"
SAIDA = "SAIDA"

ACOES_ESTOQUE = ["ESTOQUE_ENTRADA", "ESTOQUE_AJUSTADO", "PECA_CADASTRADA"]


@dataclass
class MovimentacaoEstoqueDTO:
    data: datetime
    tipo: str          # ENTRADA | SAIDA
    origem: str        # VENDA | CANCELAMENTO_VENDA | ORDEM_SERVICO | ENTRADA_FORNECEDOR | AJUSTE_INVENTARIO | CADASTRO
    quantidade: int    # sempre positiva; o sentido está em `tipo`
    peca_id: Optional[str]
    sku: Optional[str]
    descricao: str
    documento: Optional[str] = None
    valor_unitario: Optional[Decimal] = None
    usuario: Optional[str] = None
    observacao: Optional[str] = None


@dataclass
class MovimentacoesEstoqueOutputDTO:
    periodo: str
    total_entradas: int
    total_saidas: int
    movimentacoes: List[MovimentacaoEstoqueDTO] = field(default_factory=list)


class ConsultarMovimentacoesEstoqueUseCase:
    def __init__(
        self,
        venda_repo: VendaBalcaoRepositoryInterface,
        os_repo: OrdemServicoRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface,
        peca_repo: PecaRepositoryInterface,
        usuario_repo: Optional[UsuarioRepositoryInterface] = None,
        fuso: str = "UTC",
    ):
        self.fuso = fuso
        self.venda_repo = venda_repo
        self.os_repo = os_repo
        self.audit_repo = audit_repo
        self.peca_repo = peca_repo
        self.usuario_repo = usuario_repo
        self._pecas: Dict[uuid.UUID, Optional[Peca]] = {}
        self._usuarios: Dict[uuid.UUID, Optional[str]] = {}

    async def executar(
        self,
        data_inicio: date,
        data_fim: date,
        peca_id: Optional[uuid.UUID] = None,
        tipo: Optional[str] = None,
    ) -> MovimentacoesEstoqueOutputDTO:
        if data_fim < data_inicio:
            raise RegraNegocioException("A data final do período deve ser maior ou igual à inicial.")
        tipo = tipo.upper() if tipo else None
        if tipo not in (None, ENTRADA, SAIDA):
            raise RegraNegocioException("Tipo de movimentação inválido. Use ENTRADA ou SAIDA.")
        inicio, fim = limites_utc(data_inicio, data_fim, self.fuso)

        movs: List[MovimentacaoEstoqueDTO] = []
        movs += await self._de_vendas(inicio, fim)
        movs += await self._de_ordens(inicio, fim)
        movs += await self._de_auditoria(inicio, fim)

        if peca_id is not None:
            movs = [m for m in movs if m.peca_id == str(peca_id)]
        if tipo is not None:
            movs = [m for m in movs if m.tipo == tipo]
        movs.sort(key=lambda m: m.data, reverse=True)

        return MovimentacoesEstoqueOutputDTO(
            periodo=f"{data_inicio.strftime('%d/%m/%Y')} a {data_fim.strftime('%d/%m/%Y')}",
            total_entradas=sum(m.quantidade for m in movs if m.tipo == ENTRADA),
            total_saidas=sum(m.quantidade for m in movs if m.tipo == SAIDA),
            movimentacoes=movs,
        )

    # ---- Fontes ------------------------------------------------------------------------------

    async def _de_vendas(self, inicio: datetime, fim: datetime) -> List[MovimentacaoEstoqueDTO]:
        movs = []
        for venda in await self.venda_repo.listar_movimentadas_no_periodo(inicio, fim):
            operador = await self._nome_usuario(venda.operador_id)
            for item in venda.itens:
                sku = await self._sku(item.peca_id)
                if inicio <= venda.created_at <= fim:
                    movs.append(MovimentacaoEstoqueDTO(
                        data=venda.created_at, tipo=SAIDA, origem="VENDA", quantidade=item.quantidade,
                        peca_id=str(item.peca_id), sku=sku, descricao=item.descricao_peca,
                        documento=venda.numero_venda, valor_unitario=item.preco_unitario, usuario=operador,
                    ))
                if (venda.status == StatusVenda.CANCELADA and venda.cancelada_em
                        and inicio <= venda.cancelada_em <= fim):
                    movs.append(MovimentacaoEstoqueDTO(
                        data=venda.cancelada_em, tipo=ENTRADA, origem="CANCELAMENTO_VENDA",
                        quantidade=item.quantidade, peca_id=str(item.peca_id), sku=sku,
                        descricao=item.descricao_peca, documento=venda.numero_venda,
                        valor_unitario=item.preco_unitario, observacao=venda.motivo_cancelamento,
                    ))
        return movs

    async def _de_ordens(self, inicio: datetime, fim: datetime) -> List[MovimentacaoEstoqueDTO]:
        movs = []
        for os in await self.os_repo.listar_finalizadas_no_periodo(inicio, fim):
            for item in os.itens:
                movs.append(MovimentacaoEstoqueDTO(
                    data=os.finalizada_em, tipo=SAIDA, origem="ORDEM_SERVICO", quantidade=item.quantidade,
                    peca_id=str(item.peca_id), sku=await self._sku(item.peca_id), descricao=item.descricao_peca,
                    documento=os.numero_os, valor_unitario=item.preco_unitario,
                ))
        return movs

    async def _de_auditoria(self, inicio: datetime, fim: datetime) -> List[MovimentacaoEstoqueDTO]:
        movs = []
        for log in await self.audit_repo.listar_por_acoes_no_periodo(ACOES_ESTOQUE, inicio, fim):
            detalhes = log.detalhes or {}
            depois = log.payload_depois or {}
            peca_uuid = self._uuid(detalhes.get("peca_id"))
            peca = await self._peca(peca_uuid) if peca_uuid else None
            base = dict(
                data=log.timestamp,
                peca_id=str(peca_uuid) if peca_uuid else None,
                sku=detalhes.get("sku") or (peca.sku if peca else None),
                descricao=peca.descricao if peca else (detalhes.get("sku") or "Peça removida"),
                usuario=await self._nome_usuario(log.usuario_id),
            )
            if log.acao == "ESTOQUE_ENTRADA":
                quantidade = int(detalhes.get("quantidade") or 0)
                if quantidade > 0:
                    movs.append(MovimentacaoEstoqueDTO(
                        tipo=ENTRADA, origem="ENTRADA_FORNECEDOR", quantidade=quantidade,
                        valor_unitario=self._decimal(depois.get("preco_custo")),
                        observacao=detalhes.get("observacao") or None, **base,
                    ))
            elif log.acao == "ESTOQUE_AJUSTADO":
                diferenca = int(detalhes.get("diferenca") or 0)
                if diferenca != 0:
                    movs.append(MovimentacaoEstoqueDTO(
                        tipo=ENTRADA if diferenca > 0 else SAIDA, origem="AJUSTE_INVENTARIO",
                        quantidade=abs(diferenca), observacao=detalhes.get("motivo") or None, **base,
                    ))
            elif log.acao == "PECA_CADASTRADA":
                quantidade = int(depois.get("estoque_atual") or 0)
                if quantidade > 0:
                    movs.append(MovimentacaoEstoqueDTO(
                        tipo=ENTRADA, origem="CADASTRO", quantidade=quantidade,
                        valor_unitario=self._decimal(depois.get("preco_custo")),
                        observacao="Saldo inicial do cadastro", **base,
                    ))
        return movs

    # ---- Auxiliares --------------------------------------------------------------------------

    async def _peca(self, peca_id: uuid.UUID) -> Optional[Peca]:
        if peca_id not in self._pecas:
            self._pecas[peca_id] = await self.peca_repo.buscar_por_id(peca_id)
        return self._pecas[peca_id]

    async def _sku(self, peca_id: uuid.UUID) -> Optional[str]:
        peca = await self._peca(peca_id)
        return peca.sku if peca else None

    async def _nome_usuario(self, usuario_id: Optional[uuid.UUID]) -> Optional[str]:
        if usuario_id is None or self.usuario_repo is None:
            return None
        if usuario_id not in self._usuarios:
            usuario = await self.usuario_repo.buscar_por_id(usuario_id)
            self._usuarios[usuario_id] = usuario.nome if usuario else None
        return self._usuarios[usuario_id]

    @staticmethod
    def _uuid(valor) -> Optional[uuid.UUID]:
        try:
            return uuid.UUID(str(valor)) if valor else None
        except ValueError:
            return None

    @staticmethod
    def _decimal(valor) -> Optional[Decimal]:
        try:
            return Decimal(str(valor)) if valor is not None else None
        except InvalidOperation:
            return None
