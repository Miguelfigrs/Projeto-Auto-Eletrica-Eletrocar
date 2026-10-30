"""
Caso de Uso: BuscarPecaPorCodigoBarrasUseCase (UC03)
Trata a entrada do leitor USB / Bluetooth (HID Keyboard Wedge / Serial) para respostas instantâneas.
"""
from src.domain.repositories.interfaces import PecaRepositoryInterface
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException
from src.application.dtos.peca_dtos import PecaOutputDTO


class BuscarPecaPorCodigoBarrasUseCase:
    def __init__(self, peca_repo: PecaRepositoryInterface):
        self.peca_repo = peca_repo

    async def executar(self, raw_barcode: str) -> PecaOutputDTO:
        # Leitores de código de barras frequentemente enviam \r, \n ou espaços no final
        codigo_limpo = (raw_barcode or "").strip()

        # 1. Código de barras exato (EAN-13, EAN-8, Code 128); 2. SKU das etiquetas internas (ex: ELC-10492)
        peca = await self.peca_repo.buscar_por_codigo_barras(codigo_limpo)
        if not peca:
            peca = await self.peca_repo.buscar_por_sku(codigo_limpo)

        if not peca or not peca.ativo:
            raise EntidadeNaoEncontradaException(
                f"Nenhuma peça encontrada com o código '{codigo_limpo}' lido pelo leitor."
            )
        return PecaOutputDTO.de(peca)
