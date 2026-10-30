"""
Caso de Uso: RealizarVendaBalcaoUseCase (UC02)
Orquestra, em uma única transação ACID:
1. Pré-condição: caixa do turno aberto
2. Bloqueio das peças (SELECT ... FOR UPDATE, em ordem determinística) e validação do saldo disponível
3. Alçada gerencial para desconto acima do limite ou alteração de preço (UC04)
4. Pagamento: PIX com cobrança liquidada, formas a prazo (conta a receber) ou entrada no caixa
5. Baixa de estoque, registro da venda e auditoria imutável (venda, desconto e preço)
"""
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import uuid
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.entities.peca import Peca
from src.domain.entities.auditoria import novo_log
from src.domain.services.politica_alcada_service import PoliticaAlcadaService
from src.domain.value_objects.enums import TipoMovimentacaoCaixa, CategoriaTitulo
from src.domain.repositories.interfaces import (
    PecaRepositoryInterface,
    VendaBalcaoRepositoryInterface,
    CaixaRepositoryInterface,
    AuditoriaRepositoryInterface,
    UsuarioRepositoryInterface,
    TituloFinanceiroRepositoryInterface,
    CobrancaPixRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import (
    EntidadeNaoEncontradaException,
    RegraNegocioException,
    CaixaFechadoException,
)
from src.application.services.validador_alcada import ValidadorAlcadaGerencial
from src.application.services.pagamentos import consumir_cobranca_pix, gerar_titulo_a_receber
from src.application.dtos.venda_dtos import RealizarVendaInputDTO, VendaOutputDTO

ORIGEM = "BALCAO_PDV"


class RealizarVendaBalcaoUseCase:
    def __init__(
        self,
        peca_repo: PecaRepositoryInterface,
        venda_repo: VendaBalcaoRepositoryInterface,
        caixa_repo: CaixaRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface,
        usuario_repo: UsuarioRepositoryInterface,
        titulo_repo: TituloFinanceiroRepositoryInterface,
        cobranca_repo: CobrancaPixRepositoryInterface,
        validador_alcada: ValidadorAlcadaGerencial,
        limite_desconto_percentual: Decimal = Decimal("5"),
        prazo_faturado_dias: int = 30,
    ):
        self.peca_repo = peca_repo
        self.venda_repo = venda_repo
        self.caixa_repo = caixa_repo
        self.audit_repo = audit_repo
        self.usuario_repo = usuario_repo
        self.titulo_repo = titulo_repo
        self.cobranca_repo = cobranca_repo
        self.validador_alcada = validador_alcada
        self.limite_desconto_percentual = limite_desconto_percentual
        self.prazo_faturado_dias = prazo_faturado_dias

    async def executar(self, dto: RealizarVendaInputDTO) -> VendaOutputDTO:
        if not dto.itens:
            raise RegraNegocioException("A venda deve conter ao menos um item.")
        if dto.forma_pagamento.a_prazo and not dto.cliente_id:
            raise RegraNegocioException(f"Venda '{dto.forma_pagamento.value}' exige a identificação do cliente.")

        caixa = await self.caixa_repo.obter_caixa_aberto()
        if not caixa:
            raise CaixaFechadoException("Não há caixa aberto. Abra o caixa do turno antes de vender.")

        pecas = await self._bloquear_e_validar_estoque(dto)

        venda = VendaBalcao(
            id=uuid.uuid4(),
            numero_venda=await self.venda_repo.obter_proximo_numero_venda(),
            operador_id=dto.operador_id,
            cliente_id=dto.cliente_id,
        )
        precos_alterados: List[Tuple[Peca, Decimal]] = []
        for item in dto.itens:
            peca = pecas[item.peca_id]
            preco = peca.preco_venda
            if item.preco_unitario_customizado is not None and item.preco_unitario_customizado != peca.preco_venda:
                preco = item.preco_unitario_customizado
                precos_alterados.append((peca, preco))
            venda.adicionar_item(peca.id, peca.descricao, item.quantidade, preco, peca.preco_custo)

        if dto.desconto_percentual is not None:
            venda.aplicar_desconto_percentual(dto.desconto_percentual)
        elif dto.desconto > Decimal("0.00"):
            venda.aplicar_desconto(dto.desconto)

        if PoliticaAlcadaService.exige_autorizacao(
            venda.subtotal, venda.desconto, self.limite_desconto_percentual, bool(precos_alterados)
        ):
            operador = await self.usuario_repo.buscar_por_id(dto.operador_id)
            venda.autorizado_por_id = await self.validador_alcada.autorizar(operador, dto.autorizacao)

        venda.referencia_pagamento = await consumir_cobranca_pix(
            self.cobranca_repo, dto.cobranca_pix_id, dto.forma_pagamento, venda.valor_total, venda.numero_venda
        )
        venda.finalizar(dto.forma_pagamento)

        for peca_id, quantidade in venda.quantidades_por_peca().items():
            peca = pecas[peca_id]
            peca.baixar_estoque(quantidade)
            await self.peca_repo.salvar(peca)

        await self.venda_repo.salvar(venda)
        await self._registrar_pagamento(venda, caixa)
        await self._auditar(venda, precos_alterados)
        return VendaOutputDTO.de(venda)

    async def _bloquear_e_validar_estoque(self, dto: RealizarVendaInputDTO) -> Dict[uuid.UUID, Peca]:
        quantidades: Dict[uuid.UUID, int] = {}
        for item in dto.itens:
            quantidades[item.peca_id] = quantidades.get(item.peca_id, 0) + item.quantidade

        pecas: Dict[uuid.UUID, Peca] = {}
        # Ordem determinística de bloqueio evita deadlock entre vendas simultâneas
        for peca_id in sorted(quantidades, key=str):
            peca = await self.peca_repo.buscar_por_id_para_atualizacao(peca_id)
            if not peca or not peca.ativo:
                raise EntidadeNaoEncontradaException(f"Peça com ID {peca_id} não encontrada.")
            pecas[peca_id] = peca

        # Valida todo o carrinho antes de qualquer baixa (fail-fast, sem efeitos parciais)
        for peca_id, quantidade in quantidades.items():
            pecas[peca_id].validar_saldo(quantidade)
        return pecas

    async def _registrar_pagamento(self, venda: VendaBalcao, caixa):
        if venda.forma_pagamento.a_prazo:
            await gerar_titulo_a_receber(
                self.titulo_repo,
                descricao=f"Venda {venda.numero_venda} ({venda.forma_pagamento.value})",
                valor=venda.valor_total,
                categoria=CategoriaTitulo.VENDA_A_PRAZO,
                cliente_id=venda.cliente_id,
                prazo_dias=self.prazo_faturado_dias,
                venda_id=venda.id,
            )
        elif venda.valor_total > Decimal("0.00"):
            caixa.registrar_movimentacao(
                TipoMovimentacaoCaixa.ENTRADA_VENDA,
                venda.valor_total,
                venda.forma_pagamento,
                f"Venda no Balcão #{venda.numero_venda}"
            )
            await self.caixa_repo.salvar(caixa)

    async def _auditar(self, venda: VendaBalcao, precos_alterados: List[Tuple[Peca, Decimal]]):
        autorizado = {"autorizado_por_id": str(venda.autorizado_por_id)} if venda.autorizado_por_id else {}
        await self.audit_repo.registrar(novo_log(
            venda.operador_id, ORIGEM, "VENDA_BALCAO_FINALIZADA",
            detalhes={
                "venda_id": str(venda.id),
                "numero_venda": venda.numero_venda,
                "valor_total": str(venda.valor_total),
                "forma_pagamento": venda.forma_pagamento.value,
                "qtd_itens": len(venda.itens),
            }
        ))
        if venda.desconto > Decimal("0.00"):
            await self.audit_repo.registrar(novo_log(
                venda.operador_id, ORIGEM, "DESCONTO_APLICADO",
                detalhes={"venda_id": str(venda.id), "numero_venda": venda.numero_venda, **autorizado},
                antes={"desconto": "0.00"},
                depois={"desconto": str(venda.desconto), "percentual": str(venda.percentual_desconto)},
            ))
        for peca, preco in precos_alterados:
            await self.audit_repo.registrar(novo_log(
                venda.operador_id, ORIGEM, "PRECO_ALTERADO_NA_VENDA",
                detalhes={"venda_id": str(venda.id), "peca_id": str(peca.id), "sku": peca.sku, **autorizado},
                antes={"preco_unitario": str(peca.preco_venda)},
                depois={"preco_unitario": str(preco)},
            ))
