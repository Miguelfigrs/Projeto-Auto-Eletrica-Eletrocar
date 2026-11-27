import { describe, expect, it } from "vitest";
import { formatarPercentual, formatarReais, lerValorBR, valorParaCampo } from "../../lib/numeroBR";

describe("lerValorBR — valores digitados no formato brasileiro", () => {
  it.each([
    ["1.250,90", 1250.9],
    ["1250,90", 1250.9],
    ["1.200,00", 1200],
    ["R$ 1.000,00", 1000],
    ["1.000", 1000],
    ["12.500", 12500],
    ["1250.90", 1250.9],
    ["0.5", 0.5],
    ["50,5", 50.5],
    ["200", 200],
    ["  85 ", 85],
    ["-15,00", -15],
  ])("'%s' vira %d", (texto, esperado) => {
    expect(lerValorBR(texto)).toBeCloseTo(esperado, 2);
  });

  it.each(["", "   ", "abc", "1,2,3", "R$", null, undefined])("'%s' é inválido (NaN)", (texto) => {
    expect(lerValorBR(texto as string)).toBeNaN();
  });
});

describe("formatação brasileira", () => {
  it("formata reais, campos e percentuais com vírgula", () => {
    expect(formatarReais(1250.9).replace(/ /g, " ")).toBe("R$ 1.250,90");
    expect(valorParaCampo(269.5)).toBe("269,50");
    expect(formatarPercentual(35.94)).toBe("35,9%");
  });
});
