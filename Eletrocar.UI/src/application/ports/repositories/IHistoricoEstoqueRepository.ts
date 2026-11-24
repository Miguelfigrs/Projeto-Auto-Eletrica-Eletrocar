import type { Dinheiro } from "../../../domain/value-objects/Dinheiro";

export type TipoMovimentacaoEstoque = "ENTRADA" | "SAIDA";

export type OrigemMovimentacaoEstoque =
  | "VENDA"
  | "CANCELAMENTO_VENDA"
  | "ORDEM_SERVICO"
  | "ENTRADA_FORNECEDOR"
  | "AJUSTE_INVENTARIO"
  | "CADASTRO";

export interface MovimentacaoEstoque {
  data: Date;
  tipo: TipoMovimentacaoEstoque;
  origem: OrigemMovimentacaoEstoque;
  /** Sempre positiva; o sentido está em `tipo`. */
  quantidade: number;
  pecaId: string | null;
  sku: string | null;
  descricao: string;
  documento: string | null;
  valorUnitario: Dinheiro | null;
  usuario: string | null;
  observacao: string | null;
}

export interface FiltroHistoricoEstoque {
  dataInicio: Date;
  dataFim: Date;
  tipo?: TipoMovimentacaoEstoque;
}

export interface HistoricoEstoque {
  periodo: string;
  origemDados: "API" | "DEMO";
  totalEntradas: number;
  totalSaidas: number;
  movimentacoes: MovimentacaoEstoque[];
}

export interface IHistoricoEstoqueRepository {
  listarMovimentacoes(filtro: FiltroHistoricoEstoque): Promise<HistoricoEstoque>;
}
