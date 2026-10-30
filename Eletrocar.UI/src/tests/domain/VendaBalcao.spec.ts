import { describe, it, expect } from "vitest";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Peca } from "../../domain/entities/Peca";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, StatusVenda } from "../../domain/value-objects/Enums";

describe("Entidade: VendaBalcao (Aggregate Root de PDV Rápido)", () => {
  const peca1 = new Peca({
    id: "p-lampada",
    codigoBarras: "7894758392014",
    sku: "LMP-OSR-H7",
    descricao: "Lâmpada H7 55W",
    precoVenda: new Dinheiro(38.0),
    estoqueAtual: 20,
  });

  it("deve adicionar item e calcular subtotal", () => {
    const venda = new VendaBalcao();
    venda.adicionarItem(peca1, 2);

    expect(venda.itens.length).toBe(1);
    expect(venda.itens[0].quantidade).toBe(2);
    expect(venda.subtotal.valor).toBe(76.0);
    expect(venda.total.valor).toBe(76.0);
  });

  it("deve somar quantidade quando o mesmo item for bipado duas vezes", () => {
    const venda = new VendaBalcao();
    venda.adicionarItem(peca1, 1);
    venda.adicionarItem(peca1, 2);

    expect(venda.itens.length).toBe(1);
    expect(venda.itens[0].quantidade).toBe(3);
    expect(venda.subtotal.valor).toBe(114.0);
  });

  it("deve aplicar desconto sobre o subtotal", () => {
    const venda = new VendaBalcao();
    venda.adicionarItem(peca1, 2); // 76.00
    venda.aplicarDesconto(new Dinheiro(10.0));

    expect(venda.subtotal.valor).toBe(76.0);
    expect(venda.desconto.valor).toBe(10.0);
    expect(venda.total.valor).toBe(66.0);
  });
});
