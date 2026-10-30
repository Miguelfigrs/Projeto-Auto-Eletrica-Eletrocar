/**
 * Value Object: CpfCnpj
 * Valida e formata CPF ou CNPJ de clientes.
 * Espelha fielmente src/domain/value_objects/cpf_cnpj.py.
 */

export class CpfCnpj {
  private readonly _valorLimpo: string;
  private readonly _ehCnpj: boolean;

  constructor(documento: string) {
    if (!documento || !documento.trim()) {
      throw new Error("CPF/CNPJ não pode ser vazio.");
    }

    const apenasDigitos = documento.replace(/\D/g, "");

    if (apenasDigitos.length === 11) {
      this._ehCnpj = false;
      if (!this.validarCPF(apenasDigitos)) {
        throw new Error("CPF inválido.");
      }
    } else if (apenasDigitos.length === 14) {
      this._ehCnpj = true;
      if (!this.validarCNPJ(apenasDigitos)) {
        throw new Error("CNPJ inválido.");
      }
    } else {
      throw new Error("Documento deve conter 11 (CPF) ou 14 (CNPJ) dígitos.");
    }

    this._valorLimpo = apenasDigitos;
  }

  public get valor(): string {
    return this._valorLimpo;
  }

  public get ehCnpj(): boolean {
    return this._ehCnpj;
  }

  public formatar(): string {
    if (this._ehCnpj) {
      return this._valorLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
    return this._valorLimpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  private validarCPF(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.charAt(10));
  }

  private validarCNPJ(cnpj: string): boolean {
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(digitos.charAt(1));
  }
}
