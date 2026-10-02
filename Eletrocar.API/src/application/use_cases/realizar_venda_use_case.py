"""
Caso de Uso: RealizarVendaBalcaoUseCase
Orquestra:
1. Validação e baixa atômica de estoque de cada peça vendida
2. Criação da entidade VendaBalcao e cálculo de totais/desconto
3. Entrada automática no Caixa Diário aberto
4. Registro de log de auditoria imutável
"""
from decimal import Decimal
from typing import List
import uuid
from src.domain.entities.venda_balcao import VendaBalcao
from src.domain.entities.auditoria import LogAuditoria
from src.domain.value_objects.enums import TipoMovimentacaoCaixa
from src.domain.repositories.interfaces import (
    PecaRepositoryInterface,
    VendaBalcaoRepositoryInterface,
    CaixaRepositoryInterface,
    AuditoriaRepositoryInterface
)
from src.domain.exceptions.domain_exceptions import (
    EntidadeNaoEncontradaException,
    EstoqueInsuficienteException,
    RegraNegocioException
)
from src.application.dtos.venda_dtos import (
    RealizarVendaInputDTO,
    VendaOutputDTO,
    ItemVendaOutputDTO
)


class RealizarVendaBalcaoUseCase:
    def __init__(
        self,
        peca_repo: PecaRepositoryInterface,
        venda_repo: VendaBalcaoRepositoryInterface,
        caixa_repo: CaixaRepositoryInterface,
        audit_repo: AuditoriaRepositoryInterface
    ):
        self.peca_repo = peca_repo
        self.venda_repo = venda_repo
        self.caixa_repo = caixa_repo
        self.audit_repo = audit_repo

    async def executar(self, input_dto: RealizarVendaInputDTO) -> VendaOutputDTO:
        if not input_dto.itens:
            raise RegraNegocioException("A venda deve conter ao menos um item.")

        # Fase 1: Validação prévia de todas as peças e estoques disponíveis (Fail-Fast)
        pecas_para_baixar = []
        for item_in in input_dto.itens:
            peca = await self.peca_repo.buscar_por_id(item_in.peca_id)
            if not peca:
                raise EntidadeNaoEncontradaException(f"Peça com ID {item_in.peca_id} não encontrada.")
            if peca.estoque_atual < item_in.quantidade:
                raise EstoqueInsuficienteException(
                    peca_descricao=peca.descricao,
                    estoque_atual=peca.estoque_atual,
                    quantidade_requisitada=item_in.quantidade
                )
            preco = item_in.preco_unitario_customizado or peca.preco_venda
            pecas_para_baixar.append((peca, item_in.quantidade, preco))

        # Fase 2: Instanciação e cálculo da venda
        numero_venda = await self.venda_repo.obter_proximo_numero_venda()
        venda = VendaBalcao(
            id=uuid.uuid4(),
            numero_venda=numero_venda,
            operador_id=input_dto.operador_id,
            cliente_id=input_dto.cliente_id
        )

        for peca, qtd, preco in pecas_para_baixar:
            venda.adicionar_item(
                peca_id=peca.id,
                descricao_peca=peca.descricao,
                quantidade=qtd,
                preco_unitario=preco
            )

        if input_dto.desconto > Decimal("0.00"):
            venda.aplicar_desconto(input_dto.desconto)

        venda.finalizar(input_dto.forma_pagamento)

        # Fase 3: Efetivação da baixa atômica no estoque
        for peca, qtd, _ in pecas_para_baixar:
            peca.baixar_estoque(qtd)
            await self.peca_repo.salvar(peca)

        # Fase 4: Registro da venda
        venda_salva = await self.venda_repo.salvar(venda)

        # Fase 5: Movimentação no Caixa Diário (se houver caixa aberto)
        caixa_aberto = await self.caixa_repo.obter_caixa_aberto()
        if caixa_aberto:
            caixa_aberto.registrar_movimentacao(
                tipo=TipoMovimentacaoCaixa.ENTRADA_VENDA,
                valor=venda.valor_total,
                forma_pagamento=input_dto.forma_pagamento,
                descricao=f"Venda no Balcão #{venda.numero_venda}"
            )
            await self.caixa_repo.salvar(caixa_aberto)

        # Fase 6: Auditoria Imutável
        await self.audit_repo.registrar(
            LogAuditoria(
                id=uuid.uuid4(),
                usuario_id=input_dto.operador_id,
                origem="BALCAO_PDV",
                acao="VENDA_BALCAO_FINALIZADA",
                detalhes={
                    "venda_id": str(venda.id),
                    "numero_venda": venda.numero_venda,
                    "valor_total": str(venda.valor_total),
                    "forma_pagamento": venda.forma_pagamento.value if venda.forma_pagamento else None,
                    "qtd_itens": len(venda.itens)
                }
            )
        )

        return VendaOutputDTO(
            id=venda_salva.id,
            numero_venda=venda_salva.numero_venda,
            operador_id=venda_salva.operador_id,
            cliente_id=venda_salva.cliente_id,
            itens=[
                ItemVendaOutputDTO(
                    id=it.id,
                    peca_id=it.peca_id,
                    descricao_peca=it.descricao_peca,
                    quantidade=it.quantidade,
                    preco_unitario=it.preco_unitario,
                    subtotal=it.subtotal
                )
                for it in venda_salva.itens
            ],
            subtotal=venda_salva.subtotal,
            desconto=venda_salva.desconto,
            valor_total=venda_salva.valor_total,
            forma_pagamento=venda_salva.forma_pagamento.value if venda_salva.forma_pagamento else "",
            status=venda_salva.status.value,
            data_hora=venda_salva.created_at,
            sucesso=True
        )
