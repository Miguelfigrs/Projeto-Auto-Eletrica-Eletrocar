import { IOSRepository } from "../../ports/repositories/IOSRepository";
import { ISoundEffectGateway } from "../../ports/gateways/ISoundEffectGateway";
import { StatusOS } from "../../../domain/value-objects/Enums";
import { OrdemServico } from "../../../domain/entities/OrdemServico";

export class AvancarStatusOSUseCase {
  constructor(
    private readonly osRepo: IOSRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async executar(osId: string, novoStatus: StatusOS): Promise<OrdemServico> {
    const os = await this.osRepo.buscarPorId(osId);
    if (!os) {
      this.soundGateway.tocarAlertaErro();
      throw new Error(`Ordem de Serviço com ID ${osId} não encontrada.`);
    }

    os.transicionar(novoStatus);
    await this.osRepo.atualizarStatus(os.id, novoStatus);
    this.soundGateway.tocarBipSucesso();
    return os;
  }
}
