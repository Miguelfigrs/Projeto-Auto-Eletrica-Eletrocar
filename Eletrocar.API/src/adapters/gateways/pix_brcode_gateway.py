"""
Gateway PIX: gera o "copia e cola" (BR Code EMV-QRCPS do BACEN) com chave do recebedor, valor e txid.
A confirmação de liquidação chega pelo webhook do PSP/banco (POST /api/v1/pagamentos/pix/webhook).
Para cobrança dinâmica com payload hospedado no PSP, implemente outro PixGateway com a API do provedor.
"""
from decimal import Decimal
import unicodedata
from src.domain.gateways.interfaces import PixGateway, CobrancaPixGerada
from src.domain.exceptions.domain_exceptions import IntegracaoExternaException


def _campo(identificador: str, valor: str) -> str:
    return f"{identificador}{len(valor):02d}{valor}"


def _ascii(texto: str, limite: int) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return sem_acento.upper()[:limite]


def crc16_ccitt(payload: str) -> str:
    crc = 0xFFFF
    for byte in payload.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return f"{crc:04X}"


def gerar_br_code(chave: str, valor: Decimal, txid: str, nome: str, cidade: str, descricao: str = "") -> str:
    conta = _campo("00", "br.gov.bcb.pix") + _campo("01", chave)
    if descricao:
        conta += _campo("02", _ascii(descricao, 40))
    payload = (
        _campo("00", "01")
        + _campo("01", "12")  # QR de uso único
        + _campo("26", conta)
        + _campo("52", "0000")
        + _campo("53", "986")  # BRL
        + _campo("54", f"{Decimal(valor):.2f}")
        + _campo("58", "BR")
        + _campo("59", _ascii(nome, 25))
        + _campo("60", _ascii(cidade, 15))
        + _campo("62", _campo("05", txid))
        + "6304"
    )
    return payload + crc16_ccitt(payload)


class PixBrCodeGateway(PixGateway):
    def __init__(self, chave: str, nome_recebedor: str, cidade: str):
        self.chave = chave
        self.nome_recebedor = nome_recebedor
        self.cidade = cidade

    async def criar_cobranca(self, txid: str, valor: Decimal, descricao: str, expiracao_segundos: int) -> CobrancaPixGerada:
        if len(txid) > 25:
            raise IntegracaoExternaException("O BR Code com chave do recebedor aceita txid de no máximo 25 caracteres.")
        if not self.chave:
            raise IntegracaoExternaException("PIX_CHAVE não configurada: não é possível gerar cobranças PIX.")
        return CobrancaPixGerada(copia_e_cola=gerar_br_code(
            self.chave, valor, txid, self.nome_recebedor, self.cidade, descricao
        ))
