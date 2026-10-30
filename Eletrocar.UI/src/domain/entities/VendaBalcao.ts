/**
 * Entidade: VendaBalcao (Aggregate Root)
 * Gerencia os itens vendidos no balcão rápido, descontos e totalizadores.
 * Espelha fielmente src/domain/entities/venda_balcao.py.
 */
import { Dinheiro } from "../value-objects/Dinheiro";
import { FormaPagamento, StatusVenda } from "../value-objects/Enums";
import { Peca } from "./Peca";

export interface ItemVenda {
  id: string;
  pecaId: string;
  sku: string;
  descricao: string;
  quantidade: number;
  precoUnitario: Dinheiro;
}

export interface VendaBalcaoProps {
  id?: string;
  numeroVenda?: string;
  itens?: ItemVenda[];
  desconto?: number | Dinheiro;
  formaPagamento?: FormaPagamento;
  status?: StatusVenda;
  operadorId?: string;
  clienteNome?: string;
  criadoEm?: Date | string;
}

export class VendaBalcao {
  public readonly id: string;
  public readonly numeroVenda: string;
  public itens: ItemVenda[];
  public desconto: Dinheiro;
  public formaPagamento: FormaPagamento;
  public status: StatusVenda;
  public operadorId: string;
  public clienteNome: string;
  public readonly criadoEm: Date;

  constructor(props: VendaBalcaoProps = {}) {
    this.id = props.id || crypto.randomUUID();
    this.numeroVenda = props.numeroVenda || `VND-${Date.now().toString().slice(-6)}`;
    this.itens = props.itens || [];
    this.desconto =
      props.desconto instanceof Dinheiro
        ? props.desconto
        : new Dinheiro(props.desconto || 0, false);
    this.formaPagamento = props.formaPagamento || FormaPagamento.DINHEIRO;
    this.status = props.status || StatusVenda.CONCLUIDA;
    this.operadorId = props.operadorId || "op-padrao";
    this.clienteNome = props.clienteNome || "Consumidor Final (Balcão)";
    this.criadoEm = props.criadoEm ? new Date(props.criadoEm) : new Date();
  }

  public adicionarItem(peca: Peca, quantidade = 1): void {
    if (quantidade <= 0) throw new Error("Quantidade deve ser maior que zero.");

    const itemExistente = this.itens.find((i) => i.pecaId === peca.id);
    if (itemExistente) {
      itemExistente.quantidade += quantidade;
    } else {
      this.itens.push({
        id: crypto.randomUUID(),
        pecaId: peca.id,
        sku: peca.sku,
        descricao: peca.descricao,
        quantidade,
        precoUnitario: peca.precoVenda,
      });
    }
  }

  public removerItem(itemId: string): void {
    this.itens = this.itens.filter((i) => i.id !== itemId);
  }

  public alterarQuantidade(itemId: string, novaQtd: number): void {
    if (novaQtd <= 0) {
      this.removerItem(itemId);
      return;
    }
    const item = this.itens.find((i) => i.id === itemId);
    if (item) {
      item.quantidade = novaQtd;
    }
  }

  public aplicarDesconto(desconto: Dinheiro): void {
    this.desconto = desconto;
  }

  public get subtotal(): Dinheiro {
    return this.itens.reduce(
      (acc, item) => acc.somar(item.precoUnitario.multiplicar(item.quantidade)),
      Dinheiro.zero()
    );
  }

  public get total(): Dinheiro {
    const sub = this.subtotal;
    if (this.desconto.maiorQue(sub)) {
      return Dinheiro.zero();
    }
    return sub.subtrair(this.desconto);
  }

  public clone(): VendaBalcao {
    return new VendaBalcao({
      id: this.id,
      numeroVenda: this.numeroVenda,
      itens: this.itens.map((i) => ({ ...i })),
      desconto: new Dinheiro(this.desconto),
      formaPagamento: this.formaPagamento,
      status: this.status,
      operadorId: this.operadorId,
      clienteNome: this.clienteNome,
      criadoEm: this.criadoEm,
    });
  }
}
