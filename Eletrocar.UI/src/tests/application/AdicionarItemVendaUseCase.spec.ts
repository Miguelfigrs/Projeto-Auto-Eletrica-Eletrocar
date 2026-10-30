import { describe, it, expect, vi } from "vitest";
import { AdicionarItemVendaUseCase } from "../../application/use-cases/balcao/AdicionarItemVendaUseCase";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Peca } from "../../domain/entities/Peca";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { IPecaRepository } from "../../application/ports/repositories/IPecaRepository";
import { ISoundEffectGateway } from "../../application/ports/gateways/ISoundEffectGateway";
import { EstoqueInsuficienteError } from "../../domain/exceptions/DomainExceptions";

describe("Caso de Uso: AdicionarItemVendaUseCase (TDD & Regras de Balcão)", () => {
  const pecaMock = new Peca({
    id: "peca-bateria",
    codigoBarras: "7898237461928",
    sku: "BAT-MOU-60A",
    descricao: "Bateria Moura 60Ah",
    precoVenda: new Dinheiro(490.0),
    estoqueAtual: 5,
  });

  const fakePecaRepo: IPecaRepository = {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorCodigoOuBarcode: vi.fn().mockImplementation(async (codigo: string) => {
      if (codigo === "7898237461928" || codigo === "BAT-MOU-60A") {
        return pecaMock;
      }
      return null;
    }),
    atualizarEstoque: vi.fn(),
  };

  const fakeSoundGateway: ISoundEffectGateway = {
    tocarBipSucesso: vi.fn(),
    tocarAlertaErro: vi.fn(),
    tocarNotificacaoVoz: vi.fn(),
  };

  it("deve adicionar item ao carrinho e disparar bip de sucesso", async () => {
    const uc = new AdicionarItemVendaUseCase(fakePecaRepo, fakeSoundGateway);
    const venda = new VendaBalcao();

    await uc.executar(venda, "7898237461928", 1);

    expect(venda.itens.length).toBe(1);
    expect(venda.total.valor).toBe(490.0);
    expect(fakeSoundGateway.tocarBipSucesso).toHaveBeenCalled();
  });

  it("deve lançar EstoqueInsuficienteError e bip grave se a quantidade for maior que o saldo", async () => {
    const uc = new AdicionarItemVendaUseCase(fakePecaRepo, fakeSoundGateway);
    const venda = new VendaBalcao();

    // Peça possui saldo de 5; solicitando 10
    await expect(uc.executar(venda, "7898237461928", 10)).rejects.toThrow(
      EstoqueInsuficienteError
    );
    expect(fakeSoundGateway.tocarAlertaErro).toHaveBeenCalled();
  });

  it("deve lançar erro se o código de barras não existir no catálogo", async () => {
    const uc = new AdicionarItemVendaUseCase(fakePecaRepo, fakeSoundGateway);
    const venda = new VendaBalcao();

    await expect(uc.executar(venda, "CODIGO_INEXISTENTE", 1)).rejects.toThrow(
      'Peça "CODIGO_INEXISTENTE" não localizada no catálogo.'
    );
    expect(fakeSoundGateway.tocarAlertaErro).toHaveBeenCalled();
  });
});
