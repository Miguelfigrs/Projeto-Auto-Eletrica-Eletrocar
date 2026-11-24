import type { Dinheiro } from "../../../domain/value-objects/Dinheiro";

export type FiltroResultadoDRE = "TODOS" | "LUCROS" | "PREJUIZOS";

export interface FiltroDREParams {
  ano: number;
  mes: number | "TODOS";
  resultado: FiltroResultadoDRE;
}

export interface DadosDREPeriodo {
  competenciaLabel: string;
  ano: number;
  mes: number | "TODOS";
  origemDados: "API" | "DEMO";
  receitaVendasProdutos: Dinheiro;
  receitaServicosOS: Dinheiro;
  receitaBrutaTotal: Dinheiro;
  deducoesDescontos: Dinheiro;
  receitaLiquida: Dinheiro;
  cmvPecas: Dinheiro;
  custoMaoObra: Dinheiro;
  custosDiretosTotal: Dinheiro;
  lucroBruto: Dinheiro;
  margemBrutaPercentual: number;
  despesasFixas: Dinheiro;
  despesasVariaveis: Dinheiro;
  despesasTotais: Dinheiro;
  lucroLiquido: Dinheiro;
  margemLiquidaPercentual: number;
  quantidadeVendas: number;
  quantidadeOS: number;
}

export interface ResumoMensalDREItem {
  ano: number;
  mes: number;
  competencia: string;
  receitaBrutaTotal: Dinheiro;
  receitaLiquida: Dinheiro;
  custosDiretosTotal: Dinheiro;
  despesasTotais: Dinheiro;
  lucroBruto: Dinheiro;
  lucroLiquido: Dinheiro;
  margemLiquidaPercentual: number;
  ehLucro: boolean;
  ehPrejuizo: boolean;
  quantidadeVendas: number;
  quantidadeOS: number;
}

export interface ResumoMensalDREAnual {
  ano: number;
  filtroResultado: FiltroResultadoDRE;
  origemDados: "API" | "DEMO";
  totalMesesFiltrados: number;
  somaLucros: Dinheiro;
  somaPrejuizos: Dinheiro;
  saldoLiquidoFiltrado: Dinheiro;
  meses: ResumoMensalDREItem[];
}

export interface ItemLancamentoDRE {
  descricao: string;
  quantidade: number;
  precoUnitario: Dinheiro;
  custoUnitario: Dinheiro;
  total: Dinheiro;
}

export interface VendaLancamentoDRE {
  id: string;
  numero: string;
  data: Date;
  operador: string | null;
  formaPagamento: string | null;
  subtotal: Dinheiro;
  desconto: Dinheiro;
  total: Dinheiro;
  custo: Dinheiro;
  lucroBruto: Dinheiro;
  itens: ItemLancamentoDRE[];
}

export interface OrdemServicoLancamentoDRE {
  id: string;
  numero: string;
  data: Date;
  formaPagamento: string | null;
  valorPecas: Dinheiro;
  valorServicos: Dinheiro;
  desconto: Dinheiro;
  total: Dinheiro;
  custoPecas: Dinheiro;
  itens: ItemLancamentoDRE[];
  servicos: Array<{ descricao: string; valor: Dinheiro }>;
}

export interface DespesaLancamentoDRE {
  id: string;
  descricao: string;
  categoria: string;
  valor: Dinheiro;
  dataPagamento: Date | null;
  formaPagamento: string | null;
  /** Compras de mercadoria são pagas mas não entram como despesa na DRE (viram CMV na venda). */
  entraNoDRE: boolean;
}

export interface DetalhamentoDRE {
  periodo: string;
  origemDados: "API" | "DEMO";
  totalVendas: Dinheiro;
  totalOrdensServico: Dinheiro;
  totalDespesas: Dinheiro;
  vendas: VendaLancamentoDRE[];
  ordensServico: OrdemServicoLancamentoDRE[];
  despesas: DespesaLancamentoDRE[];
}

export interface IRelatorioDRERepository {
  obterDREPeriodo(params: Pick<FiltroDREParams, "ano" | "mes">): Promise<DadosDREPeriodo>;
  obterResumoMensalAnual(params: Pick<FiltroDREParams, "ano" | "resultado">): Promise<ResumoMensalDREAnual>;
  obterDetalhamento(params: Pick<FiltroDREParams, "ano" | "mes">): Promise<DetalhamentoDRE>;
}

