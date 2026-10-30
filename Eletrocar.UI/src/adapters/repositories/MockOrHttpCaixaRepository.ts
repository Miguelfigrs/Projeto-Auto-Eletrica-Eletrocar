/**
 * Repositório de Caixa e Turnos (Adapter)
 */
import { ICaixaRepository } from "../../application/ports/repositories/ICaixaRepository";
import { Caixa, MovimentacaoCaixa } from "../../domain/entities/Caixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { StatusCaixa, TipoMovimentacaoCaixa, FormaPagamento } from "../../domain/value-objects/Enums";

export class MockOrHttpCaixaRepository implements ICaixaRepository {
  private caixaAtivo: Caixa | null = new Caixa({
    id: "cx-turno-012",
    turnoNumero: 12,
    operadorId: "usr-admin",
    operadorNome: "Carlos Eduardo (Balcão)",
    status: StatusCaixa.ABERTO,
    saldoInicial: new Dinheiro(200.0),
    dataAbertura: new Date(Date.now() - 4 * 3600 * 1000), // Aberto há 4 horas
    movimentacoes: [
      {
        id: "mov-01",
        tipo: TipoMovimentacaoCaixa.ENTRADA_VENDA,
        valor: new Dinheiro(76.0),
        formaPagamento: FormaPagamento.DINHEIRO,
        descricao: "Venda Balcão #VND-849102 (2x Lâmpada H7)",
        dataHora: new Date(Date.now() - 3 * 3600 * 1000),
        operadorNome: "Carlos Eduardo",
      },
      {
        id: "mov-02",
        tipo: TipoMovimentacaoCaixa.ENTRADA_VENDA,
        valor: new Dinheiro(490.0),
        formaPagamento: FormaPagamento.PIX,
        descricao: "Venda Balcão #VND-849103 (Bateria Moura 60Ah)",
        dataHora: new Date(Date.now() - 2 * 3600 * 1000),
        operadorNome: "Carlos Eduardo",
      },
      {
        id: "mov-03",
        tipo: TipoMovimentacaoCaixa.SANGRIA,
        valor: new Dinheiro(150.0),
        formaPagamento: FormaPagamento.DINHEIRO,
        descricao: "Sangria para cofre administrativo",
        dataHora: new Date(Date.now() - 1 * 3600 * 1000),
        operadorNome: "Carlos Eduardo",
      },
    ],
  });

  public async obterCaixaAberto(): Promise<Caixa | null> {
    return this.caixaAtivo && this.caixaAtivo.estaAberto ? this.caixaAtivo : null;
  }

  public async abrir(operadorId: string, operadorNome: string, saldoInicial: Dinheiro): Promise<Caixa> {
    const novoCaixa = new Caixa({
      id: crypto.randomUUID(),
      turnoNumero: (this.caixaAtivo?.turnoNumero || 0) + 1,
      operadorId,
      operadorNome,
      status: StatusCaixa.ABERTO,
      saldoInicial,
      dataAbertura: new Date(),
    });
    this.caixaAtivo = novoCaixa;
    return novoCaixa;
  }

  public async fechar(caixaId: string): Promise<void> {
    if (this.caixaAtivo && this.caixaAtivo.id === caixaId) {
      this.caixaAtivo.fechar();
    }
  }

  public async adicionarMovimentacao(caixaId: string, mov: MovimentacaoCaixa): Promise<void> {
    if (this.caixaAtivo && this.caixaAtivo.id === caixaId) {
      this.caixaAtivo.movimentacoes.unshift(mov);
    }
  }
}
