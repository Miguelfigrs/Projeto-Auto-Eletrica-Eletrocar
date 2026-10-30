import { ICaixaRepository } from "../../ports/repositories/ICaixaRepository";
import { ISoundEffectGateway } from "../../ports/gateways/ISoundEffectGateway";
import { Caixa } from "../../../domain/entities/Caixa";
import { Dinheiro } from "../../../domain/value-objects/Dinheiro";
import { TipoMovimentacaoCaixa, FormaPagamento } from "../../../domain/value-objects/Enums";

export class OperarCaixaUseCase {
  constructor(
    private readonly caixaRepo: ICaixaRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async abrirCaixa(
    operadorId: string,
    operadorNome: string,
    saldoInicial: Dinheiro
  ): Promise<Caixa> {
    const atual = await this.caixaRepo.obterCaixaAberto();
    if (atual) {
      throw new Error("Já existe um turno de caixa aberto. Feche o turno atual antes.");
    }
    const caixa = await this.caixaRepo.abrir(operadorId, operadorNome, saldoInicial);
    this.soundGateway.tocarBipSucesso();
    return caixa;
  }

  public async fecharCaixa(caixaId: string): Promise<void> {
    await this.caixaRepo.fechar(caixaId);
    this.soundGateway.tocarBipSucesso();
  }

  public async realizarSangria(
    caixaId: string,
    valor: Dinheiro,
    motivo: string,
    operadorNome: string
  ): Promise<void> {
    await this.caixaRepo.adicionarMovimentacao(caixaId, {
      id: crypto.randomUUID(),
      tipo: TipoMovimentacaoCaixa.SANGRIA,
      valor,
      formaPagamento: FormaPagamento.DINHEIRO,
      descricao: `Sangria: ${motivo}`,
      dataHora: new Date(),
      operadorNome,
    });
    this.soundGateway.tocarBipSucesso();
  }

  public async realizarSuprimento(
    caixaId: string,
    valor: Dinheiro,
    motivo: string,
    operadorNome: string
  ): Promise<void> {
    await this.caixaRepo.adicionarMovimentacao(caixaId, {
      id: crypto.randomUUID(),
      tipo: TipoMovimentacaoCaixa.SUPRIMENTO,
      valor,
      formaPagamento: FormaPagamento.DINHEIRO,
      descricao: `Suprimento: ${motivo}`,
      dataHora: new Date(),
      operadorNome,
    });
    this.soundGateway.tocarBipSucesso();
  }
}
