/**
 * Value Object: Dinheiro
 * Garante precisão decimal monetária sem imprecisão de ponto flutuante IEEE 754.
 * Espelha fielmente src/domain/value_objects/dinheiro.py.
 */

export class Dinheiro {
  private readonly _centavos: number;

  constructor(valor: number | string | Dinheiro = 0, permitirNegativo = true) {
    if (valor instanceof Dinheiro) {
      this._centavos = valor._centavos;
      return;
    }

    let num: number;
    if (typeof valor === "string") {
      // Remove R$, espaços e converte pontuação PT-BR ou US
      const limpo = valor
        .replace(/R\$\s?/gi, "")
        .trim();
      
      if (limpo.includes(",") && limpo.includes(".")) {
        // Ex: 1.250,50 -> 1250.50
        num = parseFloat(limpo.replace(/\./g, "").replace(",", "."));
      } else if (limpo.includes(",")) {
        // Ex: 1250,50 -> 1250.50
        num = parseFloat(limpo.replace(",", "."));
      } else {
        num = parseFloat(limpo);
      }
    } else {
      num = valor;
    }

    if (isNaN(num)) {
      throw new Error(`Valor monetário inválido: ${valor}`);
    }

    // Armazena estritamente em centavos inteiros (quantização)
    this._centavos = Math.round(num * 100);

    if (!permitirNegativo && this._centavos < 0) {
      throw new Error("Valor monetário não pode ser negativo.");
    }
  }

  public get valor(): number {
    return this._centavos / 100;
  }

  public get centavos(): number {
    return this._centavos;
  }

  public somar(outro: Dinheiro | number): Dinheiro {
    const o = outro instanceof Dinheiro ? outro : new Dinheiro(outro);
    return Dinheiro.deCentavos(this._centavos + o._centavos);
  }

  public subtrair(outro: Dinheiro | number): Dinheiro {
    const o = outro instanceof Dinheiro ? outro : new Dinheiro(outro);
    return Dinheiro.deCentavos(this._centavos - o._centavos);
  }

  public multiplicar(fator: number): Dinheiro {
    return Dinheiro.deCentavos(Math.round(this._centavos * fator));
  }

  public dividir(divisor: number): Dinheiro {
    if (divisor === 0) throw new Error("Divisão por zero não permitida em Dinheiro.");
    return Dinheiro.deCentavos(Math.round(this._centavos / divisor));
  }

  public menorQue(outro: Dinheiro): boolean {
    return this._centavos < outro._centavos;
  }

  public menorOuIgual(outro: Dinheiro): boolean {
    return this._centavos <= outro._centavos;
  }

  public maiorQue(outro: Dinheiro): boolean {
    return this._centavos > outro._centavos;
  }

  public maiorOuIgual(outro: Dinheiro): boolean {
    return this._centavos >= outro._centavos;
  }

  public igual(outro: Dinheiro): boolean {
    return this._centavos === outro._centavos;
  }

  public ehZero(): boolean {
    return this._centavos === 0;
  }

  public ehPositivo(): boolean {
    return this._centavos > 0;
  }

  public formatar(): string {
    return (this._centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  public toJSON(): number {
    return this.valor;
  }

  public static zero(): Dinheiro {
    return new Dinheiro(0);
  }

  public static deCentavos(centavos: number): Dinheiro {
    const d = Object.create(Dinheiro.prototype);
    d._centavos = centavos;
    return d;
  }
}
