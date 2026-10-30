/**
 * Value Object: CodigoBarras
 * Valida e padroniza códigos de barras (EAN-13, EAN-8, Code 128) e SKUs/Part Numbers.
 * Espelha fielmente src/domain/value_objects/codigo_barras.py.
 */

export class CodigoBarras {
  private readonly _valor: string;
  private readonly _tipo: "EAN13" | "EAN8" | "SKU";

  constructor(valor: string) {
    if (!valor || !valor.trim()) {
      throw new Error("Código de barras não pode ser vazio.");
    }

    const codigoLimpo = valor.trim();
    this._valor = codigoLimpo;
    this._tipo = this.identificarTipo(codigoLimpo);
  }

  public get valor(): string {
    return this._valor;
  }

  public get tipo(): "EAN13" | "EAN8" | "SKU" {
    return this._tipo;
  }

  private identificarTipo(codigo: string): "EAN13" | "EAN8" | "SKU" {
    if (/^\d{13}$/.test(codigo)) return "EAN13";
    if (/^\d{8}$/.test(codigo)) return "EAN8";
    return "SKU";
  }

  public igual(outro: CodigoBarras | string): boolean {
    const val = typeof outro === "string" ? outro.trim() : outro.valor;
    return this._valor.toLowerCase() === val.toLowerCase();
  }

  public toString(): string {
    return this._valor;
  }
}
