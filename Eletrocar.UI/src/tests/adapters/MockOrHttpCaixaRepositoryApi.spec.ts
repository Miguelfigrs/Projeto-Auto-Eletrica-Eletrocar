import { describe, it, expect, vi, afterEach } from "vitest";
import { MockOrHttpCaixaRepository } from "../../adapters/repositories/MockOrHttpCaixaRepository";
import type { SessaoApi } from "../../adapters/repositories/apiHttp";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, StatusCaixa, TipoMovimentacaoCaixa } from "../../domain/value-objects/Enums";

const sessaoApi: SessaoApi = { isModoApi: () => true, obterAccessToken: () => "tok" };

const resposta = (status: number, corpo: unknown) => ({ ok: status < 400, status, json: async () => corpo });

const caixaOperador = {
  id: "cx-1",
  operador_id: "op-1",
  operador_nome: "Juliana",
  status: "ABERTO",
  saldo_inicial: "200.00",
  data_abertura: "2026-11-24T11:30:00",
  quantidade_movimentacoes: 2,
};

const caixaGerencial = {
  ...caixaOperador,
  saldo_teorico_dinheiro: "245.00",
  totais_por_forma: { DINHEIRO: "245.00", PIX: "119.80" },
  data_fechamento: null,
  movimentacoes: [
    { id: "m1", tipo: "ENTRADA_VENDA", valor: "119.80", forma_pagamento: "PIX", descricao: "Venda #VB-2026-0007", created_at: "2026-11-24T14:02:54" },
    { id: "m2", tipo: "SUPRIMENTO", valor: "45.00", forma_pagamento: "DINHEIRO", descricao: "Troco", created_at: "2026-11-24T15:00:00" },
  ],
};

const movimento = (tipo: TipoMovimentacaoCaixa) => ({
  id: "x",
  tipo,
  valor: new Dinheiro(50),
  formaPagamento: FormaPagamento.DINHEIRO,
  descricao: "Sangria: cofre",
  dataHora: new Date(),
  operadorNome: "Ana",
});

describe("Adapter: MockOrHttpCaixaRepository — modo API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("administrador vê o caixa gerencial com saldo do servidor e lançamentos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, caixaGerencial));
    vi.stubGlobal("fetch", fetchMock);

    const caixa = await new MockOrHttpCaixaRepository(sessaoApi).obterCaixaAberto();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/caixa/gerencial", { headers: { Authorization: "Bearer tok" } });
    expect(caixa?.visaoGerencial).toBe(true);
    expect(caixa?.operadorNome).toBe("Juliana");
    expect(caixa?.saldoEsperadoEmDinheiro.formatar()).toMatch(/245,00/);
    expect(caixa?.movimentacoes.map((m) => m.id)).toEqual(["m2", "m1"]);
    expect(caixa?.totalPorFormaPagamento(FormaPagamento.PIX).formatar()).toMatch(/119,80/);
    expect(caixa?.rotuloTurno).toMatch(/^de \d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it("operador sem permissão gerencial recebe só a situação (fechamento cego)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta(403, { erro: "Acesso negado" }))
      .mockResolvedValueOnce(resposta(200, caixaOperador));
    vi.stubGlobal("fetch", fetchMock);

    const caixa = await new MockOrHttpCaixaRepository(sessaoApi).obterCaixaAberto();

    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/caixa/status");
    expect(caixa?.estaAberto).toBe(true);
    expect(caixa?.visaoGerencial).toBe(false);
    expect(caixa?.movimentacoes).toEqual([]);
  });

  it("depois do primeiro 403 o balconista vai direto ao /caixa/status (sem 403 a cada tela)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta(403, { erro: "Acesso negado" }))
      .mockResolvedValue(resposta(200, caixaOperador));
    vi.stubGlobal("fetch", fetchMock);

    const repo = new MockOrHttpCaixaRepository(sessaoApi);
    await repo.obterCaixaAberto();
    await repo.obterCaixaAberto();

    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls.filter((u) => u === "/api/v1/caixa/gerencial")).toHaveLength(1);
    expect(urls.filter((u) => u === "/api/v1/caixa/status")).toHaveLength(2);
  });

  it("administrador sem turno aberto recebe null do gerencial", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(200, null)));
    expect(await new MockOrHttpCaixaRepository(sessaoApi).obterCaixaAberto()).toBeNull();
  });

  it("sem caixa aberto devolve null (404 no gerencial ou null no status)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(404, { detail: "Caixa não encontrado." })));
    expect(await new MockOrHttpCaixaRepository(sessaoApi).obterCaixaAberto()).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(resposta(403, {})).mockResolvedValueOnce(resposta(200, null))
    );
    expect(await new MockOrHttpCaixaRepository(sessaoApi).obterCaixaAberto()).toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(500, { erro: "Banco indisponível" })));
    await expect(new MockOrHttpCaixaRepository(sessaoApi).obterCaixaAberto()).rejects.toThrow("Banco indisponível");
  });

  it("abre o turno no servidor e relê o caixa", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(resposta(201, caixaOperador))
      .mockResolvedValueOnce(resposta(200, caixaGerencial));
    vi.stubGlobal("fetch", fetchMock);

    const caixa = await new MockOrHttpCaixaRepository(sessaoApi).abrir("op-1", "Juliana", new Dinheiro(200));

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/caixa/abrir");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ saldo_inicial: "200.00" });
    expect(caixa.status).toBe(StatusCaixa.ABERTO);
    expect(caixa.visaoGerencial).toBe(true);
  });

  it("envia sangria/suprimento e ignora entradas de venda (já lançadas pelo servidor)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, {}));
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpCaixaRepository(sessaoApi);

    await repo.adicionarMovimentacao("cx-1", movimento(TipoMovimentacaoCaixa.ENTRADA_VENDA));
    expect(fetchMock).not.toHaveBeenCalled();

    await repo.adicionarMovimentacao("cx-1", movimento(TipoMovimentacaoCaixa.SANGRIA));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/caixa/movimentar");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      tipo: "SANGRIA",
      valor: "50.00",
      forma_pagamento: "DINHEIRO",
      descricao: "Sangria: cofre",
    });
  });

  it("fecha com os valores contados por forma de pagamento", async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, { mensagem: "Caixa fechado." }));
    vi.stubGlobal("fetch", fetchMock);

    await new MockOrHttpCaixaRepository(sessaoApi).fechar("cx-1", {
      [FormaPagamento.DINHEIRO]: new Dinheiro(245),
      [FormaPagamento.PIX]: new Dinheiro(119.8),
    });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/caixa/fechamento-cego");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      valores_contados: { DINHEIRO: "245.00", PIX: "119.80" },
    });
  });
});
