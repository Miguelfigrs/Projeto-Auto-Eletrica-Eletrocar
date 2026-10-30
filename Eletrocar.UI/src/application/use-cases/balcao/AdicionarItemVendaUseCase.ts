import { IPecaRepository } from "../../ports/repositories/IPecaRepository";
import { ISoundEffectGateway } from "../../ports/gateways/ISoundEffectGateway";
import { VendaBalcao } from "../../../domain/entities/VendaBalcao";
import { EstoqueInsuficienteError } from "../../../domain/exceptions/DomainExceptions";

export class AdicionarItemVendaUseCase {
  constructor(
    private readonly pecaRepo: IPecaRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async executar(
    venda: VendaBalcao,
    codigoOuBarcode: string,
    quantidade = 1
  ): Promise<void> {
    const peca = await this.pecaRepo.buscarPorCodigoOuBarcode(codigoOuBarcode);
    if (!peca) {
      this.soundGateway.tocarAlertaErro();
      throw new Error(`Peça "${codigoOuBarcode}" não localizada no catálogo.`);
    }

    // Calcula quantidade total somando com itens que já estão no carrinho
    const itemExistente = venda.itens.find((i) => i.pecaId === peca.id);
    const qtdTotalDesejada = (itemExistente ? itemExistente.quantidade : 0) + quantidade;

    if (!peca.temEstoque(qtdTotalDesejada)) {
      this.soundGateway.tocarAlertaErro();
      throw new EstoqueInsuficienteError(peca.descricao, peca.estoqueAtual, qtdTotalDesejada);
    }

    venda.adicionarItem(peca, quantidade);
    this.soundGateway.tocarBipSucesso();
  }
}
