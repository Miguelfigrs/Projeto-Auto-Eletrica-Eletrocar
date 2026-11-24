import { Peca } from "../../../domain/entities/Peca";

export interface NovaPecaDados {
  codigoBarras: string;
  sku: string;
  descricao: string;
  precoVenda: number;
  precoCusto: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  localizacao?: string;
  aplicacaoVeicular?: string;
  marcaFabricante?: string;
}

export interface IPecaRepository {
  listar(termo?: string): Promise<Peca[]>;
  buscarPorId(id: string): Promise<Peca | null>;
  buscarPorCodigoOuBarcode(codigo: string): Promise<Peca | null>;
  atualizarEstoque(id: string, quantidadeDelta: number): Promise<void>;
  cadastrar(dados: NovaPecaDados): Promise<Peca>;
}
