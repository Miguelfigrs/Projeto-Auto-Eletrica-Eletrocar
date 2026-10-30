import { describe, it, expect } from "vitest";
import {
  OrdemServico,
  OrdemServicoStateMachine,
} from "../../domain/entities/OrdemServico";
import { StatusOS, OrigemOS, PrioridadeOS } from "../../domain/value-objects/Enums";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { TransicaoStatusInvalidaError } from "../../domain/exceptions/DomainExceptions";

describe("Entidade: OrdemServico & Máquina de Estados (Clean Architecture)", () => {
  it("deve criar OS em status inicial TRIAGEM", () => {
    const os = new OrdemServico({
      id: "os-test-1",
      numeroOS: "OS-2026-0001",
      clienteId: "cli-1",
      clienteNome: "Carlos Silva",
      carroModelo: "Gol 1.6",
      usuarioId: "eletricista-1",
      sintomas: "Alternador não carrega a bateria",
      origem: OrigemOS.TELEGRAM_VOICE,
    });

    expect(os.status).toBe(StatusOS.TRIAGEM);
    expect(os.origem).toBe(OrigemOS.TELEGRAM_VOICE);
  });

  it("deve permitir transição válida da State Machine: TRIAGEM -> ORCAMENTO_PENDENTE -> APROVADO", () => {
    const os = new OrdemServico({
      id: "os-test-2",
      numeroOS: "OS-2026-0002",
      clienteId: "cli-1",
      clienteNome: "Carlos Silva",
      carroModelo: "Gol 1.6",
      usuarioId: "eletricista-1",
      sintomas: "Partida pesada",
    });

    os.transicionar(StatusOS.ORCAMENTO_PENDENTE);
    expect(os.status).toBe(StatusOS.ORCAMENTO_PENDENTE);

    os.transicionar(StatusOS.APROVADO);
    expect(os.status).toBe(StatusOS.APROVADO);
  });

  it("deve lançar TransicaoStatusInvalidaError ao tentar salto inválido (TRIAGEM -> FINALIZADO)", () => {
    const os = new OrdemServico({
      id: "os-test-3",
      numeroOS: "OS-2026-0003",
      clienteId: "cli-1",
      clienteNome: "Carlos Silva",
      carroModelo: "Gol 1.6",
      usuarioId: "eletricista-1",
      sintomas: "Curto circuito",
    });

    expect(() => os.transicionar(StatusOS.FINALIZADO)).toThrow(TransicaoStatusInvalidaError);
  });

  it("deve calcular total exato somando peças, mão de obra e deduzindo desconto", () => {
    const os = new OrdemServico({
      id: "os-test-4",
      numeroOS: "OS-2026-0004",
      clienteId: "cli-1",
      clienteNome: "Carlos Silva",
      carroModelo: "Gol 1.6",
      usuarioId: "eletricista-1",
      sintomas: "Revisão alternador",
      itens: [
        {
          id: "item-1",
          pecaId: "p-1",
          descricao: "Regulador Bosch",
          quantidade: 1,
          precoUnitario: new Dinheiro(185.0),
        },
      ],
      servicos: [
        {
          id: "serv-1",
          descricao: "Mão de obra desmontagem",
          valor: new Dinheiro(120.0),
        },
      ],
      desconto: new Dinheiro(15.0),
    });

    // Peças: 185,00 + Mão de obra: 120,00 = 305,00 - Desconto 15,00 = 290,00
    expect(os.subtotalPecas.valor).toBe(185.0);
    expect(os.subtotalServicos.valor).toBe(120.0);
    expect(os.total.valor).toBe(290.0);
  });
});
