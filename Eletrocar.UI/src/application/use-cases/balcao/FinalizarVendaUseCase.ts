import { IVendaRepository } from "../../ports/repositories/IVendaRepository";
import { IPecaRepository } from "../../ports/repositories/IPecaRepository";
import { ICaixaRepository } from "../../ports/repositories/ICaixaRepository";
import { ISoundEffectGateway } from "../../ports/gateways/ISoundEffectGateway";
import { VendaBalcao } from "../../../domain/entities/VendaBalcao";
import { FormaPagamento, TipoMovimentacaoCaixa, StatusVenda } from "../../../domain/value-objects/Enums";
import { CaixaFechadoError } from "../../../domain/exceptions/DomainExceptions";

export class FinalizarVendaUseCase {
  constructor(
    private readonly vendaRepo: IVendaRepository,
    private readonly pecaRepo: IPecaRepository,
    private readonly caixaRepo: ICaixaRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async executar(
    venda: VendaBalcao,
    formaPagamento: FormaPagamento,
    operadorNome: string
  ): Promise<VendaBalcao> {
    if (venda.itens.length === 0) {
      this.soundGateway.tocarAlertaErro();
      throw new Error("Não é possível finalizar uma venda sem itens.");
    }

    // 1. Verifica se o caixa está aberto
    const caixa = await this.caixaRepo.obterCaixaAberto();
    if (!caixa) {
      this.soundGateway.tocarAlertaErro();
      throw new CaixaFechadoError();
    }

    // 2. Define forma de pagamento e status
    venda.formaPagamento = formaPagamento;
    venda.status = StatusVenda.CONCLUIDA;

    // 3. Atualiza o estoque de cada peça
    for (const item of venda.itens) {
      await this.pecaRepo.atualizarEstoque(item.pecaId, -item.quantidade);
    }

    // 4. Se não for a prazo (boleto/faturado), registra a entrada no caixa
    if (formaPagamento !== FormaPagamento.BOLETO && formaPagamento !== FormaPagamento.FATURADO) {
      await this.caixaRepo.adicionarMovimentacao(caixa.id, {
        id: crypto.randomUUID(),
        tipo: TipoMovimentacaoCaixa.ENTRADA_VENDA,
        valor: venda.total,
        formaPagamento,
        descricao: `Venda balcão #${venda.numeroVenda}`,
        dataHora: new Date(),
        operadorNome,
      });
    }

    // 5. Salva a venda concluída
    const vendaSalva = await this.vendaRepo.salvar(venda);
    this.soundGateway.tocarBipSucesso();

    return vendaSalva;
  }
}
