import { OrdemServico } from "../../../domain/entities/OrdemServico";
import { StatusOS } from "../../../domain/value-objects/Enums";

export interface IOSRepository {
  listar(status?: StatusOS): Promise<OrdemServico[]>;
  buscarPorId(id: string): Promise<OrdemServico | null>;
  salvar(os: OrdemServico): Promise<OrdemServico>;
  atualizarStatus(id: string, novoStatus: StatusOS): Promise<void>;
}
