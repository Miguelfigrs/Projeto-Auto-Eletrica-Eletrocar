"""
Caso de Uso: EmitirComprovanteUseCase (RF22)
Monta recibo de venda e orçamento de OS em colunas para impressora térmica (80mm = 48 col.,
58mm = 32 col.) e o link de envio pelo WhatsApp. A renderização em PDF fica na infraestrutura.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional
from urllib.parse import quote
import re
import textwrap
import uuid
from src.domain.repositories.interfaces import (
    VendaBalcaoRepositoryInterface,
    OrdemServicoRepositoryInterface,
    ClienteRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException, RegraNegocioException

COLUNAS_POR_BOBINA = {80: 48, 58: 32}


@dataclass
class ComprovanteDTO:
    titulo: str
    largura_mm: int
    linhas: List[str] = field(default_factory=list)
    link_whatsapp: Optional[str] = None

    @property
    def texto(self) -> str:
        return "\n".join(self.linhas)


def formatar_valor(valor: Decimal) -> str:
    texto = f"{Decimal(valor):,.2f}"
    return texto.replace(",", "X").replace(".", ",").replace("X", ".")


def montar_link_whatsapp(telefone: Optional[str], texto: str) -> Optional[str]:
    digitos = re.sub(r"\D", "", telefone or "")
    if len(digitos) in (10, 11):
        digitos = "55" + digitos
    if len(digitos) < 12:
        return None
    return f"https://wa.me/{digitos}?text={quote(texto)}"


class _Layout:
    def __init__(self, colunas: int):
        self.colunas = colunas
        self.linhas: List[str] = []

    def centro(self, texto: str):
        for parte in textwrap.wrap(texto, self.colunas) or [""]:
            self.linhas.append(parte.center(self.colunas).rstrip())

    def texto(self, texto: str):
        self.linhas.extend(textwrap.wrap(texto, self.colunas) or [""])

    def separador(self):
        self.linhas.append("-" * self.colunas)

    def par(self, esquerda: str, direita: str):
        espaco = self.colunas - len(direita) - 1
        esquerda = esquerda[:max(espaco, 0)]
        self.linhas.append(f"{esquerda} {direita.rjust(self.colunas - len(esquerda) - 1)}")

    def item(self, descricao: str, quantidade: int, unitario: Decimal, subtotal: Decimal):
        self.texto(descricao)
        self.par(f"  {quantidade} x {formatar_valor(unitario)}", formatar_valor(subtotal))


class EmitirComprovanteUseCase:
    def __init__(
        self,
        venda_repo: VendaBalcaoRepositoryInterface,
        os_repo: OrdemServicoRepositoryInterface,
        cliente_repo: ClienteRepositoryInterface,
        nome_empresa: str = "AUTO ELETRICA ELETROCAR",
    ):
        self.venda_repo = venda_repo
        self.os_repo = os_repo
        self.cliente_repo = cliente_repo
        self.nome_empresa = nome_empresa

    async def recibo_venda(self, venda_id: uuid.UUID, largura_mm: int = 80) -> ComprovanteDTO:
        layout = _Layout(self._colunas(largura_mm))
        venda = await self.venda_repo.buscar_por_id(venda_id)
        if not venda:
            raise EntidadeNaoEncontradaException("Venda não encontrada.")
        cliente = await self.cliente_repo.buscar_por_id(venda.cliente_id) if venda.cliente_id else None

        self._cabecalho(layout, "RECIBO DE VENDA")
        layout.texto(f"Venda: {venda.numero_venda}")
        layout.texto(f"Data: {venda.created_at.strftime('%d/%m/%Y %H:%M')}")
        if cliente:
            layout.texto(f"Cliente: {cliente.nome}")
        layout.separador()
        for item in venda.itens:
            layout.item(item.descricao_peca, item.quantidade, item.preco_unitario, item.subtotal)
        layout.separador()
        layout.par("Subtotal", formatar_valor(venda.subtotal))
        if venda.desconto > 0:
            layout.par("Desconto", "-" + formatar_valor(venda.desconto))
        layout.par("TOTAL R$", formatar_valor(venda.valor_total))
        layout.texto(f"Pagamento: {venda.forma_pagamento.value if venda.forma_pagamento else '-'}")
        if venda.status.value == "CANCELADA":
            layout.centro("*** VENDA CANCELADA ***")
        layout.separador()
        layout.centro("Obrigado pela preferencia!")

        comprovante = ComprovanteDTO(titulo=f"Recibo {venda.numero_venda}", largura_mm=largura_mm, linhas=layout.linhas)
        comprovante.link_whatsapp = montar_link_whatsapp(cliente.telefone if cliente else None, comprovante.texto)
        return comprovante

    async def orcamento_os(self, os_id: uuid.UUID, largura_mm: int = 80) -> ComprovanteDTO:
        layout = _Layout(self._colunas(largura_mm))
        os = await self.os_repo.buscar_por_id(os_id)
        if not os:
            raise EntidadeNaoEncontradaException("Ordem de serviço não encontrada.")
        cliente = await self.cliente_repo.buscar_por_id(os.cliente_id)
        carro = cliente.buscar_carro_por_id(os.carro_id) if cliente else None

        self._cabecalho(layout, "ORCAMENTO DE SERVICO")
        layout.texto(f"OS: {os.numero_os}  Status: {os.status.value}")
        layout.texto(f"Data: {os.created_at.strftime('%d/%m/%Y %H:%M')}")
        if cliente:
            layout.texto(f"Cliente: {cliente.nome}")
        if carro:
            layout.texto(f"Veiculo: {carro.formatar_descricao()}")
        if os.sintomas:
            layout.texto(f"Sintomas: {os.sintomas}")
        layout.separador()
        if os.itens:
            layout.texto("PECAS")
            for item in os.itens:
                layout.item(item.descricao_peca, item.quantidade, item.preco_unitario, item.subtotal)
        if os.servicos:
            layout.texto("SERVICOS")
            for servico in os.servicos:
                layout.texto(servico.descricao)
                layout.par("", formatar_valor(servico.valor))
        layout.separador()
        layout.par("Pecas", formatar_valor(os.valor_pecas))
        layout.par("Mao de obra", formatar_valor(os.valor_servicos))
        if os.desconto > 0:
            layout.par("Desconto", "-" + formatar_valor(os.desconto))
        layout.par("TOTAL R$", formatar_valor(os.valor_total))
        layout.separador()
        layout.centro("Orcamento valido por 7 dias")

        comprovante = ComprovanteDTO(titulo=f"Orçamento {os.numero_os}", largura_mm=largura_mm, linhas=layout.linhas)
        comprovante.link_whatsapp = montar_link_whatsapp(cliente.telefone if cliente else None, comprovante.texto)
        return comprovante

    def _cabecalho(self, layout: _Layout, titulo: str):
        layout.centro(self.nome_empresa)
        layout.separador()
        layout.centro(titulo)

    @staticmethod
    def _colunas(largura_mm: int) -> int:
        if largura_mm not in COLUNAS_POR_BOBINA:
            raise RegraNegocioException("Largura de bobina inválida. Use 80 ou 58 (mm).")
        return COLUNAS_POR_BOBINA[largura_mm]
