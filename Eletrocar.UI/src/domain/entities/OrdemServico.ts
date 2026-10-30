/**
 * Entidade: OrdemServico (Aggregate Root) e Máquina de Estados
 * Controla todo o ciclo de vida da OS, alocação de peças e serviços elétricos.
 * Espelha fielmente src/domain/entities/ordem_servico.py.
 */
import { StatusOS, OrigemOS, PrioridadeOS, FormaPagamento } from "../value-objects/Enums";
import { Dinheiro } from "../value-objects/Dinheiro";
import { TransicaoStatusInvalidaError } from "../exceptions/DomainExceptions";

export interface ItemOS {
  id: string;
  pecaId: string;
  descricao: string;
  quantidade: number;
  precoUnitario: Dinheiro;
  custoUnitario?: Dinheiro;
}

export interface ServicoOS {
  id: string;
  descricao: string;
  valor: Dinheiro;
  eletricistaNome?: string;
}

export interface OrdemServicoProps {
  id: string;
  numeroOS: string;
  clienteId: string;
  clienteNome: string;
  carroModelo: string;
  carroPlaca?: string;
  usuarioId: string;
  status?: StatusOS;
  origem?: OrigemOS;
  prioridade?: PrioridadeOS;
  sintomas: string;
  hipoteseDiagnostica?: string;
  checklistEletrico?: Record<string, boolean>;
  itens?: ItemOS[];
  servicos?: ServicoOS[];
  desconto?: number | Dinheiro;
  formaPagamento?: FormaPagamento;
  observacoes?: string;
  criadoEm?: Date | string;
  atualizadoEm?: Date | string;
}

export class OrdemServicoStateMachine {
  public static readonly TRANSICOES_PERMITIDAS: Record<StatusOS, StatusOS[]> = {
    [StatusOS.TRIAGEM]: [StatusOS.ORCAMENTO_PENDENTE, StatusOS.CANCELADO],
    [StatusOS.ORCAMENTO_PENDENTE]: [StatusOS.APROVADO, StatusOS.CANCELADO],
    [StatusOS.APROVADO]: [StatusOS.EM_EXECUCAO, StatusOS.CANCELADO],
    [StatusOS.EM_EXECUCAO]: [
      StatusOS.AGUARDANDO_PECA,
      StatusOS.TESTES_ELETRICOS,
      StatusOS.CANCELADO,
    ],
    [StatusOS.AGUARDANDO_PECA]: [StatusOS.EM_EXECUCAO, StatusOS.CANCELADO],
    [StatusOS.TESTES_ELETRICOS]: [
      StatusOS.FINALIZADO,
      StatusOS.EM_EXECUCAO, // Falha nos testes elétricos, volta para reparo
      StatusOS.CANCELADO,
    ],
    [StatusOS.FINALIZADO]: [StatusOS.ENTREGUE],
    [StatusOS.ENTREGUE]: [], // Estado terminal
    [StatusOS.CANCELADO]: [], // Estado terminal
  };

  public static validarTransicao(statusAtual: StatusOS, statusDestino: StatusOS): boolean {
    if (statusAtual === statusDestino) return true;
    const destinos = this.TRANSICOES_PERMITIDAS[statusAtual] || [];
    return destinos.includes(statusDestino);
  }
}

export class OrdemServico {
  public readonly id: string;
  public readonly numeroOS: string;
  public readonly clienteId: string;
  public readonly clienteNome: string;
  public readonly carroModelo: string;
  public readonly carroPlaca: string;
  public readonly usuarioId: string;
  public status: StatusOS;
  public readonly origem: OrigemOS;
  public prioridade: PrioridadeOS;
  public sintomas: string;
  public hipoteseDiagnostica?: string;
  public checklistEletrico: Record<string, boolean>;
  public itens: ItemOS[];
  public servicos: ServicoOS[];
  public desconto: Dinheiro;
  public formaPagamento?: FormaPagamento;
  public observacoes?: string;
  public readonly criadoEm: Date;
  public atualizadoEm: Date;

  constructor(props: OrdemServicoProps) {
    this.id = props.id;
    this.numeroOS = props.numeroOS;
    this.clienteId = props.clienteId;
    this.clienteNome = props.clienteNome;
    this.carroModelo = props.carroModelo;
    this.carroPlaca = props.carroPlaca || "Placa não informada";
    this.usuarioId = props.usuarioId;
    this.status = props.status || StatusOS.TRIAGEM;
    this.origem = props.origem || OrigemOS.BALCAO;
    this.prioridade = props.prioridade || PrioridadeOS.MEDIA;
    this.sintomas = props.sintomas;
    this.hipoteseDiagnostica = props.hipoteseDiagnostica;
    this.checklistEletrico = props.checklistEletrico || {
      bateria: false,
      alternador: false,
      motorPartida: false,
      iluminacao: false,
      injecaoEletronica: false,
    };
    this.itens = props.itens || [];
    this.servicos = props.servicos || [];
    this.desconto =
      props.desconto instanceof Dinheiro
        ? props.desconto
        : new Dinheiro(props.desconto || 0, false);
    this.formaPagamento = props.formaPagamento;
    this.observacoes = props.observacoes;
    this.criadoEm = props.criadoEm ? new Date(props.criadoEm) : new Date();
    this.atualizadoEm = props.atualizadoEm ? new Date(props.atualizadoEm) : new Date();
  }

  public transicionar(novoStatus: StatusOS): void {
    if (!OrdemServicoStateMachine.validarTransicao(this.status, novoStatus)) {
      throw new TransicaoStatusInvalidaError(this.status, novoStatus);
    }
    this.status = novoStatus;
    this.atualizadoEm = new Date();
  }

  public adicionarItem(item: ItemOS): void {
    this.itens.push(item);
    this.atualizadoEm = new Date();
  }

  public removerItem(itemId: string): void {
    this.itens = this.itens.filter((i) => i.id !== itemId);
    this.atualizadoEm = new Date();
  }

  public adicionarServico(servico: ServicoOS): void {
    this.servicos.push(servico);
    this.atualizadoEm = new Date();
  }

  public removerServico(servicoId: string): void {
    this.servicos = this.servicos.filter((s) => s.id !== servicoId);
    this.atualizadoEm = new Date();
  }

  public get subtotalPecas(): Dinheiro {
    return this.itens.reduce(
      (acc, item) => acc.somar(item.precoUnitario.multiplicar(item.quantidade)),
      Dinheiro.zero()
    );
  }

  public get subtotalServicos(): Dinheiro {
    return this.servicos.reduce((acc, servico) => acc.somar(servico.valor), Dinheiro.zero());
  }

  public get total(): Dinheiro {
    const totalBruto = this.subtotalPecas.somar(this.subtotalServicos);
    if (this.desconto.maiorQue(totalBruto)) {
      return Dinheiro.zero();
    }
    return totalBruto.subtrair(this.desconto);
  }
}
