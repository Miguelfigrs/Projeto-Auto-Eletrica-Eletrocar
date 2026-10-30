import { IOSRepository } from "../../ports/repositories/IOSRepository";
import { ISoundEffectGateway } from "../../ports/gateways/ISoundEffectGateway";
import { OrdemServico, OrdemServicoProps } from "../../../domain/entities/OrdemServico";
import { OrigemOS, StatusOS } from "../../../domain/value-objects/Enums";

export class CriarOSUseCase {
  constructor(
    private readonly osRepo: IOSRepository,
    private readonly soundGateway: ISoundEffectGateway
  ) {}

  public async executar(props: Partial<OrdemServicoProps>): Promise<OrdemServico> {
    const novaOS = new OrdemServico({
      id: crypto.randomUUID(),
      numeroOS: `OS-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      clienteId: props.clienteId || crypto.randomUUID(),
      clienteNome: props.clienteNome || "Cliente Oficina",
      carroModelo: props.carroModelo || "Veículo Não Identificado",
      carroPlaca: props.carroPlaca || "ABC-1234",
      usuarioId: props.usuarioId || "eletricista-id",
      status: props.status || StatusOS.TRIAGEM,
      origem: props.origem || OrigemOS.BALCAO,
      prioridade: props.prioridade,
      sintomas: props.sintomas || "Verificação elétrica geral",
      hipoteseDiagnostica: props.hipoteseDiagnostica,
      checklistEletrico: props.checklistEletrico,
      itens: props.itens,
      servicos: props.servicos,
      desconto: props.desconto,
    });

    const osSalva = await this.osRepo.salvar(novaOS);
    this.soundGateway.tocarBipSucesso();
    return osSalva;
  }
}
