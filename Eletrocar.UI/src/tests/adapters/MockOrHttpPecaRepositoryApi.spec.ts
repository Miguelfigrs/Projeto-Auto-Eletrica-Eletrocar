import { describe, it, expect, vi, afterEach } from "vitest";
import { MockOrHttpPecaRepository, type SessaoApi } from "../../adapters/repositories/MockOrHttpPecaRepository";

const sessaoApi: SessaoApi = { isModoApi: () => true, obterAccessToken: () => "tok" };

function apiPeca(overrides: Record<string, unknown> = {}) {
  return {
    id: "8f0c6a6e-0000-4000-8000-000000000001",
    codigo_barras: "7891049281023",
    sku: "ALT-BOSCH-12V",
    descricao: "Regulador de Voltagem Bosch 12V",
    preco_custo: "110.00",
    preco_venda: "185.00",
    estoque_atual: 14,
    estoque_minimo: 4,
    localizacao: "Gaveteiro E-02",
    fabricante: "Bosch",
    aplicacao_veicular: null,
    ...overrides,
  };
}

const ok = (corpo: unknown) => ({ ok: true, status: 200, json: async () => corpo });
const falha = (status: number, corpo: unknown) => ({ ok: false, status, json: async () => corpo });

describe("Adapter: MockOrHttpPecaRepository — modo API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("carrega o catálogo da API com o token e converte os campos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([apiPeca()]));
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpPecaRepository(sessaoApi);

    const [peca] = await repo.listar();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/pecas", { headers: { Authorization: "Bearer tok" } });
    expect(peca.sku).toBe("ALT-BOSCH-12V");
    expect(peca.precoVenda.formatar()).toMatch(/185,00/);
    expect(peca.marcaFabricante).toBe("Bosch");
    expect(peca.aplicacaoVeicular).toBe("Universal");
    expect(await repo.buscarPorCodigoOuBarcode("alt-bosch-12v")).toBe(peca);
    expect(await repo.listar("nada-disso")).toEqual([]);
  });

  it("registra entrada via POST /pecas/{id}/entrada e atualiza o saldo em cache", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok([apiPeca()]))
      .mockResolvedValueOnce(ok(apiPeca({ estoque_atual: 24 })));
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpPecaRepository(sessaoApi);
    const [peca] = await repo.listar();

    await repo.atualizarEstoque(peca.id, 10);

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(`/api/v1/pecas/${peca.id}/entrada`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ quantidade: 10 });
    expect(init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok" });
    expect((await repo.buscarPorId(peca.id))?.estoqueAtual).toBe(24);
  });

  it("baixa após venda no modo API não chama a rede e força reler o saldo do servidor", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok([apiPeca()]))
      .mockResolvedValueOnce(ok([apiPeca({ estoque_atual: 12 })]));
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpPecaRepository(sessaoApi);
    const [peca] = await repo.listar();

    await repo.atualizarEstoque(peca.id, -2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(repo.listarMovimentacoesLocais()).toEqual([]);

    expect((await repo.buscarPorId(peca.id))?.estoqueAtual).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cadastra via POST /pecas com os campos da API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(apiPeca({ id: "nova", sku: "FUS-30A", descricao: "Fusível 30A", estoque_atual: 8 })));
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpPecaRepository(sessaoApi);

    const peca = await repo.cadastrar({
      codigoBarras: "7891234500017",
      sku: "fus-30a",
      descricao: " Fusível 30A ",
      precoVenda: 3,
      precoCusto: 1.1,
      estoqueAtual: 8,
      estoqueMinimo: 2,
      marcaFabricante: "DNI",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/pecas");
    expect(JSON.parse(init.body)).toEqual({
      codigo_barras: "7891234500017",
      sku: "FUS-30A",
      descricao: "Fusível 30A",
      preco_custo: "1.10",
      preco_venda: "3.00",
      estoque_atual: 8,
      estoque_minimo: 2,
      fabricante: "DNI",
      aplicacao_veicular: null,
      localizacao: null,
    });
    expect(peca.estoqueAtual).toBe(8);
  });

  it("repassa as mensagens de erro da API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(falha(400, { erro: "Já existe uma peça com o SKU 'FUS-30A'." }))
      .mockResolvedValueOnce(falha(403, {}))
      .mockResolvedValueOnce(falha(422, { detail: [{ msg: "valor inválido" }] }))
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => Promise.reject(new Error("sem json")) });
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpPecaRepository(sessaoApi);
    const dados = {
      codigoBarras: "1",
      sku: "FUS-30A",
      descricao: "Fusível",
      precoVenda: 3,
      precoCusto: 1,
      estoqueAtual: 1,
      estoqueMinimo: 1,
    };

    await expect(repo.cadastrar(dados)).rejects.toThrow("Já existe uma peça com o SKU 'FUS-30A'.");
    await expect(repo.cadastrar(dados)).rejects.toThrow("Seu perfil não tem permissão para cadastrar peças.");
    await expect(repo.cadastrar(dados)).rejects.toThrow("valor inválido");
    await expect(repo.listar()).rejects.toThrow("Falha ao carregar o catálogo de peças (HTTP 500).");
  });

  it("valida os dados antes de chamar a API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const repo = new MockOrHttpPecaRepository(sessaoApi);
    await expect(
      repo.cadastrar({ codigoBarras: "1", sku: "X", descricao: "Y", precoVenda: 0, precoCusto: 0, estoqueAtual: 0, estoqueMinimo: 0 })
    ).rejects.toThrow(/Preço de venda/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
