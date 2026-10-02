"""
Caso de Uso: BuscarPecaPorCodigoBarrasUseCase
Trata a entrada do leitor USB / Bluetooth (HID Keyboard Wedge / Serial) para respostas instantâneas (<50ms).
"""
from src.domain.repositories.interfaces import PecaRepositoryInterface
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException
from src.application.dtos.peca_dtos import PecaOutputDTO


class BuscarPecaPorCodigoBarrasUseCase:
    def __init__(self, peca_repo: PecaRepositoryInterface):
        self.peca_repo = peca_repo

    async def executar(self, raw_barcode: str) -> PecaOutputDTO:
        # Leitores de código de barras frequentemente enviam \r, \n ou espaços no final
        codigo_limpo = raw_barcode.strip()
        
        # 1. Tenta buscar por código de barras exato (EAN-13, Code 128)
        peca = await self.peca_repo.buscar_por_codigo_barras(codigo_limpo)
        
        # 2. Se não encontrar, tenta buscar por SKU (etiquetas internas da oficina)
        if not peca:
            peca = await self.peca_repo.buscar_por_sku(codigo_limpo)

        if not peca:
            raise EntidadeNaoEncontradaException(
                f"Nenhuma peça encontrada com o código '{codigo_limpo}' lido pelo leitor."
            )

        return PecaOutputDTO(
            id=peca.id,
            codigo_barras=peca.codigo_barras,
            sku=peca.sku,
            descricao=peca.descricao,
            preco_custo=peca.preco_custo,
            preco_venda=peca.preco_venda,
            estoque_atual=peca.estoque_atual,
            estoque_minimo=peca.estoque_minimo,
            localizacao=peca.localizacao,
            unidade_medida=peca.unidade_medida,
            abaixo_minimo=peca.esta_abaixo_minimo(),
            margem_lucro=peca.calcular_margem_lucro()
        )
