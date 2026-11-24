import { describe, it, expect, vi, afterEach } from "vitest";
import {
  MockOrHttpOSRepository,
  checklistDaApi,
  checklistParaApi,
  normalizarPlaca,
} from "../../adapters/repositories/MockOrHttpOSRepository";
import type { SessaoApi } from "../../adapters/repositories/apiHttp";
import { OrdemServico } from "../../domain/entities/OrdemServico";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, PrioridadeOS, StatusOS } from "../../domain/value-objects/Enums";

const sessaoApi: SessaoApi = { isModoApi: () => true, obterAccessToken: () => "tok" };
const ok = (corpo: unknown, status = 200) => ({ ok: true, status, json: async () => corpo });

const apiOS = (over: Record<string, unknown> = {}) => ({
  id: "os-uuid",
  numero_os: "OS-2026-0009",
  cliente_id: "cli-1",
  nome_cliente: "Carlos Alberto",
  descricao_carro: "Volkswagen Gol 1.6 [BRA2E19]",
  modelo_carro: "Volkswagen Gol 1.6",
  placa_carro: "BRA2E19",
  usuario_id: "u-1",
  status: "TRIAGEM",
  origem: "BALCAO",
  prioridade: "ALTA",
  sintomas: "Bateria não carrega",
  hipotese_diagnostica: null,
  checklist_eletrico: { bateria: true },
  itens: [{ id: "i1", peca_id: "p1", descricao_peca: "Regulador", quantidade: 1, preco_unitario: "185.00" }],
  servicos: [{ id: "s1", descricao: "Diagnóstico", valor: "80.00" }],
  desconto: "0.00",
  forma_pagamento: null,
  observacoes: null,
  created_at: "2026-11-24T13:00:00",
  updated_at: "2026-11-24T13:10:00",
  ...over,
});

function novaOS(over: Partial<ConstructorParameters<typeof OrdemServico>[0]> = {}) {
  return new OrdemServico({
    id: "local",
    numeroOS: "OS-LOCAL",
    clienteId: "x",
    clienteNome: "Carlos Alberto",
    carroModelo: "Gol 1.6",
    carroMarca: "Volkswagen",
    carroPlaca: "bra-2e19",
    usuarioId: "u",
    prioridade: PrioridadeOS.ALTA,
    sintomas: "Bateria não carrega",
    ...over,
  });
}

const corpo = (fetchMock: ReturnType<typeof vi.fn>, i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);

describe("Adapter: MockOrHttpOSRepository — modo API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("traduz as chaves do checklist entre servidor e tela", () => {
    expect(checklistDaApi({ motor_partida: true, injecao: true, bateria: false })).toEqual({
      bateria: false,
      alternador: false,
      motorPartida: true,
      iluminacao: false,
      injecaoEletronica: true,
    });
    expect(checklistParaApi({ motorPartida: true, injecaoEletronica: false, bateria: true })).toEqual({
      motor_partida: true,
      injecao: false,
      bateria: true,
    });
  });

  it("normaliza placas como o servidor", () => {
    expect(normalizarPlaca("bra-2e19")).toBe("BRA2E19");
    expect(normalizarPlaca("Placa não informada")).toBe("");
    expect(normalizarPlaca(undefined)).toBe("");
  });

  it("lista as OS da API com filtro e completa o checklist padrão", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([apiOS()]));
    vi.stubGlobal("fetch", fetchMock);

    const [os] = await new MockOrHttpOSRepository(sessaoApi).listar(StatusOS.TRIAGEM);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/ordens-servico?status=TRIAGEM");
    expect(os.carroModelo).toBe("Volkswagen Gol 1.6");
    expect(os.carroPlaca).toBe("BRA2E19");
    expect(os.checklistEletrico).toMatchObject({ bateria: true, alternador: false, motorPartida: false });
    expect(os.total.formatar()).toMatch(/265,00/);
  });

  it("abre a OS no carro já cadastrado com a mesma placa", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok([{ id: "cli-1", nome: "Carlos", carros: [{ id: "car-1", modelo: "Gol", marca: "VW", placa: "BRA2E19" }] }]))
      .mockResolvedValueOnce(ok(apiOS(), 201));
    vi.stubGlobal("fetch", fetchMock);

    const os = await new MockOrHttpOSRepository(sessaoApi).salvar(novaOS());

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/clientes/search?q=BRA2E19");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/ordens-servico");
    expect(corpo(fetchMock, 1)).toMatchObject({ cliente_id: "cli-1", carro_id: "car-1", prioridade: "ALTA" });
    expect(os.numeroOS).toBe("OS-2026-0009");
  });

  it("cliente com o mesmo nome ganha o carro novo", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok([])) // ninguém com a placa
      .mockResolvedValueOnce(ok([{ id: "cli-1", nome: "carlos alberto", carros: [{ id: "car-0", modelo: "Uno", marca: "Fiat", placa: null }] }]))
      .mockResolvedValueOnce(
        ok({ id: "cli-1", nome: "Carlos Alberto", carros: [
          { id: "car-0", modelo: "Uno", marca: "Fiat", placa: null },
          { id: "car-novo", modelo: "Gol 1.6", marca: "Volkswagen", placa: "BRA2E19" },
        ] }, 201)
      )
      .mockResolvedValueOnce(ok(apiOS(), 201));
    vi.stubGlobal("fetch", fetchMock);

    await new MockOrHttpOSRepository(sessaoApi).salvar(novaOS());

    expect(fetchMock.mock.calls[2][0]).toBe("/api/v1/clientes/cli-1/carros");
    expect(corpo(fetchMock, 2)).toEqual({ modelo: "Gol 1.6", marca: "Volkswagen", placa: "BRA2E19" });
    expect(corpo(fetchMock, 3)).toMatchObject({ cliente_id: "cli-1", carro_id: "car-novo" });
  });

  it("sem placa reaproveita o carro do mesmo modelo; cliente novo é cadastrado com o carro", async () => {
    const reaproveita = vi
      .fn()
      .mockResolvedValueOnce(ok([{ id: "cli-1", nome: "Carlos Alberto", carros: [{ id: "car-1", modelo: "gol 1.6", marca: "VW", placa: null }] }]))
      .mockResolvedValueOnce(ok(apiOS(), 201));
    vi.stubGlobal("fetch", reaproveita);
    await new MockOrHttpOSRepository(sessaoApi).salvar(novaOS({ carroPlaca: undefined }));
    expect(corpo(reaproveita, 1)).toMatchObject({ carro_id: "car-1" });

    const cadastra = vi
      .fn()
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(ok({ id: "cli-9", nome: "Ana", carros: [{ id: "car-9", modelo: "HB20", marca: "Não informada", placa: null }] }, 201))
      .mockResolvedValueOnce(ok(apiOS(), 201));
    vi.stubGlobal("fetch", cadastra);
    await new MockOrHttpOSRepository(sessaoApi).salvar(
      novaOS({ clienteNome: "Ana", carroModelo: "HB20", carroMarca: undefined, carroPlaca: undefined })
    );
    expect(cadastra.mock.calls[1][0]).toBe("/api/v1/clientes");
    expect(corpo(cadastra, 1)).toEqual({ nome: "Ana", carros: [{ modelo: "HB20", marca: "Não informada", placa: null }] });
    expect(corpo(cadastra, 2)).toMatchObject({ cliente_id: "cli-9", carro_id: "car-9" });
  });

  it("status, checklist, mão de obra e faturamento usam as rotas da OS", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok(apiOS({ status: "ENTREGUE", forma_pagamento: "PIX" })));
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpOSRepository(sessaoApi);

    await repo.atualizarStatus("os-uuid", StatusOS.ORCAMENTO_PENDENTE);
    await repo.atualizarChecklist("os-uuid", { bateria: true });
    await repo.adicionarServico("os-uuid", { descricao: "Troca de chicote", valor: new Dinheiro(120) });
    const entregue = await repo.faturar("os-uuid", FormaPagamento.PIX);

    const chamadas = fetchMock.mock.calls.map(([url, init]) => [url, init.method]);
    expect(chamadas).toEqual([
      ["/api/v1/ordens-servico/os-uuid/status", "PATCH"],
      ["/api/v1/ordens-servico/os-uuid/checklist", "PATCH"],
      ["/api/v1/ordens-servico/os-uuid/servicos", "POST"],
      ["/api/v1/ordens-servico/os-uuid/faturar", "POST"],
    ]);
    expect(corpo(fetchMock, 0)).toEqual({ novo_status: "ORCAMENTO_PENDENTE" });
    expect(corpo(fetchMock, 2)).toEqual({ descricao: "Troca de chicote", valor: "120.00" });
    expect(corpo(fetchMock, 3)).toEqual({ forma_pagamento: "PIX" });
    expect(entregue.status).toBe(StatusOS.ENTREGUE);
  });

  it("buscarPorId devolve null no 404 e repassa outros erros", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    expect(await new MockOrHttpOSRepository(sessaoApi).buscarPorId("x")).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ erro: "Falhou" }) }));
    await expect(new MockOrHttpOSRepository(sessaoApi).buscarPorId("x")).rejects.toThrow("Falhou");
  });
});

describe("Adapter: MockOrHttpOSRepository — modo demonstração", () => {
  it("checklist, mão de obra e faturamento em memória", async () => {
    const repo = new MockOrHttpOSRepository();
    const [primeira] = await repo.listar();

    const marcada = await repo.atualizarChecklist(primeira.id, { bateria: true });
    expect(marcada.checklistEletrico).toEqual({ bateria: true });

    const antes = primeira.servicos.length;
    expect((await repo.adicionarServico(primeira.id, { descricao: "Teste", valor: new Dinheiro(10) })).servicos).toHaveLength(antes + 1);

    const finalizada = (await repo.listar(StatusOS.FINALIZADO))[0] ?? null;
    if (finalizada) {
      const entregue = await repo.faturar(finalizada.id, FormaPagamento.DINHEIRO);
      expect(entregue.status).toBe(StatusOS.ENTREGUE);
      expect(entregue.formaPagamento).toBe(FormaPagamento.DINHEIRO);
    }
    await expect(repo.atualizarChecklist("nao-existe", {})).rejects.toThrow(/não encontrada/);
  });
});
