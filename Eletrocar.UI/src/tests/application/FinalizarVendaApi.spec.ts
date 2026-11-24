import { describe, it, expect, vi, afterEach } from "vitest";
import { FinalizarVendaUseCase } from "../../application/use-cases/balcao/FinalizarVendaUseCase";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Peca } from "../../domain/entities/Peca";
import { Caixa } from "../../domain/entities/Caixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, StatusCaixa, StatusVenda } from "../../domain/value-objects/Enums";
import type { IPecaRepository } from "../../application/ports/repositories/IPecaRepository";
import type { ICaixaRepository } from "../../application/ports/repositories/ICaixaRepository";
import type { ISoundEffectGateway } from "../../application/ports/gateways/ISoundEffectGateway";
import { MockOrHttpVendaRepository } from "../../adapters/repositories/MockOrHttpVendaRepository";
import type { SessaoApi } from "../../adapters/repositories/apiHttp";

const sessaoApi: SessaoApi = { isModoApi: () => true, obterAccessToken: () => "tok" };

const peca = new Peca({
  id: "7c1e0000-0000-4000-8000-000000000001",
  codigoBarras: "7895847362910",
  sku: "REL-DNI-0102",
  descricao: "Relé Auxiliar 4 Pinos",
  precoVenda: new Dinheiro(22.0),
  estoqueAtual: 10,
});

const respostaVenda = {
  id: "venda-uuid",
  numero_venda: "VB-2026-0007",
  operador_id: "op-uuid",
  cliente_id: null,
  itens: [
    { id: "item-uuid", peca_id: peca.id, descricao_peca: peca.descricao, quantidade: 2, preco_unitario: "22.00", subtotal: "44.00" },
  ],
  subtotal: "44.00",
  desconto: "4.00",
  valor_total: "40.00",
  forma_pagamento: "PIX",
  status: "CONCLUIDA",
  data_hora: "2026-11-24T13:05:00",
};

function montar() {
  const pecaRepo: IPecaRepository = {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorCodigoOuBarcode: vi.fn(),
    atualizarEstoque: vi.fn(),
    cadastrar: vi.fn(),
  };
  const caixaRepo: ICaixaRepository = {
    obterCaixaAberto: vi.fn().mockResolvedValue(
      new Caixa({
        id: "caixa-1",
        turnoNumero: 1,
        operadorId: "u",
        operadorNome: "Ana",
        status: StatusCaixa.ABERTO,
        saldoInicial: new Dinheiro(0),
      })
    ),
    abrir: vi.fn(),
    fechar: vi.fn(),
    adicionarMovimentacao: vi.fn(),
  };
  const som: ISoundEffectGateway = { tocarBipSucesso: vi.fn(), tocarAlertaErro: vi.fn(), tocarNotificacaoVoz: vi.fn() };
  const vendaRepo = new MockOrHttpVendaRepository(sessaoApi);
  const uc = new FinalizarVendaUseCase(vendaRepo, pecaRepo, caixaRepo, som);
  const venda = new VendaBalcao();
  venda.adicionarItem(peca, 2);
  venda.aplicarDesconto(new Dinheiro(4));
  return { uc, venda, pecaRepo, caixaRepo, som };
}

describe("PDV gravando a venda na API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia a venda ao servidor e usa o número e os valores oficiais", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => respostaVenda });
    vi.stubGlobal("fetch", fetchMock);
    const { uc, venda, pecaRepo, caixaRepo, som } = montar();

    const salva = await uc.executar(venda, FormaPagamento.PIX, "Ana");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/vendas");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok" });
    expect(JSON.parse(init.body)).toEqual({
      itens: [{ peca_id: peca.id, quantidade: 2 }],
      forma_pagamento: "PIX",
      desconto: "4.00",
    });

    expect(salva.numeroVenda).toBe("VB-2026-0007");
    expect(salva.status).toBe(StatusVenda.CONCLUIDA);
    expect(salva.total.formatar()).toMatch(/40,00/);
    expect(salva.itens[0].sku).toBe("REL-DNI-0102");
    expect(salva.criadoEm.toISOString()).toBe("2026-11-24T13:05:00.000Z");
    expect(pecaRepo.atualizarEstoque).toHaveBeenCalledWith(peca.id, -2);
    expect(caixaRepo.adicionarMovimentacao).toHaveBeenCalledWith(
      "caixa-1",
      expect.objectContaining({ descricao: "Venda balcão #VB-2026-0007" })
    );
    expect(som.tocarBipSucesso).toHaveBeenCalled();
  });

  it("se o servidor recusar, mostra a mensagem e não altera estoque nem caixa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ erro: "Estoque insuficiente para 'Relé Auxiliar 4 Pinos'." }),
      })
    );
    const { uc, venda, pecaRepo, caixaRepo, som } = montar();

    await expect(uc.executar(venda, FormaPagamento.DINHEIRO, "Ana")).rejects.toThrow(
      "Estoque insuficiente para 'Relé Auxiliar 4 Pinos'."
    );
    expect(pecaRepo.atualizarEstoque).not.toHaveBeenCalled();
    expect(caixaRepo.adicionarMovimentacao).not.toHaveBeenCalled();
    expect(som.tocarAlertaErro).toHaveBeenCalled();
    expect(som.tocarBipSucesso).not.toHaveBeenCalled();
  });

  it("lista somente as vendas de hoje vindas da API", async () => {
    const agora = new Date();
    const ontem = new Date(agora.getTime() - 86_400_000);
    const semFuso = (d: Date) => d.toISOString().replace("Z", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { ...respostaVenda, numero_venda: "VB-HOJE", data_hora: semFuso(agora) },
          { ...respostaVenda, numero_venda: "VB-ONTEM", data_hora: semFuso(ontem) },
        ],
      })
    );
    const repo = new MockOrHttpVendaRepository(sessaoApi);
    expect((await repo.listarHoje()).map((v) => v.numeroVenda)).toEqual(["VB-HOJE"]);
  });

  it("sem API mantém as vendas em memória", async () => {
    const repo = new MockOrHttpVendaRepository();
    const venda = new VendaBalcao();
    venda.adicionarItem(peca, 1);
    expect(await repo.salvar(venda)).toBe(venda);
    expect((await repo.listarHoje())[0]).toBe(venda);
  });
});
