/**
 * Repositório de Vendas de Balcão (Adapter)
 */
import { IVendaRepository } from "../../application/ports/repositories/IVendaRepository";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, StatusVenda } from "../../domain/value-objects/Enums";

export class MockOrHttpVendaRepository implements IVendaRepository {
  private vendas: VendaBalcao[] = [
    new VendaBalcao({
      id: "venda-01",
      numeroVenda: "VND-849102",
      itens: [
        {
          id: "it-v1",
          pecaId: "peca-005",
          sku: "LMP-OSR-H7",
          descricao: "Lâmpada Farol H7 12V 55W Osram",
          quantidade: 2,
          precoUnitario: new Dinheiro(38.0),
        },
      ],
      formaPagamento: FormaPagamento.DINHEIRO,
      status: StatusVenda.CONCLUIDA,
      operadorId: "usr-admin",
      clienteNome: "Consumidor Balcão",
      criadoEm: new Date(Date.now() - 3 * 3600 * 1000),
    }),
    new VendaBalcao({
      id: "venda-02",
      numeroVenda: "VND-849103",
      itens: [
        {
          id: "it-v2",
          pecaId: "peca-003",
          sku: "BAT-MOU-60A",
          descricao: "Bateria Moura 60Ah M60GD Selada",
          quantidade: 1,
          precoUnitario: new Dinheiro(490.0),
        },
      ],
      formaPagamento: FormaPagamento.PIX,
      status: StatusVenda.CONCLUIDA,
      operadorId: "usr-admin",
      clienteNome: "Marcos Paulo",
      criadoEm: new Date(Date.now() - 2 * 3600 * 1000),
    }),
  ];

  public async salvar(venda: VendaBalcao): Promise<VendaBalcao> {
    this.vendas.unshift(venda);
    return venda;
  }

  public async listarHoje(): Promise<VendaBalcao[]> {
    return [...this.vendas];
  }
}
