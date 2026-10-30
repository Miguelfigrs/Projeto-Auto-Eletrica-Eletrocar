import { Caixa, MovimentacaoCaixa } from "../../../domain/entities/Caixa";
import { Dinheiro } from "../../../domain/value-objects/Dinheiro";

export interface ICaixaRepository {
  obterCaixaAberto(): Promise<Caixa | null>;
  abrir(operadorId: string, operadorNome: string, saldoInicial: Dinheiro): Promise<Caixa>;
  fechar(caixaId: string): Promise<void>;
  adicionarMovimentacao(caixaId: string, mov: MovimentacaoCaixa): Promise<void>;
}
