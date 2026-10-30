import { describe, it, expect } from "vitest";
import { Caixa } from "../../domain/entities/Caixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import {
  StatusCaixa,
  TipoMovimentacaoCaixa,
  FormaPagamento,
} from "../../domain/value-objects/Enums";
import { CaixaFechadoError } from "../../domain/exceptions/DomainExceptions";

describe("Entidade: Caixa (Controle de Turnos e Conciliação)", () => {
  it("deve inicializar caixa com fundo de troco inicial", () => {
    const caixa = new Caixa({
      id: "cx-1",
      turnoNumero: 1,
      operadorId: "op-1",
      operadorNome: "Carlos",
      saldoInicial: new Dinheiro(200.0),
    });

    expect(caixa.estaAberto).toBe(true);
    expect(caixa.saldoInicial.valor).toBe(200.0);
    expect(caixa.saldoEsperadoEmDinheiro.valor).toBe(200.0);
  });

  it("deve calcular saldo esperado somando entradas em dinheiro e deduzindo sangrias", () => {
    const caixa = new Caixa({
      id: "cx-2",
      turnoNumero: 2,
      operadorId: "op-1",
      operadorNome: "Carlos",
      saldoInicial: new Dinheiro(200.0),
    });

    // Entrada de venda em dinheiro: R$ 150,00
    caixa.adicionarMovimentacao(
      TipoMovimentacaoCaixa.ENTRADA_VENDA,
      new Dinheiro(150.0),
      FormaPagamento.DINHEIRO,
      "Venda Balcão #01",
      "Carlos"
    );

    // Entrada de venda em PIX: R$ 400,00 (não altera dinheiro físico da gaveta)
    caixa.adicionarMovimentacao(
      TipoMovimentacaoCaixa.ENTRADA_VENDA,
      new Dinheiro(400.0),
      FormaPagamento.PIX,
      "Venda Balcão #02 PIX",
      "Carlos"
    );

    // Sangria para o cofre: R$ 100,00
    caixa.adicionarMovimentacao(
      TipoMovimentacaoCaixa.SANGRIA,
      new Dinheiro(100.0),
      FormaPagamento.DINHEIRO,
      "Sangria cofre",
      "Carlos"
    );

    // Saldo esperado em gaveta: 200 (inicial) + 150 (venda dinheiro) - 100 (sangria) = 250,00
    expect(caixa.saldoEsperadoEmDinheiro.valor).toBe(250.0);
    expect(caixa.totalPorFormaPagamento(FormaPagamento.PIX).valor).toBe(400.0);
  });

  it("deve lançar CaixaFechadoError ao tentar movimentar caixa fechado", () => {
    const caixa = new Caixa({
      id: "cx-3",
      turnoNumero: 3,
      operadorId: "op-1",
      operadorNome: "Carlos",
      status: StatusCaixa.FECHADO,
    });

    expect(() =>
      caixa.adicionarMovimentacao(
        TipoMovimentacaoCaixa.SANGRIA,
        new Dinheiro(50.0),
        FormaPagamento.DINHEIRO,
        "Tentativa",
        "Carlos"
      )
    ).toThrow(CaixaFechadoError);
  });
});
