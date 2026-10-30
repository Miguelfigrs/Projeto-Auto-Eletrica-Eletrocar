/**
 * Injeção de Dependências e Composition Root (Clean Architecture)
 * Centraliza a instância dos Gateways, Repositórios e Casos de Uso.
 */
import { WebAudioSoundGateway } from "../../adapters/gateways/WebAudioSoundGateway";
import { KeyboardWedgeGateway } from "../../adapters/gateways/KeyboardWedgeGateway";
import { MockOrHttpPecaRepository } from "../../adapters/repositories/MockOrHttpPecaRepository";
import { MockOrHttpOSRepository } from "../../adapters/repositories/MockOrHttpOSRepository";
import { MockOrHttpCaixaRepository } from "../../adapters/repositories/MockOrHttpCaixaRepository";
import { MockOrHttpVendaRepository } from "../../adapters/repositories/MockOrHttpVendaRepository";
import { MockOrHttpAuthRepository } from "../../adapters/repositories/MockOrHttpAuthRepository";

import { AdicionarItemVendaUseCase } from "../../application/use-cases/balcao/AdicionarItemVendaUseCase";
import { FinalizarVendaUseCase } from "../../application/use-cases/balcao/FinalizarVendaUseCase";
import { AvancarStatusOSUseCase } from "../../application/use-cases/os/AvancarStatusOSUseCase";
import { CriarOSUseCase } from "../../application/use-cases/os/CriarOSUseCase";
import { OperarCaixaUseCase } from "../../application/use-cases/caixa/OperarCaixaUseCase";
import {
  AutenticarUsuarioUseCase,
  TrocarOperadorPorPinUseCase,
} from "../../application/use-cases/auth/AutenticarUsuarioUseCase";

class DIContainer {
  // Gateways
  public readonly soundGateway = new WebAudioSoundGateway();
  public readonly barcodeGateway = new KeyboardWedgeGateway();

  // Repositories
  public readonly pecaRepository = new MockOrHttpPecaRepository();
  public readonly osRepository = new MockOrHttpOSRepository();
  public readonly caixaRepository = new MockOrHttpCaixaRepository();
  public readonly vendaRepository = new MockOrHttpVendaRepository();
  public readonly authRepository = new MockOrHttpAuthRepository();

  // Use Cases
  public readonly adicionarItemVendaUC = new AdicionarItemVendaUseCase(
    this.pecaRepository,
    this.soundGateway
  );

  public readonly finalizarVendaUC = new FinalizarVendaUseCase(
    this.vendaRepository,
    this.pecaRepository,
    this.caixaRepository,
    this.soundGateway
  );

  public readonly avancarStatusOSUC = new AvancarStatusOSUseCase(
    this.osRepository,
    this.soundGateway
  );

  public readonly criarOSUC = new CriarOSUseCase(this.osRepository, this.soundGateway);

  public readonly operarCaixaUC = new OperarCaixaUseCase(
    this.caixaRepository,
    this.soundGateway
  );

  public readonly autenticarUC = new AutenticarUsuarioUseCase(
    this.authRepository,
    this.soundGateway
  );

  public readonly trocarOperadorPorPinUC = new TrocarOperadorPorPinUseCase(
    this.authRepository,
    this.soundGateway
  );
}

export const container = new DIContainer();
