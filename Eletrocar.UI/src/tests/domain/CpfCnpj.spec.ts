import { describe, it, expect } from "vitest";
import { CpfCnpj } from "../../domain/value-objects/CpfCnpj";

describe("Value Object: CpfCnpj (Validação e Formatação de Documento)", () => {
  it("deve validar e formatar CPF válido", () => {
    const doc = new CpfCnpj("52998224725");
    expect(doc.ehCnpj).toBe(false);
    expect(doc.formatar()).toBe("529.982.247-25");
  });

  it("deve validar e formatar CNPJ válido", () => {
    // CNPJ de teste válido
    const doc = new CpfCnpj("11222333000181");
    expect(doc.ehCnpj).toBe(true);
    expect(doc.formatar()).toBe("11.222.333/0001-81");
  });

  it("deve rejeitar CPF com dígitos verificadores incorretos", () => {
    expect(() => new CpfCnpj("11144477700")).toThrow("CPF inválido.");
  });

  it("deve rejeitar documentos com tamanho diferente de 11 ou 14 dígitos", () => {
    expect(() => new CpfCnpj("12345")).toThrow("Documento deve conter 11 (CPF) ou 14 (CNPJ) dígitos.");
  });
});
