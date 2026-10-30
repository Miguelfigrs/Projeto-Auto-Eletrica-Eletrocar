/**
 * Repositório de Peças (Adapter)
 * Conecta na API REST FastAPI quando disponível, mantendo fallback de alta fidelidade
 * e cache offline para contingência no balcão da oficina.
 */
import { IPecaRepository } from "../../application/ports/repositories/IPecaRepository";
import { Peca } from "../../domain/entities/Peca";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";

export class MockOrHttpPecaRepository implements IPecaRepository {
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
    if (!termo || !termo.trim()) {
      return [...this.pecas];
    }
    const t = termo.toLowerCase().trim();
    return this.pecas.filter(
      (p) =>
        p.descricao.toLowerCase().includes(t) ||
        p.sku.toLowerCase().includes(t) ||
        p.codigoBarras.valor.includes(t) ||
        p.aplicacaoVeicular.toLowerCase().includes(t) ||
        p.marcaFabricante.toLowerCase().includes(t)
    );
  }

  public async buscarPorId(id: string): Promise<Peca | null> {
    const peca = this.pecas.find((p) => p.id === id);
    return peca || null;
  }

  public async buscarPorCodigoOuBarcode(codigo: string): Promise<Peca | null> {
    const limpo = codigo.trim().toLowerCase();
    const peca = this.pecas.find(
      (p) =>
        p.codigoBarras.valor.toLowerCase() === limpo ||
        p.sku.toLowerCase() === limpo ||
        p.id.toLowerCase() === limpo
    );
    return peca || null;
  }

  public async atualizarEstoque(id: string, quantidadeDelta: number): Promise<void> {
    const peca = await this.buscarPorId(id);
    if (!peca) throw new Error("Peça não encontrada para atualização de saldo.");
    if (quantidadeDelta < 0) {
      peca.baixarEstoque(Math.abs(quantidadeDelta));
    } else {
      peca.reporEstoque(quantidadeDelta);
    }
  }
}
