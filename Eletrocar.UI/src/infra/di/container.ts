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
import { MockOrHttpDRERepository } from "../../adapters/repositories/MockOrHttpDRERepository";
import type { IPerfilRepository } from "../../application/ports/repositories/IPerfilRepository";
import { MockOrHttpHistoricoEstoqueRepository } from "../../adapters/repositories/MockOrHttpHistoricoEstoqueRepository";

import { AdicionarItemVendaUseCase } from "../../application/use-cases/balcao/AdicionarItemVendaUseCase";
import { FinalizarVendaUseCase } from "../../application/use-cases/balcao/FinalizarVendaUseCase";
import { AvancarStatusOSUseCase } from "../../application/use-cases/os/AvancarStatusOSUseCase";
import { CriarOSUseCase } from "../../application/use-cases/os/CriarOSUseCase";
import { OperarCaixaUseCase } from "../../application/use-cases/caixa/OperarCaixaUseCase";
import {
  AutenticarUsuarioUseCase,
  TrocarOperadorPorPinUseCase,
} from "../../application/use-cases/auth/AutenticarUsuarioUseCase";
import { GerenciarUsuariosUseCase } from "../../application/use-cases/usuarios/GerenciarUsuariosUseCase";

class DIContainer {
  // Gateways
  public readonly soundGateway = new WebAudioSoundGateway();
  public readonly barcodeGateway = new KeyboardWedgeGateway();

  // Repositories
  public readonly authRepository = new MockOrHttpAuthRepository();
  public readonly perfilRepository: IPerfilRepository = this.authRepository;
  public readonly pecaRepository = new MockOrHttpPecaRepository(this.authRepository);
  public readonly vendaRepository = new MockOrHttpVendaRepository(this.authRepository);
  public readonly caixaRepository = new MockOrHttpCaixaRepository(this.authRepository);
  public readonly osRepository = new MockOrHttpOSRepository(this.authRepository);
  public readonly dreRepository = new MockOrHttpDRERepository(this.authRepository);
  public readonly historicoEstoqueRepository = new MockOrHttpHistoricoEstoqueRepository(
    this.authRepository,
    this.pecaRepository
  );

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

  public readonly gerenciarUsuariosUC = new GerenciarUsuariosUseCase(
    this.authRepository,
    this.soundGateway
  );
}

export const container = new DIContainer();
