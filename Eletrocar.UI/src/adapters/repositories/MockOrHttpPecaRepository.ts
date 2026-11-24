/**
 * Repositório de Peças (Adapter)
 * Com sessão autenticada na API: catálogo, cadastro e entrada de estoque vêm/vão para o PostgreSQL
 * (GET /pecas, POST /pecas, POST /pecas/{id}/entrada). Sem API: catálogo demonstrativo em memória.
 *
 * Baixas (delta negativo) vêm do PDV depois que a venda foi gravada: na API o servidor já baixou o
 * estoque na mesma transação da venda, então aqui só descartamos o cache para reler o saldo real.
 */
import {
  IPecaRepository,
  NovaPecaDados,
} from "../../application/ports/repositories/IPecaRepository";
import type { MovimentacaoEstoque } from "../../application/ports/repositories/IHistoricoEstoqueRepository";
import { Peca } from "../../domain/entities/Peca";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { requisitarApi, type SessaoApi } from "./apiHttp";

export type { SessaoApi } from "./apiHttp";

interface ApiPeca {
  id: string;
  codigo_barras: string;
  sku: string;
  descricao: string;
  preco_custo: string;
  preco_venda: string;
  estoque_atual: number;
  estoque_minimo: number;
  localizacao: string | null;
  fabricante: string | null;
  aplicacao_veicular: string | null;
}

function pecaDaApi(dto: ApiPeca): Peca {
  return new Peca({
    id: dto.id,
    codigoBarras: dto.codigo_barras,
    sku: dto.sku,
    descricao: dto.descricao,
    precoVenda: Number(dto.preco_venda),
    precoCusto: Number(dto.preco_custo),
    estoqueAtual: dto.estoque_atual,
    estoqueMinimo: dto.estoque_minimo,
    localizacao: dto.localizacao ?? undefined,
    aplicacaoVeicular: dto.aplicacao_veicular ?? undefined,
    marcaFabricante: dto.fabricante ?? undefined,
  });
}

function filtrarPorTermo(pecas: Peca[], termo?: string): Peca[] {
  if (!termo || !termo.trim()) return [...pecas];
  const t = termo.toLowerCase().trim();
  return pecas.filter(
    (p) =>
      p.descricao.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      p.codigoBarras.valor.includes(t) ||
      p.aplicacaoVeicular.toLowerCase().includes(t) ||
      p.marcaFabricante.toLowerCase().includes(t)
  );
}

function validarNovaPeca(dados: NovaPecaDados) {
  const sku = dados.sku.trim().toUpperCase();
  const codigoBarras = dados.codigoBarras.trim();
  const descricao = dados.descricao.trim();

  if (!sku) throw new Error("Informe o SKU da peça.");
  if (!descricao) throw new Error("Informe a descrição da peça.");
  if (!Number.isFinite(dados.precoVenda) || dados.precoVenda <= 0) {
    throw new Error("Preço de venda deve ser maior que zero.");
  }
  if (!Number.isFinite(dados.precoCusto) || dados.precoCusto < 0) {
    throw new Error("Preço de custo não pode ser negativo.");
  }
  if (!Number.isInteger(dados.estoqueAtual) || dados.estoqueAtual < 0) {
    throw new Error("Estoque inicial deve ser um número inteiro maior ou igual a zero.");
  }
  if (!Number.isInteger(dados.estoqueMinimo) || dados.estoqueMinimo < 0) {
    throw new Error("Estoque mínimo deve ser um número inteiro maior ou igual a zero.");
  }
  return { sku, codigoBarras, descricao };
}

export class MockOrHttpPecaRepository implements IPecaRepository {
  /** Catálogo carregado da API (null = ainda não carregado nesta sessão). */
  private cacheApi: Peca[] | null = null;

  constructor(
    private readonly sessao?: SessaoApi,
    private readonly apiBase = "/api/v1"
  ) {}

  private modoApi(): boolean {
    return this.sessao?.isModoApi() ?? false;
  }

  private requisitar<T>(caminho: string, acao: string, init: RequestInit = {}): Promise<T> {
    return requisitarApi<T>(this.sessao, `${this.apiBase}${caminho}`, acao, init);
  }

  private async catalogoApi(recarregar = false): Promise<Peca[]> {
    if (recarregar || this.cacheApi === null) {
      const dtos = await this.requisitar<ApiPeca[]>("/pecas", "carregar o catálogo de peças");
      this.cacheApi = dtos.map(pecaDaApi);
    }
    return this.cacheApi;
  }

  private substituirNoCache(peca: Peca): void {
    if (!this.cacheApi) return;
    const idx = this.cacheApi.findIndex((p) => p.id === peca.id);
    if (idx >= 0) this.cacheApi[idx] = peca;
    else this.cacheApi.push(peca);
  }

  /** Histórico local das movimentações feitas nesta sessão (usado quando não há API). */
  private readonly movimentacoes: MovimentacaoEstoque[] = [];

  public listarMovimentacoesLocais(): MovimentacaoEstoque[] {
    return [...this.movimentacoes];
  }

  private registrarMovimentacao(
    peca: Peca,
    tipo: MovimentacaoEstoque["tipo"],
    origem: MovimentacaoEstoque["origem"],
    quantidade: number,
    observacao: string | null = null
  ): void {
    this.movimentacoes.push({
      data: new Date(),
      tipo,
      origem,
      quantidade,
      pecaId: peca.id,
      sku: peca.sku,
      descricao: peca.descricao,
      documento: null,
      valorUnitario: tipo === "SAIDA" ? peca.precoVenda : peca.precoCusto,
      usuario: null,
      observacao,
    });
  }

  private pecas: Peca[] = [
    new Peca({
      id: "peca-001",
      codigoBarras: "7891049281023",
      sku: "ALT-BOSCH-12V",
      descricao: "Regulador de Voltagem Bosch 12V",
      precoVenda: new Dinheiro(185.0),
      precoCusto: new Dinheiro(110.0),
      estoqueAtual: 14,
      estoqueMinimo: 4,
      localizacao: "Gaveteiro E-02",
      aplicacaoVeicular: "Gol, Fox, Polo, Voyage 1.0/1.6",
      marcaFabricante: "Bosch",
    }),
    new Peca({
      id: "peca-002",
      codigoBarras: "7892019384751",
      sku: "ALT-VAL-90A",
      descricao: "Alternador Valeo 90A Completo",
      precoVenda: new Dinheiro(680.0),
      precoCusto: new Dinheiro(460.0),
      estoqueAtual: 3,
      estoqueMinimo: 2,
      localizacao: "Prateleira A-01",
      aplicacaoVeicular: "Palio, Siena, Strada Fire 1.4",
      marcaFabricante: "Valeo",
    }),
    new Peca({
      id: "peca-003",
      codigoBarras: "7898237461928",
      sku: "BAT-MOU-60A",
      descricao: "Bateria Moura 60Ah M60GD Selada",
      precoVenda: new Dinheiro(490.0),
      precoCusto: new Dinheiro(340.0),
      estoqueAtual: 18,
      estoqueMinimo: 6,
      localizacao: "Piso Baterias 01",
      aplicacaoVeicular: "Universal (Linha Leve)",
      marcaFabricante: "Moura",
    }),
    new Peca({
      id: "peca-004",
      codigoBarras: "7893847562019",
      sku: "MOT-MM-12V",
      descricao: "Motor de Partida Magneti Marelli 1.0/1.4",
      precoVenda: new Dinheiro(540.0),
      precoCusto: new Dinheiro(370.0),
      estoqueAtual: 2,
      estoqueMinimo: 3,
      localizacao: "Prateleira A-03",
      aplicacaoVeicular: "Corsa, Celta, Prisma 1.0/1.4",
      marcaFabricante: "Magneti Marelli",
    }),
    new Peca({
      id: "peca-005",
      codigoBarras: "7894758392014",
      sku: "LMP-OSR-H7",
      descricao: "Lâmpada Farol H7 12V 55W Osram Standard",
      precoVenda: new Dinheiro(38.0),
      precoCusto: new Dinheiro(18.0),
      estoqueAtual: 42,
      estoqueMinimo: 10,
      localizacao: "Vitrine Balcão 01",
      aplicacaoVeicular: "Universal Farol Baixo/Alto",
      marcaFabricante: "Osram",
    }),
    new Peca({
      id: "peca-006",
      codigoBarras: "7895847362910",
      sku: "REL-DNI-0102",
      descricao: "Relé Auxiliar 4 Pinos 12V 40A DNI",
      precoVenda: new Dinheiro(22.0),
      precoCusto: new Dinheiro(9.5),
      estoqueAtual: 60,
      estoqueMinimo: 15,
      localizacao: "Gaveteiro R-05",
      aplicacaoVeicular: "Universal Elétrica",
      marcaFabricante: "DNI",
    }),
    new Peca({
      id: "peca-007",
      codigoBarras: "7896958473821",
      sku: "BOB-BOSCH-04",
      descricao: "Bobina de Ignição Bosch 4 Pinos",
      precoVenda: new Dinheiro(245.0),
      precoCusto: new Dinheiro(155.0),
      estoqueAtual: 5,
      estoqueMinimo: 3,
      localizacao: "Gaveteiro B-01",
      aplicacaoVeicular: "Gol G5/G6, Fox, Saveiro 1.6",
      marcaFabricante: "Bosch",
    }),
  ];

  public async listar(termo?: string): Promise<Peca[]> {
    if (this.modoApi()) {
      return filtrarPorTermo(await this.catalogoApi(true), termo);
    }
    return filtrarPorTermo(this.pecas, termo);
  }

  public async buscarPorId(id: string): Promise<Peca | null> {
    const lista = this.modoApi() ? await this.catalogoApi() : this.pecas;
    return lista.find((p) => p.id === id) || null;
  }

  public async buscarPorCodigoOuBarcode(codigo: string): Promise<Peca | null> {
    const limpo = codigo.trim().toLowerCase();
    const lista = this.modoApi() ? await this.catalogoApi() : this.pecas;
    const peca = lista.find(
      (p) =>
        p.codigoBarras.valor.toLowerCase() === limpo ||
        p.sku.toLowerCase() === limpo ||
        p.id.toLowerCase() === limpo
    );
    return peca || null;
  }

  public async atualizarEstoque(id: string, quantidadeDelta: number): Promise<void> {
    if (this.modoApi() && quantidadeDelta < 0) {
      this.cacheApi = null;
      return;
    }
    const peca = await this.buscarPorId(id);
    if (!peca) throw new Error("Peça não encontrada para atualização de saldo.");

    if (this.modoApi() && quantidadeDelta > 0) {
      const dto = await this.requisitar<ApiPeca>(`/pecas/${id}/entrada`, "registrar entrada de estoque", {
        method: "POST",
        body: JSON.stringify({ quantidade: quantidadeDelta }),
      });
      this.substituirNoCache(pecaDaApi(dto));
      return;
    }

    if (quantidadeDelta < 0) {
      peca.baixarEstoque(Math.abs(quantidadeDelta));
      this.registrarMovimentacao(peca, "SAIDA", "VENDA", Math.abs(quantidadeDelta));
    } else {
      peca.reporEstoque(quantidadeDelta);
      this.registrarMovimentacao(peca, "ENTRADA", "ENTRADA_FORNECEDOR", quantidadeDelta);
    }
  }

  public async cadastrar(dados: NovaPecaDados): Promise<Peca> {
    const { sku, codigoBarras, descricao } = validarNovaPeca(dados);

    if (this.modoApi()) {
      const dto = await this.requisitar<ApiPeca>("/pecas", "cadastrar peças", {
        method: "POST",
        body: JSON.stringify({
          codigo_barras: codigoBarras,
          sku,
          descricao,
          preco_custo: dados.precoCusto.toFixed(2),
          preco_venda: dados.precoVenda.toFixed(2),
          estoque_atual: dados.estoqueAtual,
          estoque_minimo: dados.estoqueMinimo,
          fabricante: dados.marcaFabricante?.trim() || null,
          aplicacao_veicular: dados.aplicacaoVeicular?.trim() || null,
          localizacao: dados.localizacao?.trim() || null,
        }),
      });
      const peca = pecaDaApi(dto);
      this.substituirNoCache(peca);
      return peca;
    }

    if (this.pecas.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
      throw new Error(`Já existe uma peça com o SKU ${sku}. Use "Entrada de estoque" para aumentar o saldo.`);
    }
    if (this.pecas.some((p) => p.codigoBarras.igual(codigoBarras))) {
      throw new Error(
        `Já existe uma peça com o código de barras ${codigoBarras}. Use "Entrada de estoque" para aumentar o saldo.`
      );
    }

    const peca = new Peca({
      id: `peca-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      codigoBarras,
      sku,
      descricao,
      precoVenda: new Dinheiro(dados.precoVenda),
      precoCusto: new Dinheiro(dados.precoCusto),
      estoqueAtual: dados.estoqueAtual,
      estoqueMinimo: dados.estoqueMinimo,
      localizacao: dados.localizacao?.trim() || undefined,
      aplicacaoVeicular: dados.aplicacaoVeicular?.trim() || undefined,
      marcaFabricante: dados.marcaFabricante?.trim() || undefined,
    });
    this.pecas.push(peca);
    if (peca.estoqueAtual > 0) {
      this.registrarMovimentacao(peca, "ENTRADA", "CADASTRO", peca.estoqueAtual, "Saldo inicial do cadastro");
    }
    return peca;
  }
}
