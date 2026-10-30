/**
 * Value Object: PinOperador
 * PIN numérico de 4 a 6 dígitos usado na troca rápida de operador (Lock Screen) e autorização gerencial.
 * Espelha fielmente src/domain/value_objects/pin_operador.py.
 */

export class PinOperador {
  private readonly _valor: string;

  constructor(valor: string) {
    const pin = (valor || "").trim();
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error("O PIN de operador deve conter entre 4 e 6 dígitos numéricos.");
    }
    this._valor = pin;
  }

  public get valor(): string {
    return this._valor;
  }

  public toString(): string {
    return "••••";
  }
}
