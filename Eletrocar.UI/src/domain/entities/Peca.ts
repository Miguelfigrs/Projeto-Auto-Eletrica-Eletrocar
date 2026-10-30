/**
 * Entidade: Peca
 * Componente elétrico automotivo, com código de barras, controle de estoque e alocação.
 * Espelha fielmente src/domain/entities/peca.py.
 */
import { Dinheiro } from "../value-objects/Dinheiro";
import { CodigoBarras } from "../value-objects/CodigoBarras";
import { EstoqueInsuficienteError } from "../exceptions/DomainExceptions";

export interface PecaProps {
  id: string;
  codigoBarras: string | CodigoBarras;
  sku: string;
  descricao: string;
  precoVenda: number | Dinheiro;
  precoCusto?: number | Dinheiro;
  estoqueAtual: number;
  estoqueMinimo?: number;
  localizacao?: string;
  aplicacaoVeicular?: string;
  marcaFabricante?: string; // Bosch, Magneti Marelli, etc.
}

export class Peca {
  public readonly id: string;
  public readonly codigoBarras: CodigoBarras;
  public readonly sku: string;
  public readonly descricao: string;
  public precoVenda: Dinheiro;
  public precoCusto: Dinheiro;
  private _estoqueAtual: number;
  public readonly estoqueMinimo: number;
  public readonly localizacao: string;
  public readonly aplicacaoVeicular: string;
  public readonly marcaFabricante: string;

  constructor(props: PecaProps) {
    this.id = props.id;
    this.codigoBarras =
      props.codigoBarras instanceof CodigoBarras
        ? props.codigoBarras
        : new CodigoBarras(props.codigoBarras);
    this.sku = props.sku;
    this.descricao = props.descricao;
    this.precoVenda =
      props.precoVenda instanceof Dinheiro ? props.precoVenda : new Dinheiro(props.precoVenda, false);
    this.precoCusto =
      props.precoCusto instanceof Dinheiro
        ? props.precoCusto
        : new Dinheiro(props.precoCusto || 0, false);
    this._estoqueAtual = props.estoqueAtual;
    this.estoqueMinimo = props.estoqueMinimo ?? 3;
    this.localizacao = props.localizacao || "Prateleira Geral";
    this.aplicacaoVeicular = props.aplicacaoVeicular || "Universal";
    this.marcaFabricante = props.marcaFabricante || "Original";
  }

  public get estoqueAtual(): number {
    return this._estoqueAtual;
  }

  public get estoqueBaixo(): boolean {
    return this._estoqueAtual <= this.estoqueMinimo;
  }

  public temEstoque(quantidade: number): boolean {
    return this._estoqueAtual >= quantidade;
  }

  public baixarEstoque(quantidade: number): void {
    if (!this.temEstoque(quantidade)) {
      throw new EstoqueInsuficienteError(this.descricao, this._estoqueAtual, quantidade);
    }
    this._estoqueAtual -= quantidade;
  }

  public reporEstoque(quantidade: number): void {
    if (quantidade <= 0) throw new Error("Quantidade para reposição deve ser maior que zero.");
    this._estoqueAtual += quantidade;
  }
}
