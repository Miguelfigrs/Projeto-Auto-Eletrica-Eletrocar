import { VendaBalcao } from "../../../domain/entities/VendaBalcao";

export interface IVendaRepository {
  salvar(venda: VendaBalcao): Promise<VendaBalcao>;
  listarHoje(): Promise<VendaBalcao[]>;
}
