import { describe, it, expect, vi } from "vitest";
import { FinalizarVendaUseCase } from "../../application/use-cases/balcao/FinalizarVendaUseCase";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Peca } from "../../domain/entities/Peca";
import { Caixa } from "../../domain/entities/Caixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, StatusCaixa, StatusVenda } from "../../domain/value-objects/Enums";
import { IVendaRepository } from "../../application/ports/repositories/IVendaRepository";
import { IPecaRepository } from "../../application/ports/repositories/IPecaRepository";
import { ICaixaRepository } from "../../application/ports/repositories/ICaixaRepository";
import { ISoundEffectGateway } from "../../application/ports/gateways/ISoundEffectGateway";
import { CaixaFechadoError } from "../../domain/exceptions/DomainExceptions";

describe("Caso de Uso: FinalizarVendaUseCase (TDD & Conciliação)", () => {
  const pecaMock = new Peca({
    id: "p-rele",
    codigoBarras: "7895847362910",
    sku: "REL-DNI-0102",
    descricao: "Relé Auxiliar 4 Pinos",
    precoVenda: new Dinheiro(22.0),
    estoqueAtual: 10,
  });

  const caixaAbertoMock = new Caixa({
    id: "caixa-10",
    turnoNumero: 10,
    operadorId: "usr-1",
    operadorNome: "Carlos",
    status: StatusCaixa.ABERTO,
    saldoInicial: new Dinheiro(100.0),
  });

  const fakeVendaRepo: IVendaRepository = {
    salvar: vi.fn().mockImplementation(async (v) => v),
    listarHoje: vi.fn(),
  };

  const fakePecaRepo: IPecaRepository = {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorCodigoOuBarcode: vi.fn(),
    atualizarEstoque: vi.fn(),
  };

  const fakeCaixaRepo: ICaixaRepository = {
    obterCaixaAberto: vi.fn().mockResolvedValue(caixaAbertoMock),
    abrir: vi.fn(),
    fechar: vi.fn(),
    adicionarMovimentacao: vi.fn(),
  };

  const fakeSoundGateway: ISoundEffectGateway = {
    tocarBipSucesso: vi.fn(),
    tocarAlertaErro: vi.fn(),
    tocarNotificacaoVoz: vi.fn(),
  };

  it("deve finalizar venda, baixar estoque e registrar entrada no caixa", async () => {
    const uc = new FinalizarVendaUseCase(
      fakeVendaRepo,
      fakePecaRepo,
      fakeCaixaRepo,
      fakeSoundGateway
    );

    const venda = new VendaBalcao();
    venda.adicionarItem(pecaMock, 2);

    const resultado = await uc.executar(venda, FormaPagamento.DINHEIRO, "Carlos");

    expect(resultado.status).toBe(StatusVenda.CONCLUIDA);
    expect(fakePecaRepo.atualizarEstoque).toHaveBeenCalledWith("p-rele", -2);
    expect(fakeCaixaRepo.adicionarMovimentacao).toHaveBeenCalled();
    expect(fakeSoundGateway.tocarBipSucesso).toHaveBeenCalled();
  });

  it("deve impedir finalização se o caixa estiver fechado", async () => {
    fakeCaixaRepo.obterCaixaAberto = vi.fn().mockResolvedValue(null);

    const uc = new FinalizarVendaUseCase(
      fakeVendaRepo,
      fakePecaRepo,
      fakeCaixaRepo,
      fakeSoundGateway
    );

    const venda = new VendaBalcao();
    venda.adicionarItem(pecaMock, 1);

    await expect(uc.executar(venda, FormaPagamento.DINHEIRO, "Carlos")).rejects.toThrow(
      CaixaFechadoError
    );
  });
});
