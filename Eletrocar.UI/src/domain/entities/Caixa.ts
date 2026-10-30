/**
 * Entidade: Caixa (Aggregate Root) e MovimentacaoCaixa
 * Controla os turnos de caixa, suprimentos, sangrias e conciliação de valores.
 * Espelha fielmente src/domain/entities/caixa.py.
 */
import { Dinheiro } from "../value-objects/Dinheiro";
import { StatusCaixa, TipoMovimentacaoCaixa, FormaPagamento } from "../value-objects/Enums";
import { CaixaFechadoError } from "../exceptions/DomainExceptions";

export interface MovimentacaoCaixa {
  id: string;
  tipo: TipoMovimentacaoCaixa;
  valor: Dinheiro;
  formaPagamento: FormaPagamento;
  descricao: string;
  dataHora: Date;
  operadorNome: string;
}

export interface CaixaProps {
  id: string;
  turnoNumero: number;
  operadorId: string;
  operadorNome: string;
  status?: StatusCaixa;
  saldoInicial?: number | Dinheiro;
  dataAbertura?: Date | string;
  dataFechamento?: Date | string;
  movimentacoes?: MovimentacaoCaixa[];
}

export class Caixa {
  public readonly id: string;
  public readonly turnoNumero: number;
  public readonly operadorId: string;
  public readonly operadorNome: string;
  public status: StatusCaixa;
  public readonly saldoInicial: Dinheiro;
  public readonly dataAbertura: Date;
  public dataFechamento?: Date;
  public movimentacoes: MovimentacaoCaixa[];

  constructor(props: CaixaProps) {
    this.id = props.id;
    this.turnoNumero = props.turnoNumero;
    this.operadorId = props.operadorId;
    this.operadorNome = props.operadorNome;
    this.status = props.status || StatusCaixa.ABERTO;
    this.saldoInicial =
      props.saldoInicial instanceof Dinheiro
        ? props.saldoInicial
        : new Dinheiro(props.saldoInicial || 0, false);
    this.dataAbertura = props.dataAbertura ? new Date(props.dataAbertura) : new Date();
    this.dataFechamento = props.dataFechamento ? new Date(props.dataFechamento) : undefined;
    this.movimentacoes = props.movimentacoes || [];
  }

  public get estaAberto(): boolean {
    return this.status === StatusCaixa.ABERTO;
  }

  public adicionarMovimentacao(
    tipo: TipoMovimentacaoCaixa,
    valor: Dinheiro,
    formaPagamento: FormaPagamento,
    descricao: string,
    operadorNome: string
  ): void {
    if (!this.estaAberto) {
      throw new CaixaFechadoError();
    }

    this.movimentacoes.push({
      id: crypto.randomUUID(),
      tipo,
      valor,
      formaPagamento,
      descricao,
      dataHora: new Date(),
      operadorNome,
    });
  }

  public fechar(): void {
    if (!this.estaAberto) {
      throw new CaixaFechadoError();
    }
    this.status = StatusCaixa.FECHADO;
    this.dataFechamento = new Date();
  }

  public get totalEntradasDinheiro(): Dinheiro {
    return this.movimentacoes
      .filter(
        (m) =>
          (m.tipo === TipoMovimentacaoCaixa.ENTRADA_VENDA ||
            m.tipo === TipoMovimentacaoCaixa.ENTRADA_OS ||
            m.tipo === TipoMovimentacaoCaixa.SUPRIMENTO) &&
          m.formaPagamento === FormaPagamento.DINHEIRO
      )
      .reduce((acc, m) => acc.somar(m.valor), Dinheiro.zero());
  }

  public get totalSaidasDinheiro(): Dinheiro {
    return this.movimentacoes
      .filter(
        (m) =>
          m.tipo === TipoMovimentacaoCaixa.SANGRIA ||
          m.tipo === TipoMovimentacaoCaixa.ESTORNO_VENDA
      )
      .reduce((acc, m) => acc.somar(m.valor), Dinheiro.zero());
  }

  public get saldoEsperadoEmDinheiro(): Dinheiro {
    return this.saldoInicial.somar(this.totalEntradasDinheiro).subtrair(this.totalSaidasDinheiro);
  }

  public totalPorFormaPagamento(forma: FormaPagamento): Dinheiro {
    return this.movimentacoes
      .filter(
        (m) =>
          m.formaPagamento === forma &&
          (m.tipo === TipoMovimentacaoCaixa.ENTRADA_VENDA ||
            m.tipo === TipoMovimentacaoCaixa.ENTRADA_OS)
      )
      .reduce((acc, m) => acc.somar(m.valor), Dinheiro.zero());
  }
}
