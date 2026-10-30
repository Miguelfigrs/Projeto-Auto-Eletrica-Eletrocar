import { describe, it, expect } from "vitest";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";

describe("Value Object: Dinheiro (DDD & Precisão Financeira)", () => {
  it("deve criar valor monetário com precisão em centavos", () => {
    const d = new Dinheiro(150.75);
    expect(d.valor).toBe(150.75);
    expect(d.centavos).toBe(15075);
  });

  it("deve realizar soma monetária exata evitando imprecisão float (0.1 + 0.2)", () => {
    const d1 = new Dinheiro(0.1);
    const d2 = new Dinheiro(0.2);
    const soma = d1.somar(d2);
    expect(soma.valor).toBe(0.3);
    expect(soma.centavos).toBe(30);
  });

  it("deve formatar valor no padrão da moeda brasileira R$", () => {
    const d = new Dinheiro(1250.5);
    expect(d.formatar()).toContain("1.250,50");
  });

  it("deve subtrair valores e calcular troco com precisão", () => {
    const recebido = new Dinheiro(100.0);
    const compra = new Dinheiro(37.45);
    const troco = recebido.subtrair(compra);
    expect(troco.valor).toBe(62.55);
  });

  it("deve multiplicar quantidade de peças pelo preço unitário", () => {
    const precoUnitario = new Dinheiro(38.0);
    const total = precoUnitario.multiplicar(3);
    expect(total.valor).toBe(114.0);
  });

  it("deve converter string PT-BR '1.450,90' corretamente", () => {
    const d = new Dinheiro("1.450,90");
    expect(d.valor).toBe(1450.9);
  });

  it("deve lançar erro se valor negativo for proibido", () => {
    expect(() => new Dinheiro(-10, false)).toThrow("Valor monetário não pode ser negativo.");
  });

  it("deve realizar comparações maior, menor e igual", () => {
    const d100 = new Dinheiro(100);
    const d50 = new Dinheiro(50);
    expect(d100.maiorQue(d50)).toBe(true);
    expect(d50.menorQue(d100)).toBe(true);
    expect(d100.igual(new Dinheiro(100))).toBe(true);
  });
});
