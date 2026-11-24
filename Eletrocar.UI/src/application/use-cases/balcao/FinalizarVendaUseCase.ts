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

    // 3. Grava a venda ANTES dos efeitos locais: com a API, o servidor valida o saldo, baixa o estoque,
    //    registra o pagamento e numera a venda numa única transação; se recusar, nada local muda.
    let vendaSalva: VendaBalcao;
    try {
      vendaSalva = await this.vendaRepo.salvar(venda);
    } catch (erro) {
      this.soundGateway.tocarAlertaErro();
      throw erro;
    }

    // 4. Atualiza o estoque de cada peça
    for (const item of vendaSalva.itens) {
      await this.pecaRepo.atualizarEstoque(item.pecaId, -item.quantidade);
    }

    // 5. Se não for a prazo (boleto/faturado), registra a entrada no caixa
    if (formaPagamento !== FormaPagamento.BOLETO && formaPagamento !== FormaPagamento.FATURADO) {
      await this.caixaRepo.adicionarMovimentacao(caixa.id, {
        id: crypto.randomUUID(),
        tipo: TipoMovimentacaoCaixa.ENTRADA_VENDA,
        valor: vendaSalva.total,
        formaPagamento,
        descricao: `Venda balcão #${vendaSalva.numeroVenda}`,
        dataHora: new Date(),
        operadorNome,
      });
    }

    this.soundGateway.tocarBipSucesso();

    return vendaSalva;
  }
}
