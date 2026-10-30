import { Peca } from "../../../domain/entities/Peca";

export interface IPecaRepository {
  listar(termo?: string): Promise<Peca[]>;
  buscarPorId(id: string): Promise<Peca | null>;
  buscarPorCodigoOuBarcode(codigo: string): Promise<Peca | null>;
  atualizarEstoque(id: string, quantidadeDelta: number): Promise<void>;
}
