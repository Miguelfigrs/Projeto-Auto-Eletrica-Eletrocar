import { describe, it, expect } from "vitest";
import { CodigoBarras } from "../../domain/value-objects/CodigoBarras";

describe("Value Object: CodigoBarras (Validação de Hardware e SKUs)", () => {
  it("deve identificar corretamente código EAN-13", () => {
    const cb = new CodigoBarras("7891049281023");
    expect(cb.tipo).toBe("EAN13");
    expect(cb.valor).toBe("7891049281023");
  });

  it("deve identificar corretamente código EAN-8", () => {
    const cb = new CodigoBarras("78912345");
    expect(cb.tipo).toBe("EAN8");
  });

  it("deve identificar código SKU automotivo alfanumérico", () => {
    const cb = new CodigoBarras("ALT-BOSCH-12V");
    expect(cb.tipo).toBe("SKU");
  });

  it("deve remover espaços e quebras de linha injetadas pelo leitor", () => {
    const cb = new CodigoBarras("  7891049281023 \n");
    expect(cb.valor).toBe("7891049281023");
  });

  it("deve lançar erro se o código de barras for vazio", () => {
    expect(() => new CodigoBarras("   ")).toThrow("Código de barras não pode ser vazio.");
  });
});
