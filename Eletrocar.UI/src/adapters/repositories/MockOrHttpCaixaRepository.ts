/**
 * Repositório de Caixa e Turnos (Adapter)
 * Com sessão na API: o caixa é o do servidor (um único caixa aberto por vez).
 *  - Administrador: GET /caixa/gerencial (saldo teórico, totais e lançamentos).
 *  - Operador: GET /caixa/status (fechamento cego: só a situação, sem saldos).
 *  - Abertura, sangria/suprimento e fechamento cego são gravados no servidor.
 *  - Entradas de venda NÃO são enviadas daqui: o POST /vendas já lança o pagamento no caixa.
 * Sem API: turno de demonstração em memória.
 */
import { ICaixaRepository, ValoresContados } from "../../application/ports/repositories/ICaixaRepository";
import { Caixa, MovimentacaoCaixa } from "../../domain/entities/Caixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { StatusCaixa, TipoMovimentacaoCaixa, FormaPagamento } from "../../domain/value-objects/Enums";
import { mensagemDeErro, requisitarApi, type SessaoApi } from "./apiHttp";
import { lerDataApi } from "./MockOrHttpDRERepository";

interface ApiCaixaOperador {
  id: string;
  operador_id: string;
  operador_nome: string | null;
  status: StatusCaixa;
  saldo_inicial: string;
  data_abertura: string;
}

interface ApiCaixaGerencial extends ApiCaixaOperador {
  saldo_teorico_dinheiro: string;
  data_fechamento: string | null;
  movimentacoes: Array<{
    id: string;
    tipo: TipoMovimentacaoCaixa;
    valor: string;
    forma_pagamento: FormaPagamento;
    descricao: string;
    created_at: string;
  }>;
}

const MOVIMENTACOES_MANUAIS = [TipoMovimentacaoCaixa.SANGRIA, TipoMovimentacaoCaixa.SUPRIMENTO];

function caixaDaApi(dto: ApiCaixaOperador | ApiCaixaGerencial): Caixa {
  const gerencial = "movimentacoes" in dto;
  return new Caixa({
    id: dto.id,
    turnoNumero: 0, // o servidor não numera turnos; o rótulo usa a data/hora de abertura
    operadorId: dto.operador_id,
    operadorNome: dto.operador_nome ?? "Operador",
    status: dto.status,
    saldoInicial: Number(dto.saldo_inicial),
    dataAbertura: lerDataApi(dto.data_abertura),
    dataFechamento: gerencial && dto.data_fechamento ? lerDataApi(dto.data_fechamento) : undefined,
    visaoGerencial: gerencial,
    saldoTeoricoServidor: gerencial ? new Dinheiro(Number(dto.saldo_teorico_dinheiro), true) : undefined,
    movimentacoes: gerencial
      ? dto.movimentacoes
          .map((m) => ({
            id: m.id,
            tipo: m.tipo,
            valor: new Dinheiro(Number(m.valor)),
            formaPagamento: m.forma_pagamento,
            descricao: m.descricao,
            dataHora: lerDataApi(m.created_at),
            operadorNome: "—",
          }))
          .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime())
      : [],
  });
}

export class MockOrHttpCaixaRepository implements ICaixaRepository {
  constructor(
    private readonly sessao?: SessaoApi,
    private readonly apiBase = "/api/v1"
  ) {}

  private modoApi(): boolean {
    return this.sessao?.isModoApi() ?? false;
  }

  private autenticacao(): HeadersInit {
    const token = this.sessao?.obterAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Token cuja sessão não tem visão gerencial (balconista): vai direto ao /caixa/status. */
  private tokenSemVisaoGerencial: string | null = null;

  private async obterCaixaAbertoApi(): Promise<Caixa | null> {
    const token = this.sessao?.obterAccessToken() ?? null;
    if (!token || token !== this.tokenSemVisaoGerencial) {
      const gerencial = await fetch(`${this.apiBase}/caixa/gerencial`, { headers: this.autenticacao() });
      if (gerencial.ok) {
        // null = nenhum turno aberto
        const dto = (await gerencial.json()) as ApiCaixaGerencial | null;
        return dto ? caixaDaApi(dto) : null;
      }
      if (gerencial.status === 404) return null;
      if (gerencial.status !== 403) throw new Error(await mensagemDeErro(gerencial, "consultar o caixa"));
      this.tokenSemVisaoGerencial = token;
    }

    // Operador sem visão gerencial: só a situação do caixa (fechamento cego).
    const dto = await requisitarApi<ApiCaixaOperador | null>(
      this.sessao,
      `${this.apiBase}/caixa/status`,
      "consultar o caixa"
    );
    return dto ? caixaDaApi(dto) : null;
  }

  private caixaAtivo: Caixa | null = new Caixa({
    id: "cx-turno-012",
    turnoNumero: 12,
    operadorId: "usr-admin",
    operadorNome: "Carlos Eduardo (Balcão)",
    status: StatusCaixa.ABERTO,
    saldoInicial: new Dinheiro(200.0),
    dataAbertura: new Date(Date.now() - 4 * 3600 * 1000), // Aberto há 4 horas
    movimentacoes: [
      {
        id: "mov-01",
        tipo: TipoMovimentacaoCaixa.ENTRADA_VENDA,
        valor: new Dinheiro(76.0),
        formaPagamento: FormaPagamento.DINHEIRO,
        descricao: "Venda Balcão #VND-849102 (2x Lâmpada H7)",
        dataHora: new Date(Date.now() - 3 * 3600 * 1000),
        operadorNome: "Carlos Eduardo",
      },
      {
        id: "mov-02",
        tipo: TipoMovimentacaoCaixa.ENTRADA_VENDA,
        valor: new Dinheiro(490.0),
        formaPagamento: FormaPagamento.PIX,
        descricao: "Venda Balcão #VND-849103 (Bateria Moura 60Ah)",
        dataHora: new Date(Date.now() - 2 * 3600 * 1000),
        operadorNome: "Carlos Eduardo",
      },
      {
        id: "mov-03",
        tipo: TipoMovimentacaoCaixa.SANGRIA,
        valor: new Dinheiro(150.0),
        formaPagamento: FormaPagamento.DINHEIRO,
        descricao: "Sangria para cofre administrativo",
        dataHora: new Date(Date.now() - 1 * 3600 * 1000),
        operadorNome: "Carlos Eduardo",
      },
    ],
  });

  public async obterCaixaAberto(): Promise<Caixa | null> {
    if (this.modoApi()) return this.obterCaixaAbertoApi();
    return this.caixaAtivo && this.caixaAtivo.estaAberto ? this.caixaAtivo : null;
  }

  public async abrir(operadorId: string, operadorNome: string, saldoInicial: Dinheiro): Promise<Caixa> {
    if (this.modoApi()) {
      const dto = await requisitarApi<ApiCaixaOperador>(this.sessao, `${this.apiBase}/caixa/abrir`, "abrir o caixa", {
        method: "POST",
        body: JSON.stringify({ saldo_inicial: saldoInicial.valor.toFixed(2) }),
      });
      return (await this.obterCaixaAbertoApi()) ?? caixaDaApi(dto);
    }
    const novoCaixa = new Caixa({
      id: crypto.randomUUID(),
      turnoNumero: (this.caixaAtivo?.turnoNumero || 0) + 1,
      operadorId,
      operadorNome,
      status: StatusCaixa.ABERTO,
      saldoInicial,
      dataAbertura: new Date(),
    });
    this.caixaAtivo = novoCaixa;
    return novoCaixa;
  }

  public async fechar(caixaId: string, valoresContados: ValoresContados = {}): Promise<void> {
    if (this.modoApi()) {
      const contados = Object.fromEntries(
        Object.entries(valoresContados)
          .filter(([, valor]) => valor !== undefined)
          .map(([forma, valor]) => [forma, (valor as Dinheiro).valor.toFixed(2)])
      );
      await requisitarApi(this.sessao, `${this.apiBase}/caixa/fechamento-cego`, "fechar o caixa", {
        method: "POST",
        body: JSON.stringify({ valores_contados: contados }),
      });
      return;
    }
    if (this.caixaAtivo && this.caixaAtivo.id === caixaId) {
      this.caixaAtivo.fechar();
    }
  }

  public async adicionarMovimentacao(caixaId: string, mov: MovimentacaoCaixa): Promise<void> {
    if (this.modoApi()) {
      if (!MOVIMENTACOES_MANUAIS.includes(mov.tipo)) return; // vendas/OS já lançadas pelo servidor
      await requisitarApi(this.sessao, `${this.apiBase}/caixa/movimentar`, "registrar movimentação no caixa", {
        method: "POST",
        body: JSON.stringify({
          tipo: mov.tipo,
          valor: mov.valor.valor.toFixed(2),
          forma_pagamento: mov.formaPagamento,
          descricao: mov.descricao,
        }),
      });
      return;
    }
    if (this.caixaAtivo && this.caixaAtivo.id === caixaId) {
      this.caixaAtivo.movimentacoes.unshift(mov);
    }
  }
}
