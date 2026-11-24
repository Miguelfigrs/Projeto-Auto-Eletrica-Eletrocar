/**
 * Histórico de entradas e saídas de peças.
 * Com a API: GET /pecas/movimentacoes (vendas, cancelamentos, OS, fornecedor, ajustes e cadastro).
 * Sem a API: movimentações feitas nesta sessão no catálogo local.
 */
import type {
  FiltroHistoricoEstoque,
  HistoricoEstoque,
  IHistoricoEstoqueRepository,
  MovimentacaoEstoque,
} from "../../application/ports/repositories/IHistoricoEstoqueRepository";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import type { MockOrHttpAuthRepository } from "./MockOrHttpAuthRepository";
import type { MockOrHttpPecaRepository } from "./MockOrHttpPecaRepository";
import { lerDataApi } from "./MockOrHttpDRERepository";

interface ApiMovimentacao {
  data: string;
  tipo: MovimentacaoEstoque["tipo"];
  origem: MovimentacaoEstoque["origem"];
  quantidade: number;
  peca_id: string | null;
  sku: string | null;
  descricao: string;
  documento: string | null;
  valor_unitario: string | null;
  usuario: string | null;
  observacao: string | null;
}

interface ApiHistorico {
  periodo: string;
  total_entradas: number;
  total_saidas: number;
  movimentacoes: ApiMovimentacao[];
}

/** AAAA-MM-DD no fuso local (o filtro é por dia do calendário do usuário). */
export function paraDataIso(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${m}-${d}`;
}

function rotuloPeriodo(inicio: Date, fim: Date): string {
  return `${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`;
}

export class MockOrHttpHistoricoEstoqueRepository implements IHistoricoEstoqueRepository {
  constructor(
    private readonly authRepository: MockOrHttpAuthRepository,
    private readonly pecaRepository: MockOrHttpPecaRepository
  ) {}

  public async listarMovimentacoes(filtro: FiltroHistoricoEstoque): Promise<HistoricoEstoque> {
    if (paraDataIso(filtro.dataFim) < paraDataIso(filtro.dataInicio)) {
      throw new Error("A data final deve ser maior ou igual à data inicial.");
    }

    if (this.authRepository.isModoApi()) {
      const search = new URLSearchParams({
        data_inicio: paraDataIso(filtro.dataInicio),
        data_fim: paraDataIso(filtro.dataFim),
      });
      if (filtro.tipo) search.set("tipo", filtro.tipo);
      const token = this.authRepository.obterAccessToken();
      const res = await fetch(`/api/v1/pecas/movimentacoes?${search.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Somente o administrador pode consultar o histórico de estoque."
            : `Falha ao consultar o histórico de estoque na API (HTTP ${res.status}).`
        );
      }
      const dto = (await res.json()) as ApiHistorico;
      return {
        periodo: dto.periodo,
        origemDados: "API",
        totalEntradas: dto.total_entradas,
        totalSaidas: dto.total_saidas,
        movimentacoes: dto.movimentacoes.map((m) => ({
          data: lerDataApi(m.data),
          tipo: m.tipo,
          origem: m.origem,
          quantidade: m.quantidade,
          pecaId: m.peca_id,
          sku: m.sku,
          descricao: m.descricao,
          documento: m.documento,
          valorUnitario: m.valor_unitario != null ? new Dinheiro(Number(m.valor_unitario)) : null,
          usuario: m.usuario,
          observacao: m.observacao,
        })),
      };
    }

    const inicio = new Date(filtro.dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(filtro.dataFim);
    fim.setHours(23, 59, 59, 999);
    const movimentacoes = this.pecaRepository
      .listarMovimentacoesLocais()
      .filter((m) => m.data >= inicio && m.data <= fim && (!filtro.tipo || m.tipo === filtro.tipo))
      .sort((a, b) => b.data.getTime() - a.data.getTime());

    return {
      periodo: rotuloPeriodo(filtro.dataInicio, filtro.dataFim),
      origemDados: "DEMO",
      totalEntradas: movimentacoes.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.quantidade, 0),
      totalSaidas: movimentacoes.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + m.quantidade, 0),
      movimentacoes,
    };
  }
}
