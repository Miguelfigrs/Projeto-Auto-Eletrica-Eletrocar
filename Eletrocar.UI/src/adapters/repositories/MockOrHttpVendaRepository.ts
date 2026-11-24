/**
 * Repositório de Vendas de Balcão (Adapter)
 * Com sessão na API: POST /vendas grava a venda no PostgreSQL. O servidor valida o saldo, baixa o estoque,
 * registra o pagamento no caixa aberto (ou gera o título a receber) e devolve o número oficial (VB-AAAA-NNNN).
 * Sem API: vendas de demonstração em memória.
 */
import { IVendaRepository } from "../../application/ports/repositories/IVendaRepository";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { FormaPagamento, StatusVenda } from "../../domain/value-objects/Enums";
import { requisitarApi, type SessaoApi } from "./apiHttp";
import { lerDataApi } from "./MockOrHttpDRERepository";

interface ApiVenda {
  id: string;
  numero_venda: string;
  operador_id: string;
  itens: Array<{
    id: string;
    peca_id: string;
    descricao_peca: string;
    quantidade: number;
    preco_unitario: string;
  }>;
  desconto: string;
  forma_pagamento: FormaPagamento;
  status: StatusVenda;
  data_hora: string;
}

function vendaDaApi(dto: ApiVenda, skus: Map<string, string> = new Map()): VendaBalcao {
  return new VendaBalcao({
    id: dto.id,
    numeroVenda: dto.numero_venda,
    itens: dto.itens.map((i) => ({
      id: i.id,
      pecaId: i.peca_id,
      sku: skus.get(i.peca_id) ?? "",
      descricao: i.descricao_peca,
      quantidade: i.quantidade,
      precoUnitario: new Dinheiro(Number(i.preco_unitario)),
    })),
    desconto: Number(dto.desconto),
    formaPagamento: dto.forma_pagamento,
    status: dto.status,
    operadorId: dto.operador_id,
    criadoEm: lerDataApi(dto.data_hora),
  });
}

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export class MockOrHttpVendaRepository implements IVendaRepository {
  constructor(
    private readonly sessao?: SessaoApi,
    private readonly apiBase = "/api/v1"
  ) {}

  private modoApi(): boolean {
    return this.sessao?.isModoApi() ?? false;
  }

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
    if (this.modoApi()) {
      const dto = await requisitarApi<ApiVenda>(this.sessao, `${this.apiBase}/vendas`, "registrar vendas", {
        method: "POST",
        body: JSON.stringify({
          itens: venda.itens.map((i) => ({ peca_id: i.pecaId, quantidade: i.quantidade })),
          forma_pagamento: venda.formaPagamento,
          desconto: venda.desconto.valor.toFixed(2),
        }),
      });
      return vendaDaApi(dto, new Map(venda.itens.map((i) => [i.pecaId, i.sku])));
    }
    this.vendas.unshift(venda);
    return venda;
  }

  public async listarHoje(): Promise<VendaBalcao[]> {
    if (this.modoApi()) {
      const dtos = await requisitarApi<ApiVenda[]>(
        this.sessao,
        `${this.apiBase}/vendas?limite=500`,
        "consultar as vendas"
      );
      const hoje = new Date();
      return dtos.map((d) => vendaDaApi(d)).filter((v) => mesmoDia(v.criadoEm, hoje));
    }
    return [...this.vendas];
  }
}
