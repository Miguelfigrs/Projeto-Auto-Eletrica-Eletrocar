/**
 * Repositório de Ordens de Serviço (Adapter)
 * Gerencia a fila de oficina e Kanban com integração ao ciclo de vida e Telegram Voice.
 *
 * Com sessão na API (/ordens-servico): lista, abre, muda status, checklist, mão de obra e faturamento
 * no PostgreSQL. Para abrir uma OS o servidor exige cliente e carro cadastrados: o adapter localiza o
 * carro pela placa (ou o cliente pelo nome exato) e cadastra o que faltar.
 * Sem API: fila de demonstração em memória.
 */
import { IOSRepository } from "../../application/ports/repositories/IOSRepository";
import { OrdemServico, PLACA_NAO_INFORMADA } from "../../domain/entities/OrdemServico";
import { FormaPagamento, StatusOS, OrigemOS, PrioridadeOS } from "../../domain/value-objects/Enums";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { mensagemDeErro, requisitarApi, type SessaoApi } from "./apiHttp";
import { lerDataApi } from "./MockOrHttpDRERepository";

interface ApiOS {
  id: string;
  numero_os: string;
  cliente_id: string;
  nome_cliente: string;
  descricao_carro: string;
  modelo_carro: string | null;
  placa_carro: string | null;
  usuario_id: string;
  status: StatusOS;
  origem: OrigemOS;
  prioridade: PrioridadeOS;
  sintomas: string;
  hipotese_diagnostica: string | null;
  checklist_eletrico: Record<string, boolean>;
  itens: Array<{ id: string; peca_id: string; descricao_peca: string; quantidade: number; preco_unitario: string }>;
  servicos: Array<{ id: string; descricao: string; valor: string }>;
  desconto: string;
  forma_pagamento: FormaPagamento | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiCliente {
  id: string;
  nome: string;
  carros: Array<{ id: string; modelo: string; marca: string; placa: string | null }>;
}

/** Itens padrão do checklist elétrico exibidos na tela. */
const CHECKLIST_PADRAO: Record<string, boolean> = {
  bateria: false,
  alternador: false,
  motorPartida: false,
  iluminacao: false,
  injecaoEletronica: false,
};

/** Chaves do checklist no servidor (snake_case, também usadas pelo bot de voz) -> chaves da tela. */
const CHAVE_DA_API: Record<string, string> = { motor_partida: "motorPartida", injecao: "injecaoEletronica" };
const CHAVE_PARA_API: Record<string, string> = Object.fromEntries(
  Object.entries(CHAVE_DA_API).map(([api, tela]) => [tela, api])
);

export function checklistDaApi(checklist: Record<string, boolean> = {}): Record<string, boolean> {
  const traduzido = Object.fromEntries(
    Object.entries(checklist).map(([chave, valor]) => [CHAVE_DA_API[chave] ?? chave, Boolean(valor)])
  );
  return { ...CHECKLIST_PADRAO, ...traduzido };
}

export function checklistParaApi(checklist: Record<string, boolean>): Record<string, boolean> {
  return Object.fromEntries(Object.entries(checklist).map(([chave, valor]) => [CHAVE_PARA_API[chave] ?? chave, valor]));
}

/** Mesmo formato que o servidor grava: maiúsculas, sem hífen nem espaços. */
export function normalizarPlaca(placa?: string): string {
  if (!placa || placa === PLACA_NAO_INFORMADA) return "";
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function osDaApi(dto: ApiOS): OrdemServico {
  return new OrdemServico({
    id: dto.id,
    numeroOS: dto.numero_os,
    clienteId: dto.cliente_id,
    clienteNome: dto.nome_cliente,
    carroModelo: dto.modelo_carro ?? dto.descricao_carro,
    carroPlaca: dto.placa_carro ?? undefined,
    usuarioId: dto.usuario_id,
    status: dto.status,
    origem: dto.origem,
    prioridade: dto.prioridade,
    sintomas: dto.sintomas,
    hipoteseDiagnostica: dto.hipotese_diagnostica ?? undefined,
    checklistEletrico: checklistDaApi(dto.checklist_eletrico ?? {}),
    itens: dto.itens.map((i) => ({
      id: i.id,
      pecaId: i.peca_id,
      descricao: i.descricao_peca,
      quantidade: i.quantidade,
      precoUnitario: new Dinheiro(Number(i.preco_unitario)),
    })),
    servicos: dto.servicos.map((s) => ({ id: s.id, descricao: s.descricao, valor: new Dinheiro(Number(s.valor)) })),
    desconto: Number(dto.desconto),
    formaPagamento: dto.forma_pagamento ?? undefined,
    observacoes: dto.observacoes ?? undefined,
    criadoEm: lerDataApi(dto.created_at),
    atualizadoEm: lerDataApi(dto.updated_at),
  });
}

export class MockOrHttpOSRepository implements IOSRepository {
  constructor(
    private readonly sessao?: SessaoApi,
    private readonly apiBase = "/api/v1"
  ) {}

  private modoApi(): boolean {
    return this.sessao?.isModoApi() ?? false;
  }

  private api<T>(caminho: string, acao: string, init: RequestInit = {}): Promise<T> {
    return requisitarApi<T>(this.sessao, `${this.apiBase}${caminho}`, acao, init);
  }

  /** Localiza (ou cadastra) cliente e carro no servidor para abrir a OS. */
  private async resolverClienteCarro(os: OrdemServico): Promise<{ clienteId: string; carroId: string }> {
    const placa = normalizarPlaca(os.carroPlaca);
    const nome = os.clienteNome.trim();
    const carroNovo = {
      modelo: os.carroModelo.trim(),
      marca: os.carroMarca?.trim() || "Não informada",
      placa: placa || null,
    };
    const buscar = (termo: string) =>
      this.api<ApiCliente[]>(`/clientes/search?q=${encodeURIComponent(termo)}`, "buscar clientes");

    if (placa) {
      for (const cliente of await buscar(placa)) {
        const carro = cliente.carros.find((c) => normalizarPlaca(c.placa ?? "") === placa);
        if (carro) return { clienteId: cliente.id, carroId: carro.id };
      }
    }

    const mesmoNome = (await buscar(nome)).filter((c) => c.nome.trim().toLowerCase() === nome.toLowerCase());
    if (mesmoNome.length === 1) {
      const cliente = mesmoNome[0];
      if (!placa) {
        const carro = cliente.carros.find((c) => c.modelo.trim().toLowerCase() === carroNovo.modelo.toLowerCase());
        if (carro) return { clienteId: cliente.id, carroId: carro.id };
      }
      const atualizado = await this.api<ApiCliente>(`/clientes/${cliente.id}/carros`, "cadastrar o veículo", {
        method: "POST",
        body: JSON.stringify(carroNovo),
      });
      const idsAntes = new Set(cliente.carros.map((c) => c.id));
      const carro = atualizado.carros.find((c) => !idsAntes.has(c.id)) ?? atualizado.carros[atualizado.carros.length - 1];
      return { clienteId: cliente.id, carroId: carro.id };
    }

    const criado = await this.api<ApiCliente>("/clientes", "cadastrar o cliente", {
      method: "POST",
      body: JSON.stringify({ nome, carros: [carroNovo] }),
    });
    return { clienteId: criado.id, carroId: criado.carros[0].id };
  }

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
    if (this.modoApi()) {
      const filtro = status ? `?status=${status}` : "";
      return (await this.api<ApiOS[]>(`/ordens-servico${filtro}`, "listar as ordens de serviço")).map(osDaApi);
    }
    if (status) {
      return this.ordens.filter((os) => os.status === status);
    }
    return [...this.ordens];
  }

  public async buscarPorId(id: string): Promise<OrdemServico | null> {
    if (this.modoApi()) {
      const token = this.sessao?.obterAccessToken();
      const res = await fetch(`${this.apiBase}/ordens-servico/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await mensagemDeErro(res, "consultar a ordem de serviço"));
      return osDaApi((await res.json()) as ApiOS);
    }
    const os = this.ordens.find((o) => o.id === id);
    return os || null;
  }

  public async salvar(os: OrdemServico): Promise<OrdemServico> {
    if (this.modoApi()) {
      const { clienteId, carroId } = await this.resolverClienteCarro(os);
      const dto = await this.api<ApiOS>("/ordens-servico", "abrir a ordem de serviço", {
        method: "POST",
        body: JSON.stringify({
          cliente_id: clienteId,
          carro_id: carroId,
          sintomas: os.sintomas,
          hipotese_diagnostica: os.hipoteseDiagnostica ?? null,
          checklist_eletrico: checklistParaApi(os.checklistEletrico),
          observacoes: os.observacoes ?? null,
          prioridade: os.prioridade,
        }),
      });
      return osDaApi(dto);
    }
    const idx = this.ordens.findIndex((o) => o.id === os.id);
    if (idx >= 0) {
      this.ordens[idx] = os;
    } else {
      this.ordens.unshift(os);
    }
    return os;
  }

  public async atualizarStatus(id: string, novoStatus: StatusOS): Promise<void> {
    if (this.modoApi()) {
      await this.api<ApiOS>(`/ordens-servico/${id}/status`, "atualizar o status da OS", {
        method: "PATCH",
        body: JSON.stringify({ novo_status: novoStatus }),
      });
      return;
    }
    const os = await this.buscarPorId(id);
    if (os) {
      os.status = novoStatus;
      os.atualizadoEm = new Date();
    }
  }

  private async obterLocal(id: string): Promise<OrdemServico> {
    const os = await this.buscarPorId(id);
    if (!os) throw new Error("Ordem de serviço não encontrada.");
    return os;
  }

  public async atualizarChecklist(id: string, checklist: Record<string, boolean>): Promise<OrdemServico> {
    if (this.modoApi()) {
      return osDaApi(
        await this.api<ApiOS>(`/ordens-servico/${id}/checklist`, "atualizar o checklist", {
          method: "PATCH",
          body: JSON.stringify({ checklist_eletrico: checklistParaApi(checklist) }),
        })
      );
    }
    const os = await this.obterLocal(id);
    os.checklistEletrico = { ...checklist };
    os.atualizadoEm = new Date();
    return os;
  }

  public async adicionarServico(id: string, servico: { descricao: string; valor: Dinheiro }): Promise<OrdemServico> {
    if (this.modoApi()) {
      return osDaApi(
        await this.api<ApiOS>(`/ordens-servico/${id}/servicos`, "adicionar mão de obra", {
          method: "POST",
          body: JSON.stringify({ descricao: servico.descricao, valor: servico.valor.valor.toFixed(2) }),
        })
      );
    }
    const os = await this.obterLocal(id);
    os.adicionarServico({ id: crypto.randomUUID(), descricao: servico.descricao, valor: servico.valor });
    return os;
  }

  public async faturar(id: string, formaPagamento: FormaPagamento): Promise<OrdemServico> {
    if (this.modoApi()) {
      return osDaApi(
        await this.api<ApiOS>(`/ordens-servico/${id}/faturar`, "faturar a OS", {
          method: "POST",
          body: JSON.stringify({ forma_pagamento: formaPagamento }),
        })
      );
    }
    const os = await this.obterLocal(id);
    os.transicionar(StatusOS.ENTREGUE);
    os.formaPagamento = formaPagamento;
    return os;
  }
}
