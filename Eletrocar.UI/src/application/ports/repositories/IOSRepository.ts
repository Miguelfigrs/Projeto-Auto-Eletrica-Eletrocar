import { OrdemServico } from "../../../domain/entities/OrdemServico";
import { Dinheiro } from "../../../domain/value-objects/Dinheiro";
import { FormaPagamento, StatusOS } from "../../../domain/value-objects/Enums";

export interface IOSRepository {
  listar(status?: StatusOS): Promise<OrdemServico[]>;
  buscarPorId(id: string): Promise<OrdemServico | null>;
  /** Abre uma nova OS. */
  salvar(os: OrdemServico): Promise<OrdemServico>;
  atualizarStatus(id: string, novoStatus: StatusOS): Promise<void>;
  atualizarChecklist(id: string, checklist: Record<string, boolean>): Promise<OrdemServico>;
  adicionarServico(id: string, servico: { descricao: string; valor: Dinheiro }): Promise<OrdemServico>;
  /** Pagamento e entrega do veículo (FINALIZADO -> ENTREGUE). */
  faturar(id: string, formaPagamento: FormaPagamento): Promise<OrdemServico>;
}
