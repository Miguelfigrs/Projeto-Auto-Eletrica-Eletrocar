import { Caixa, MovimentacaoCaixa } from "../../../domain/entities/Caixa";
import { Dinheiro } from "../../../domain/value-objects/Dinheiro";
import { FormaPagamento } from "../../../domain/value-objects/Enums";

/** Valores contados pelo operador no fechamento cego, por forma de pagamento. */
export type ValoresContados = Partial<Record<FormaPagamento, Dinheiro>>;

export interface ICaixaRepository {
  obterCaixaAberto(): Promise<Caixa | null>;
  abrir(operadorId: string, operadorNome: string, saldoInicial: Dinheiro): Promise<Caixa>;
  fechar(caixaId: string, valoresContados?: ValoresContados): Promise<void>;
  adicionarMovimentacao(caixaId: string, mov: MovimentacaoCaixa): Promise<void>;
}
