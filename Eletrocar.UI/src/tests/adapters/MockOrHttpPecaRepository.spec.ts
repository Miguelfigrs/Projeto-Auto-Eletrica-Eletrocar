import { describe, it, expect } from "vitest";
import { MockOrHttpPecaRepository } from "../../adapters/repositories/MockOrHttpPecaRepository";
import type { NovaPecaDados } from "../../application/ports/repositories/IPecaRepository";

const dadosValidos: NovaPecaDados = {
  codigoBarras: "7890000000017",
  sku: "fus-dni-30a",
  descricao: "Fusível Lâmina 30A DNI",
  precoVenda: 3.5,
  precoCusto: 1.2,
  estoqueAtual: 50,
  estoqueMinimo: 10,
  marcaFabricante: "DNI",
};

describe("Adapter: MockOrHttpPecaRepository — cadastro e entrada de estoque", () => {
  it("cadastra uma nova peça, normaliza o SKU e a torna buscável", async () => {
    const repo = new MockOrHttpPecaRepository();
    const antes = (await repo.listar()).length;

    const peca = await repo.cadastrar(dadosValidos);

    expect(peca.sku).toBe("FUS-DNI-30A");
    expect(peca.estoqueAtual).toBe(50);
    expect((await repo.listar()).length).toBe(antes + 1);
    expect(await repo.buscarPorCodigoOuBarcode("7890000000017")).toBe(peca);
  });

  it("recusa SKU ou código de barras já cadastrados", async () => {
    const repo = new MockOrHttpPecaRepository();
    await expect(repo.cadastrar({ ...dadosValidos, sku: "ALT-BOSCH-12V" })).rejects.toThrow(/SKU/);
    await expect(repo.cadastrar({ ...dadosValidos, codigoBarras: "7891049281023" })).rejects.toThrow(
      /código de barras/
    );
  });

  it("valida preço de venda e estoque inicial", async () => {
    const repo = new MockOrHttpPecaRepository();
    await expect(repo.cadastrar({ ...dadosValidos, precoVenda: 0 })).rejects.toThrow(/Preço de venda/);
    await expect(repo.cadastrar({ ...dadosValidos, estoqueAtual: -1 })).rejects.toThrow(/Estoque inicial/);
    await expect(repo.cadastrar({ ...dadosValidos, estoqueAtual: 1.5 })).rejects.toThrow(/Estoque inicial/);
  });

  it("aumenta o saldo de uma peça existente", async () => {
    const repo = new MockOrHttpPecaRepository();
    const peca = (await repo.buscarPorCodigoOuBarcode("ALT-BOSCH-12V"))!;
    const saldo = peca.estoqueAtual;

    await repo.atualizarEstoque(peca.id, 7);

    expect(peca.estoqueAtual).toBe(saldo + 7);
  });
});
