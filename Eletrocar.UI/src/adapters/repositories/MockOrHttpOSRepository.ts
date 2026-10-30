/**
 * Repositório de Ordens de Serviço (Adapter)
 * Gerencia a fila de oficina e Kanban com integração ao ciclo de vida e Telegram Voice.
 */
import { IOSRepository } from "../../application/ports/repositories/IOSRepository";
import { OrdemServico } from "../../domain/entities/OrdemServico";
import { StatusOS, OrigemOS, PrioridadeOS } from "../../domain/value-objects/Enums";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";

export class MockOrHttpOSRepository implements IOSRepository {
  private ordens: OrdemServico[] = [
    new OrdemServico({
      id: "os-001",
      numeroOS: "OS-2026-0042",
      clienteId: "cli-01",
      clienteNome: "Carlos Alberto da Silva",
      carroModelo: "Gol 1.6 MSI 2019",
      carroPlaca: "FXT-4E12",
      usuarioId: "eletricista-marcio",
      status: StatusOS.EM_EXECUCAO,
      origem: OrigemOS.TELEGRAM_VOICE,
      prioridade: PrioridadeOS.ALTA,
      sintomas: "Luz de bateria acesa no painel; veículo apagou em movimento e não dá partida.",
      hipoteseDiagnostica: "Defeito no regulador de voltagem ou ponte retificadora do alternador.",
      checklistEletrico: {
        bateria: false,
        alternador: true,
        motorPartida: false,
        iluminacao: false,
        injecaoEletronica: false,
      },
      itens: [
        {
          id: "item-os-1",
          pecaId: "peca-001",
          descricao: "Regulador de Voltagem Bosch 12V",
          quantidade: 1,
          precoUnitario: new Dinheiro(185.0),
        },
      ],
      servicos: [
        {
          id: "serv-os-1",
          descricao: "Revisão e bancada de teste do alternador",
          valor: new Dinheiro(140.0),
          eletricistaNome: "Márcio Silva",
        },
      ],
      desconto: new Dinheiro(0),
    }),
    new OrdemServico({
      id: "os-002",
      numeroOS: "OS-2026-0043",
      clienteId: "cli-02",
      clienteNome: "Julio Mendes Frota",
      carroModelo: "Fiat Strada 1.4 Fire 2021",
      carroPlaca: "RLD-8A99",
      usuarioId: "eletricista-roberto",
      status: StatusOS.TRIAGEM,
      origem: OrigemOS.TELEGRAM_VOICE,
      prioridade: PrioridadeOS.MEDIA,
      sintomas: "Motor de partida estalando pesado ao girar a chave pela manhã.",
      checklistEletrico: {
        bateria: true,
        alternador: false,
        motorPartida: true,
        iluminacao: false,
        injecaoEletronica: false,
      },
      itens: [],
      servicos: [
        {
          id: "serv-os-2",
          descricao: "Diagnóstico elétrico com scanner e teste de queda de tensão",
          valor: new Dinheiro(80.0),
        },
      ],
    }),
    new OrdemServico({
      id: "os-003",
      numeroOS: "OS-2026-0044",
      clienteId: "cli-03",
      clienteNome: "Transportadora Rápido Vale",
      carroModelo: "Toyota Hilux 2.8 D-4D 2022",
      carroPlaca: "BRA-2E19",
      usuarioId: "eletricista-marcio",
      status: StatusOS.TESTES_ELETRICOS,
      origem: OrigemOS.BALCAO,
      prioridade: PrioridadeOS.ALTA,
      sintomas: "Instalação de chicote para faróis auxiliares de LED e revisão da linha 30.",
      checklistEletrico: {
        bateria: false,
        alternador: false,
        motorPartida: false,
        iluminacao: true,
        injecaoEletronica: false,
      },
      itens: [
        {
          id: "item-os-3",
          pecaId: "peca-006",
          descricao: "Relé Auxiliar 4 Pinos 12V 40A DNI",
          quantidade: 2,
          precoUnitario: new Dinheiro(22.0),
        },
      ],
      servicos: [
        {
          id: "serv-os-3",
          descricao: "Confecção de chicote padrão montadora e fiação antichama",
          valor: new Dinheiro(220.0),
          eletricistaNome: "Márcio Silva",
        },
      ],
    }),
  ];

  public async listar(status?: StatusOS): Promise<OrdemServico[]> {
    if (status) {
      return this.ordens.filter((os) => os.status === status);
    }
    return [...this.ordens];
  }

  public async buscarPorId(id: string): Promise<OrdemServico | null> {
    const os = this.ordens.find((o) => o.id === id);
    return os || null;
  }

  public async salvar(os: OrdemServico): Promise<OrdemServico> {
    const idx = this.ordens.findIndex((o) => o.id === os.id);
    if (idx >= 0) {
      this.ordens[idx] = os;
    } else {
      this.ordens.unshift(os);
    }
    return os;
  }

  public async atualizarStatus(id: string, novoStatus: StatusOS): Promise<void> {
    const os = await this.buscarPorId(id);
    if (os) {
      os.status = novoStatus;
      os.atualizadoEm = new Date();
    }
  }
}
