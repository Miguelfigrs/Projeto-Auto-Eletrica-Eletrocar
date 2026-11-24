import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { DetalhamentoDREPanel } from "../../presentation/components/DetalhamentoDREPanel";
import { EstoqueView } from "../../presentation/pages/EstoqueView";
import {
  lerDataApi,
  mapearDetalhamentoApi,
} from "../../adapters/repositories/MockOrHttpDRERepository";
import { MockOrHttpHistoricoEstoqueRepository } from "../../adapters/repositories/MockOrHttpHistoricoEstoqueRepository";
import { MockOrHttpPecaRepository } from "../../adapters/repositories/MockOrHttpPecaRepository";
import type { MockOrHttpAuthRepository } from "../../adapters/repositories/MockOrHttpAuthRepository";

const detalheApi = {
  periodo: "01/10/2026 a 31/10/2026",
  total_vendas: "90.00",
  total_ordens_servico: "210.00",
  total_despesas: "3500.00",
  vendas: [
    {
      id: "v1",
      numero: "VB-2026-0001",
      data: "2026-10-09T12:45:00",
      operador: "Juliana",
      forma_pagamento: "PIX",
      subtotal: "100.00",
      desconto: "10.00",
      total: "90.00",
      custo: "40.00",
      lucro_bruto: "50.00",
      itens: [
        { descricao: "Relé Auxiliar 40A", quantidade: 4, preco_unitario: "25.00", custo_unitario: "10.00", total: "100.00" },
      ],
    },
  ],
  ordens_servico: [
    {
      id: "o1",
      numero: "OS-2026-0002",
      data: "2026-10-09T16:00:00",
      forma_pagamento: "DINHEIRO",
      valor_pecas: "60.00",
      valor_servicos: "150.00",
      desconto: "0.00",
      total: "210.00",
      custo_pecas: "20.00",
      itens: [],
      servicos: [{ descricao: "Troca do alternador", valor: "150.00" }],
    },
  ],
  despesas: [
    { id: "d1", descricao: "Aluguel do galpão", categoria: "DESPESA_FIXA", valor: "3500.00", data_pagamento: "2026-10-05", forma_pagamento: "PIX", entra_no_dre: true },
    { id: "d2", descricao: "Compra Bosch", categoria: "COMPRA_MERCADORIA", valor: "900.00", data_pagamento: "2026-10-08", forma_pagamento: "BOLETO", entra_no_dre: false },
  ],
};

describe("Detalhamento da DRE", () => {
  it("converte datas da API (UTC sem fuso e datas puras) corretamente", () => {
    expect(lerDataApi("2026-10-09T12:45:00").toISOString()).toBe("2026-10-09T12:45:00.000Z");
    expect(lerDataApi("2026-10-09T12:45:00+00:00").toISOString()).toBe("2026-10-09T12:45:00.000Z");
    const data = lerDataApi("2026-10-05");
    expect([data.getFullYear(), data.getMonth(), data.getDate()]).toEqual([2026, 9, 5]);
  });

  it("mostra vendas com itens ao expandir, OS com serviços e despesas com a categoria", () => {
    render(<DetalhamentoDREPanel detalhamento={mapearDetalhamentoApi(detalheApi)} />);

    const painel = screen.getByTestId("detalhamento-dre");
    expect(within(painel).getByText("VB-2026-0001")).toBeInTheDocument();
    expect(within(painel).getByText("Juliana")).toBeInTheDocument();
    expect(within(painel).queryByText("Relé Auxiliar 40A")).not.toBeInTheDocument();

    fireEvent.click(within(painel).getByText("VB-2026-0001"));
    expect(within(painel).getByText("Relé Auxiliar 40A")).toBeInTheDocument();

    fireEvent.click(within(painel).getByRole("tab", { name: /Ordens de serviço \(1\)/ }));
    fireEvent.click(within(painel).getByText("OS-2026-0002"));
    expect(within(painel).getByText("Troca do alternador")).toBeInTheDocument();

    fireEvent.click(within(painel).getByRole("tab", { name: /Despesas pagas \(2\)/ }));
    expect(within(painel).getByText("Aluguel do galpão")).toBeInTheDocument();
    expect(within(painel).getByText(/Não entra na DRE/)).toBeInTheDocument();
  });

  it("explica que a base demonstrativa não tem lançamentos individuais", () => {
    render(
      <DetalhamentoDREPanel
        detalhamento={{ ...mapearDetalhamentoApi({ ...detalheApi, vendas: [] }), origemDados: "DEMO" }}
      />
    );
    expect(screen.getByText(/conectado à API/)).toBeInTheDocument();
  });

  it("exibe o erro do carregamento", () => {
    render(<DetalhamentoDREPanel detalhamento={null} erro="Falha HTTP 500" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falha HTTP 500");
  });
});

describe("Histórico de entradas e saídas de peças", () => {
  afterEach(() => vi.unstubAllGlobals());

  const authDemo = { isModoApi: () => false, obterAccessToken: () => null } as unknown as MockOrHttpAuthRepository;

  it("registra localmente cadastro, entrada e saída e filtra por tipo", async () => {
    const pecas = new MockOrHttpPecaRepository();
    const repo = new MockOrHttpHistoricoEstoqueRepository(authDemo, pecas);
    const nova = await pecas.cadastrar({
      codigoBarras: "7890000000024",
      sku: "FUS-10A",
      descricao: "Fusível 10A",
      precoVenda: 2,
      precoCusto: 0.5,
      estoqueAtual: 30,
      estoqueMinimo: 5,
    });
    await pecas.atualizarEstoque(nova.id, 10);
    await pecas.atualizarEstoque(nova.id, -3);

    const hoje = new Date();
    const todos = await repo.listarMovimentacoes({ dataInicio: hoje, dataFim: hoje });
    expect(todos.origemDados).toBe("DEMO");
    expect(todos.movimentacoes.map((m) => m.origem).sort()).toEqual(["CADASTRO", "ENTRADA_FORNECEDOR", "VENDA"]);
    expect([todos.totalEntradas, todos.totalSaidas]).toEqual([40, 3]);

    const saidas = await repo.listarMovimentacoes({ dataInicio: hoje, dataFim: hoje, tipo: "SAIDA" });
    expect(saidas.movimentacoes).toHaveLength(1);

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    await expect(repo.listarMovimentacoes({ dataInicio: hoje, dataFim: ontem })).rejects.toThrow(/data final/);
  });

  it("consulta a API com período e tipo e converte a resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        periodo: "01/10/2026 a 31/10/2026",
        total_entradas: 0,
        total_saidas: 2,
        movimentacoes: [
          {
            data: "2026-10-09T12:45:00",
            tipo: "SAIDA",
            origem: "VENDA",
            quantidade: 2,
            peca_id: "p1",
            sku: "LAMP-T10",
            descricao: "Lâmpada T10",
            documento: "VB-2026-0006",
            valor_unitario: "22.00",
            usuario: "Juliana",
            observacao: null,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const authApi = { isModoApi: () => true, obterAccessToken: () => "tok" } as unknown as MockOrHttpAuthRepository;
    const repo = new MockOrHttpHistoricoEstoqueRepository(authApi, new MockOrHttpPecaRepository());

    const resultado = await repo.listarMovimentacoes({
      dataInicio: new Date(2026, 9, 1),
      dataFim: new Date(2026, 9, 31),
      tipo: "SAIDA",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/pecas/movimentacoes?data_inicio=2026-10-01&data_fim=2026-10-31&tipo=SAIDA",
      { headers: { Authorization: "Bearer tok" } }
    );
    expect(resultado.movimentacoes[0].valorUnitario?.formatar()).toMatch(/22,00/);
    expect(resultado.movimentacoes[0].data.toISOString()).toBe("2026-10-09T12:45:00.000Z");

    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(
      repo.listarMovimentacoes({ dataInicio: new Date(2026, 9, 1), dataFim: new Date(2026, 9, 31) })
    ).rejects.toThrow(/administrador/);
  });

  it("aba de histórico na tela de estoque mostra a entrada recém-registrada", async () => {
    render(<EstoqueView onBiparPecaNoBalcao={vi.fn()} modoDidatico={false} />);
    await screen.findByText("Bobina de Ignição Bosch 4 Pinos");

    const card = screen.getByRole("heading", { name: "Bobina de Ignição Bosch 4 Pinos" }).closest(".card") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: /Entrada/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Quantidade recebida/i), { target: { value: "6" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Registrar entrada/i }));
    await screen.findByText(/\+6 un adicionadas/);

    fireEvent.click(screen.getByRole("tab", { name: /Histórico de entradas e saídas/ }));
    const historico = await screen.findByTestId("historico-estoque");
    await waitFor(() => expect(within(historico).getByText("Bobina de Ignição Bosch 4 Pinos")).toBeInTheDocument());
    expect(within(historico).getByText("Entrada de fornecedor")).toBeInTheDocument();
    expect(within(historico).getByText("+6")).toBeInTheDocument();

    fireEvent.change(within(historico).getByLabelText("Tipo"), { target: { value: "SAIDA" } });
    await waitFor(() =>
      expect(within(historico).queryByText("Bobina de Ignição Bosch 4 Pinos")).not.toBeInTheDocument()
    );
  });
});
