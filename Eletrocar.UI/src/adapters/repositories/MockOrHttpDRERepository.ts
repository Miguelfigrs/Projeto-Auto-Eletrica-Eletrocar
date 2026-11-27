import type {
  CompetenciaDRE,
  DadosDREPeriodo,
  DetalhamentoDRE,
  FiltroDREParams,
  FiltroResultadoDRE,
  IRelatorioDRERepository,
  ResultadoDiarioDRE,
  ResumoMensalDREAnual,
  ResumoMensalDREItem,
  SerieDiariaDRE,
} from "../../application/ports/repositories/IRelatorioDRERepository";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import type { MockOrHttpAuthRepository } from "./MockOrHttpAuthRepository";

export const MESES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MESES_ABREV_PT_BR = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const ANOS_DISPONIVEIS_DRE = [2024, 2025, 2026] as const;

const DIAS_SEMANA_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export function chaveCompetencia(c: CompetenciaDRE): string {
  return `${c.ano}-${String(c.mes).padStart(2, "0")}`;
}

export function normalizarCompetencias(lista: CompetenciaDRE[]): CompetenciaDRE[] {
  const mapa = new Map<string, CompetenciaDRE>();
  for (const item of lista) {
    if (item.mes >= 1 && item.mes <= 12) {
      mapa.set(chaveCompetencia(item), { ano: item.ano, mes: item.mes });
    }
  }
  return Array.from(mapa.values()).sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
}

export function formatarRotuloCompetencias(competencias: CompetenciaDRE[]): string {
  const ordenadas = normalizarCompetencias(competencias);
  if (ordenadas.length === 0) return "Sem competência";
  if (ordenadas.length === 1) {
    return formatarCompetenciaLabel(ordenadas[0].ano, ordenadas[0].mes);
  }

  const porAno = new Map<number, number[]>();
  for (const c of ordenadas) {
    const arr = porAno.get(c.ano) ?? [];
    arr.push(c.mes);
    porAno.set(c.ano, arr);
  }

  const anos = Array.from(porAno.keys()).sort((a, b) => a - b);
  const todosAnosCompletos = anos.every((a) => (porAno.get(a)?.length ?? 0) === 12);

  if (anos.length === 1 && todosAnosCompletos) {
    return `Consolidado Anual · ${anos[0]}`;
  }

  if (todosAnosCompletos) {
    return `Consolidado ${anos.join(" + ")} (${ordenadas.length} meses)`;
  }

  if (ordenadas.length <= 3) {
    return ordenadas
      .map((c) => `${MESES_ABREV_PT_BR[c.mes - 1] ?? c.mes}/${c.ano}`)
      .join(", ");
  }

  return `${ordenadas.length} meses · ${anos.join(" / ")}`;
}

export function normalizarDiasIso(dias: string[]): string[] {
  const validos = new Set<string>();
  for (const d of dias) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      validos.add(d);
    }
  }
  return Array.from(validos).sort();
}

export function criarDataIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function decomporDataIso(iso: string): { ano: number; mes: number; dia: number } {
  const [a, m, d] = iso.split("-").map(Number);
  return { ano: a, mes: m, dia: d };
}

export function gerarIntervaloDiasIso(isoA: string, isoB: string): string[] {
  const [inicioIso, fimIso] = isoA <= isoB ? [isoA, isoB] : [isoB, isoA];
  const ini = decomporDataIso(inicioIso);
  const fim = decomporDataIso(fimIso);
  const cursor = new Date(ini.ano, ini.mes - 1, ini.dia);
  const limite = new Date(fim.ano, fim.mes - 1, fim.dia);
  const resultado: string[] = [];

  while (cursor <= limite && resultado.length < 400) {
    resultado.push(
      criarDataIso(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()),
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return resultado;
}

export function agruparDiasEmIntervalos(
  diasIso: string[],
): Array<{ inicio: string; fim: string }> {
  const ordenados = normalizarDiasIso(diasIso);
  if (ordenados.length === 0) return [];

  const intervalos: Array<{ inicio: string; fim: string }> = [];
  let inicio = ordenados[0];
  let anterior = ordenados[0];

  const ehProximoDia = (a: string, b: string) => {
    const da = decomporDataIso(a);
    const dt = new Date(da.ano, da.mes - 1, da.dia + 1);
    return criarDataIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()) === b;
  };

  for (let i = 1; i < ordenados.length; i += 1) {
    const atual = ordenados[i];
    if (ehProximoDia(anterior, atual)) {
      anterior = atual;
    } else {
      intervalos.push({ inicio, fim: anterior });
      inicio = atual;
      anterior = atual;
    }
  }
  intervalos.push({ inicio, fim: anterior });
  return intervalos;
}

export function formatarRotuloDias(diasIso: string[]): string {
  const ordenados = normalizarDiasIso(diasIso);
  if (ordenados.length === 0) return "Sem dias";

  if (ordenados.length === 1) {
    const d = decomporDataIso(ordenados[0]);
    return `${String(d.dia).padStart(2, "0")} ${MESES_ABREV_PT_BR[d.mes - 1]} ${d.ano}`;
  }

  const intervalos = agruparDiasEmIntervalos(ordenados);
  if (intervalos.length === 1) {
    const ini = decomporDataIso(intervalos[0].inicio);
    const fim = decomporDataIso(intervalos[0].fim);
    if (ini.ano === fim.ano && ini.mes === fim.mes) {
      return `${String(ini.dia).padStart(2, "0")}–${String(fim.dia).padStart(2, "0")} ${MESES_ABREV_PT_BR[ini.mes - 1]} ${ini.ano}`;
    }
    return `${String(ini.dia).padStart(2, "0")} ${MESES_ABREV_PT_BR[ini.mes - 1]} – ${String(fim.dia).padStart(2, "0")} ${MESES_ABREV_PT_BR[fim.mes - 1]} ${fim.ano}`;
  }

  const primeiro = decomporDataIso(ordenados[0]);
  const mesmoMesAno = ordenados.every((iso) => {
    const x = decomporDataIso(iso);
    return x.ano === primeiro.ano && x.mes === primeiro.mes;
  });

  if (mesmoMesAno && ordenados.length <= 4) {
    const listaDias = ordenados
      .map((iso) => String(decomporDataIso(iso).dia).padStart(2, "0"))
      .join(", ");
    return `Dias ${listaDias} · ${MESES_ABREV_PT_BR[primeiro.mes - 1]} ${primeiro.ano}`;
  }

  if (mesmoMesAno) {
    return `${ordenados.length} dias · ${MESES_ABREV_PT_BR[primeiro.mes - 1]} ${primeiro.ano}`;
  }

  return `${ordenados.length} dias selecionados`;
}

function agruparConsultasPorAno(
  competencias: CompetenciaDRE[],
): Array<{ ano: number; mes: number | "TODOS" }> {
  const ordenadas = normalizarCompetencias(competencias);
  const porAno = new Map<number, number[]>();
  for (const c of ordenadas) {
    const arr = porAno.get(c.ano) ?? [];
    arr.push(c.mes);
    porAno.set(c.ano, arr);
  }

  const consultas: Array<{ ano: number; mes: number | "TODOS" }> = [];
  for (const [ano, meses] of Array.from(porAno.entries()).sort((a, b) => a[0] - b[0])) {
    if (meses.length === 12) {
      consultas.push({ ano, mes: "TODOS" });
    } else {
      for (const m of meses) {
        consultas.push({ ano, mes: m });
      }
    }
  }
  return consultas;
}

function resumirSerieDiaria(
  ano: number,
  mes: number,
  origemDados: "API" | "DEMO",
  dias: ResultadoDiarioDRE[],
): SerieDiariaDRE {
  let melhorDia: ResultadoDiarioDRE | null = null;
  let piorDia: ResultadoDiarioDRE | null = null;
  let totalLucroCentavos = 0;
  let totalReceitaCentavos = 0;

  for (const d of dias) {
    totalLucroCentavos += d.lucroLiquido.centavos;
    totalReceitaCentavos += d.receitaTotal.centavos;

    if (!melhorDia || d.lucroLiquido.centavos > melhorDia.lucroLiquido.centavos) {
      melhorDia = d;
    }
    if (!piorDia || d.lucroLiquido.centavos < piorDia.lucroLiquido.centavos) {
      piorDia = d;
    }
  }

  const mediaCentavos = dias.length > 0 ? Math.round(totalLucroCentavos / dias.length) : 0;

  return {
    ano,
    mes,
    competenciaLabel: formatarCompetenciaLabel(ano, mes),
    origemDados,
    dias,
    melhorDia,
    piorDia,
    mediaDiariaLucro: new Dinheiro(mediaCentavos / 100, true),
    totalLucroPeriodo: new Dinheiro(totalLucroCentavos / 100, true),
    totalReceitaPeriodo: new Dinheiro(totalReceitaCentavos / 100, true),
  };
}

interface SliceDiarioDemo extends RegistroMensalSeed {
  dia: number;
  dataIso: string;
  diaSemana: string;
}

function gerarSlicesDiariosDemo(ano: number, mes: number, seed: RegistroMensalSeed): SliceDiarioDemo[] {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const pesoDiaSemana = [0.15, 0.92, 1.05, 1.12, 1.08, 1.48, 1.32];
  const pesos: number[] = [];
  let somaPesos = 0;
  let diaMaisForteIdx = 0;

  for (let dia = 1; dia <= ultimoDia; dia += 1) {
    const dt = new Date(ano, mes - 1, dia);
    const variacao = 0.72 + ((dia * 17 + mes * 31 + ano * 7) % 11) * 0.055;
    const peso = pesoDiaSemana[dt.getDay()] * variacao;
    pesos.push(peso);
    somaPesos += peso;
    if (peso > pesos[diaMaisForteIdx]) {
      diaMaisForteIdx = dia - 1;
    }
  }

  const distribuir = (total: number): number[] => {
    const totalCentavos = Math.round(total * 100);
    const arr: number[] = [];
    let soma = 0;
    for (let i = 0; i < ultimoDia; i += 1) {
      const fracao = somaPesos > 0 ? pesos[i] / somaPesos : 1 / ultimoDia;
      const val = Math.round(totalCentavos * fracao);
      arr.push(val);
      soma += val;
    }
    arr[diaMaisForteIdx] += totalCentavos - soma;
    return arr.map((c) => c / 100);
  };

  const distribuirInteiro = (total: number): number[] => {
    const arr: number[] = [];
    let soma = 0;
    for (let i = 0; i < ultimoDia; i += 1) {
      const fracao = somaPesos > 0 ? pesos[i] / somaPesos : 1 / ultimoDia;
      const val = Math.round(total * fracao);
      arr.push(val);
      soma += val;
    }
    arr[diaMaisForteIdx] = Math.max(0, arr[diaMaisForteIdx] + (total - soma));
    return arr;
  };

  const prod = distribuir(seed.receitaVendasProdutos);
  const serv = distribuir(seed.receitaServicosOS);
  const desc = distribuir(seed.deducoesDescontos);
  const cmv = distribuir(seed.cmvPecas);
  const mao = distribuir(seed.custoMaoObra);
  const varDesp = distribuir(seed.despesasVariaveis);
  const vendas = distribuirInteiro(seed.quantidadeVendas);
  const os = distribuirInteiro(seed.quantidadeOS);

  const diaAluguel = Math.min(5, ultimoDia);
  const diaFolha = Math.min(15, ultimoDia);
  const fixaDia5 = Math.round(seed.despesasFixas * 100 * 0.55) / 100;
  const fixaDia15 = Math.round((seed.despesasFixas - fixaDia5) * 100) / 100;

  const slices: SliceDiarioDemo[] = [];
  for (let i = 0; i < ultimoDia; i += 1) {
    const dia = i + 1;
    const dt = new Date(ano, mes - 1, dia);
    const despesasFixas = dia === diaAluguel ? fixaDia5 : dia === diaFolha ? fixaDia15 : 0;
    slices.push({
      dia,
      dataIso: criarDataIso(ano, mes, dia),
      diaSemana: DIAS_SEMANA_PT[dt.getDay()],
      receitaVendasProdutos: prod[i],
      receitaServicosOS: serv[i],
      deducoesDescontos: desc[i],
      cmvPecas: cmv[i],
      custoMaoObra: mao[i],
      despesasFixas,
      despesasVariaveis: varDesp[i],
      quantidadeVendas: vendas[i],
      quantidadeOS: os[i],
    });
  }
  return slices;
}

function gerarSerieDiariaDemo(ano: number, mes: number, seed: RegistroMensalSeed): SerieDiariaDRE {
  const slices = gerarSlicesDiariosDemo(ano, mes, seed);
  const dias: ResultadoDiarioDRE[] = slices.map((s) => {
    const rec = s.receitaVendasProdutos + s.receitaServicosOS - s.deducoesDescontos;
    const custos = s.cmvPecas + s.custoMaoObra + s.despesasFixas + s.despesasVariaveis;
    const lucro = rec - custos;
    return {
      dataIso: s.dataIso,
      dia: s.dia,
      mes,
      ano,
      diaSemana: s.diaSemana,
      rotuloCurto: String(s.dia).padStart(2, "0"),
      receitaTotal: new Dinheiro(rec, true),
      custosEDespesas: new Dinheiro(custos, true),
      lucroLiquido: new Dinheiro(lucro, true),
      quantidadeVendas: s.quantidadeVendas,
      quantidadeOS: s.quantidadeOS,
    };
  });

  return resumirSerieDiaria(ano, mes, "DEMO", dias);
}

interface RegistroMensalSeed {
  receitaVendasProdutos: number;
  receitaServicosOS: number;
  deducoesDescontos: number;
  cmvPecas: number;
  custoMaoObra: number;
  despesasFixas: number;
  despesasVariaveis: number;
  quantidadeVendas: number;
  quantidadeOS: number;
}

const REGISTROS_POR_ANO: Record<number, Record<number, RegistroMensalSeed>> = {
  2026: {
    1: { receitaVendasProdutos: 38200, receitaServicosOS: 27400, deducoesDescontos: 1600, cmvPecas: 23400, custoMaoObra: 9800, despesasFixas: 14200, despesasVariaveis: 3900, quantidadeVendas: 49, quantidadeOS: 22 },
    2: { receitaVendasProdutos: 18400, receitaServicosOS: 12100, deducoesDescontos: 950, cmvPecas: 11800, custoMaoObra: 4900, despesasFixas: 14200, despesasVariaveis: 3100, quantidadeVendas: 26, quantidadeOS: 11 }, // Prejuízo (-4.350)
    3: { receitaVendasProdutos: 41500, receitaServicosOS: 29800, deducoesDescontos: 1800, cmvPecas: 25100, custoMaoObra: 10500, despesasFixas: 14200, despesasVariaveis: 4100, quantidadeVendas: 53, quantidadeOS: 24 },
    4: { receitaVendasProdutos: 44100, receitaServicosOS: 31200, deducoesDescontos: 1900, cmvPecas: 26700, custoMaoObra: 11100, despesasFixas: 14200, despesasVariaveis: 4300, quantidadeVendas: 56, quantidadeOS: 25 },
    5: { receitaVendasProdutos: 46800, receitaServicosOS: 33900, deducoesDescontos: 2050, cmvPecas: 28200, custoMaoObra: 11800, despesasFixas: 14200, despesasVariaveis: 4600, quantidadeVendas: 60, quantidadeOS: 27 },
    6: { receitaVendasProdutos: 19800, receitaServicosOS: 13600, deducoesDescontos: 1100, cmvPecas: 13200, custoMaoObra: 5400, despesasFixas: 14500, despesasVariaveis: 3400, quantidadeVendas: 28, quantidadeOS: 12 }, // Prejuízo (-4.200)
    7: { receitaVendasProdutos: 43200, receitaServicosOS: 30500, deducoesDescontos: 1750, cmvPecas: 26100, custoMaoObra: 10900, despesasFixas: 14500, despesasVariaveis: 4200, quantidadeVendas: 55, quantidadeOS: 24 },
    8: { receitaVendasProdutos: 45900, receitaServicosOS: 34100, deducoesDescontos: 1950, cmvPecas: 27900, custoMaoObra: 11600, despesasFixas: 14500, despesasVariaveis: 4500, quantidadeVendas: 59, quantidadeOS: 26 },
    9: { receitaVendasProdutos: 47200, receitaServicosOS: 35000, deducoesDescontos: 2100, cmvPecas: 28800, custoMaoObra: 12000, despesasFixas: 14500, despesasVariaveis: 4700, quantidadeVendas: 61, quantidadeOS: 28 },
    10: { receitaVendasProdutos: 1178, receitaServicosOS: 1050, deducoesDescontos: 0, cmvPecas: 890, custoMaoObra: 420, despesasFixas: 3500, despesasVariaveis: 0, quantidadeVendas: 3, quantidadeOS: 2 }, // Prejuízo (-2.582, alinhado ao seed PostgreSQL)
    11: { receitaVendasProdutos: 48950, receitaServicosOS: 36400, deducoesDescontos: 2150, cmvPecas: 29800, custoMaoObra: 12400, despesasFixas: 14200, despesasVariaveis: 4800, quantidadeVendas: 64, quantidadeOS: 29 }, // Lucro (22.000)
    12: { receitaVendasProdutos: 52400, receitaServicosOS: 39100, deducoesDescontos: 2400, cmvPecas: 31500, custoMaoObra: 13200, despesasFixas: 15200, despesasVariaveis: 5100, quantidadeVendas: 71, quantidadeOS: 31 },
  },
  2025: {
    1: { receitaVendasProdutos: 17500, receitaServicosOS: 11800, deducoesDescontos: 800, cmvPecas: 11200, custoMaoObra: 4800, despesasFixas: 12500, despesasVariaveis: 2400, quantidadeVendas: 23, quantidadeOS: 10 }, // Prejuízo (-2.400)
    2: { receitaVendasProdutos: 33400, receitaServicosOS: 24200, deducoesDescontos: 1400, cmvPecas: 20400, custoMaoObra: 8600, despesasFixas: 12500, despesasVariaveis: 3200, quantidadeVendas: 44, quantidadeOS: 19 },
    3: { receitaVendasProdutos: 36800, receitaServicosOS: 26500, deducoesDescontos: 1550, cmvPecas: 22100, custoMaoObra: 9300, despesasFixas: 12500, despesasVariaveis: 3500, quantidadeVendas: 48, quantidadeOS: 21 },
    4: { receitaVendasProdutos: 35200, receitaServicosOS: 25100, deducoesDescontos: 1450, cmvPecas: 21300, custoMaoObra: 8900, despesasFixas: 12500, despesasVariaveis: 3400, quantidadeVendas: 46, quantidadeOS: 20 },
    5: { receitaVendasProdutos: 16200, receitaServicosOS: 10900, deducoesDescontos: 750, cmvPecas: 10600, custoMaoObra: 4400, despesasFixas: 12500, despesasVariaveis: 2000, quantidadeVendas: 21, quantidadeOS: 9 }, // Prejuízo (-3.150)
    6: { receitaVendasProdutos: 38100, receitaServicosOS: 27900, deducoesDescontos: 1600, cmvPecas: 23100, custoMaoObra: 9700, despesasFixas: 12800, despesasVariaveis: 3600, quantidadeVendas: 50, quantidadeOS: 22 },
    7: { receitaVendasProdutos: 39400, receitaServicosOS: 28800, deducoesDescontos: 1700, cmvPecas: 23800, custoMaoObra: 10000, despesasFixas: 12800, despesasVariaveis: 3700, quantidadeVendas: 51, quantidadeOS: 23 },
    8: { receitaVendasProdutos: 40500, receitaServicosOS: 29400, deducoesDescontos: 1750, cmvPecas: 24400, custoMaoObra: 10200, despesasFixas: 12800, despesasVariaveis: 3800, quantidadeVendas: 52, quantidadeOS: 24 },
    9: { receitaVendasProdutos: 37900, receitaServicosOS: 27200, deducoesDescontos: 1600, cmvPecas: 22900, custoMaoObra: 9600, despesasFixas: 12800, despesasVariaveis: 3500, quantidadeVendas: 49, quantidadeOS: 21 },
    10: { receitaVendasProdutos: 18600, receitaServicosOS: 12400, deducoesDescontos: 850, cmvPecas: 11800, custoMaoObra: 5000, despesasFixas: 12800, despesasVariaveis: 2200, quantidadeVendas: 25, quantidadeOS: 11 }, // Prejuízo (-1.650)
    11: { receitaVendasProdutos: 42300, receitaServicosOS: 31200, deducoesDescontos: 1850, cmvPecas: 25600, custoMaoObra: 10700, despesasFixas: 13200, despesasVariaveis: 4100, quantidadeVendas: 55, quantidadeOS: 25 },
    12: { receitaVendasProdutos: 45100, receitaServicosOS: 33500, deducoesDescontos: 1950, cmvPecas: 27200, custoMaoObra: 11400, despesasFixas: 13800, despesasVariaveis: 4400, quantidadeVendas: 59, quantidadeOS: 27 },
  },
  2024: {
    1: { receitaVendasProdutos: 29800, receitaServicosOS: 21500, deducoesDescontos: 1200, cmvPecas: 18200, custoMaoObra: 7600, despesasFixas: 11400, despesasVariaveis: 2900, quantidadeVendas: 38, quantidadeOS: 17 },
    2: { receitaVendasProdutos: 31200, receitaServicosOS: 22400, deducoesDescontos: 1250, cmvPecas: 19100, custoMaoObra: 8000, despesasFixas: 11400, despesasVariaveis: 3000, quantidadeVendas: 40, quantidadeOS: 18 },
    3: { receitaVendasProdutos: 15800, receitaServicosOS: 10400, deducoesDescontos: 700, cmvPecas: 10200, custoMaoObra: 4200, despesasFixas: 11400, despesasVariaveis: 1800, quantidadeVendas: 20, quantidadeOS: 9 }, // Prejuízo (-2.100)
    4: { receitaVendasProdutos: 32600, receitaServicosOS: 23800, deducoesDescontos: 1300, cmvPecas: 19800, custoMaoObra: 8300, despesasFixas: 11400, despesasVariaveis: 3100, quantidadeVendas: 42, quantidadeOS: 19 },
    5: { receitaVendasProdutos: 34100, receitaServicosOS: 24900, deducoesDescontos: 1350, cmvPecas: 20700, custoMaoObra: 8700, despesasFixas: 11400, despesasVariaveis: 3200, quantidadeVendas: 44, quantidadeOS: 20 },
    6: { receitaVendasProdutos: 33500, receitaServicosOS: 24100, deducoesDescontos: 1300, cmvPecas: 20300, custoMaoObra: 8500, despesasFixas: 11600, despesasVariaveis: 3100, quantidadeVendas: 43, quantidadeOS: 19 },
    7: { receitaVendasProdutos: 35800, receitaServicosOS: 26100, deducoesDescontos: 1450, cmvPecas: 21700, custoMaoObra: 9100, despesasFixas: 11600, despesasVariaveis: 3300, quantidadeVendas: 46, quantidadeOS: 21 },
    8: { receitaVendasProdutos: 16500, receitaServicosOS: 11200, deducoesDescontos: 750, cmvPecas: 10800, custoMaoObra: 4450, despesasFixas: 11800, despesasVariaveis: 2300, quantidadeVendas: 21, quantidadeOS: 10 }, // Prejuízo (-2.400)
    9: { receitaVendasProdutos: 36200, receitaServicosOS: 26800, deducoesDescontos: 1500, cmvPecas: 22100, custoMaoObra: 9300, despesasFixas: 11800, despesasVariaveis: 3400, quantidadeVendas: 47, quantidadeOS: 21 },
    10: { receitaVendasProdutos: 37400, receitaServicosOS: 27900, deducoesDescontos: 1550, cmvPecas: 22800, custoMaoObra: 9600, despesasFixas: 11800, despesasVariaveis: 3500, quantidadeVendas: 48, quantidadeOS: 22 },
    11: { receitaVendasProdutos: 38900, receitaServicosOS: 28700, deducoesDescontos: 1600, cmvPecas: 23600, custoMaoObra: 9900, despesasFixas: 12000, despesasVariaveis: 3600, quantidadeVendas: 50, quantidadeOS: 23 },
    12: { receitaVendasProdutos: 18900, receitaServicosOS: 13100, deducoesDescontos: 850, cmvPecas: 12100, custoMaoObra: 5100, despesasFixas: 12900, despesasVariaveis: 2500, quantidadeVendas: 25, quantidadeOS: 11 }, // Prejuízo (-1.450)
  },
};

interface ApiRelatorioDRE {
  receita_vendas_produtos: string;
  receita_servicos_os: string;
  receita_bruta_total: string;
  deducoes_descontos: string;
  receita_liquida: string;
  custo_mercadorias_vendidas: string;
  custo_mao_obra_direta: string;
  custos_diretos_total: string;
  lucro_bruto: string;
  margem_bruta_percentual: string;
  despesas_operacionais_fixas: string;
  despesas_variaveis: string;
  despesas_totais: string;
  lucro_liquido: string;
  margem_lucro_liquido_percentual: string;
  quantidade_vendas: number;
  quantidade_os: number;
}

interface ApiResumoMensalDREItem {
  ano: number;
  mes: number;
  competencia: string;
  receita_bruta_total: string;
  receita_liquida: string;
  custos_diretos_total: string;
  despesas_totais: string;
  lucro_bruto: string;
  lucro_liquido: string;
  margem_lucro_liquido_percentual: string;
  eh_lucro: boolean;
  eh_prejuizo: boolean;
  quantidade_vendas: number;
  quantidade_os: number;
}

interface ApiResumoMensalDRE {
  ano: number;
  filtro_resultado: "TODOS" | "LUCROS" | "PREJUIZOS";
  total_meses_filtrados: number;
  soma_lucros: string;
  soma_prejuizos: string;
  saldo_liquido_filtrado: string;
  meses: ApiResumoMensalDREItem[];
}

function money(valor: string | number): Dinheiro {
  const num = typeof valor === "number" ? valor : Number(valor);
  return new Dinheiro(Number.isFinite(num) ? num : 0, true);
}

function formatarCompetenciaLabel(ano: number, mes: number | "TODOS"): string {
  if (mes === "TODOS") {
    return `Consolidado Anual · ${ano}`;
  }
  const nomeMes = MESES_PT_BR[mes - 1] ?? `Mês ${mes}`;
  return `${nomeMes} / ${ano}`;
}

function consolidarAnoDemo(ano: number): RegistroMensalSeed {
  const tabelaAno = REGISTROS_POR_ANO[ano] ?? REGISTROS_POR_ANO[2026];
  return Object.values(tabelaAno).reduce<RegistroMensalSeed>(
    (acc, item) => ({
      receitaVendasProdutos: acc.receitaVendasProdutos + item.receitaVendasProdutos,
      receitaServicosOS: acc.receitaServicosOS + item.receitaServicosOS,
      deducoesDescontos: acc.deducoesDescontos + item.deducoesDescontos,
      cmvPecas: acc.cmvPecas + item.cmvPecas,
      custoMaoObra: acc.custoMaoObra + item.custoMaoObra,
      despesasFixas: acc.despesasFixas + item.despesasFixas,
      despesasVariaveis: acc.despesasVariaveis + item.despesasVariaveis,
      quantidadeVendas: acc.quantidadeVendas + item.quantidadeVendas,
      quantidadeOS: acc.quantidadeOS + item.quantidadeOS,
    }),
    {
      receitaVendasProdutos: 0,
      receitaServicosOS: 0,
      deducoesDescontos: 0,
      cmvPecas: 0,
      custoMaoObra: 0,
      despesasFixas: 0,
      despesasVariaveis: 0,
      quantidadeVendas: 0,
      quantidadeOS: 0,
    },
  );
}

function calcularDadosDREDemo(
  ano: number,
  mes: number | "TODOS",
  seed: RegistroMensalSeed,
): DadosDREPeriodo {
  const receitaVendasProdutos = money(seed.receitaVendasProdutos);
  const receitaServicosOS = money(seed.receitaServicosOS);
  const receitaBrutaTotal = receitaVendasProdutos.somar(receitaServicosOS);
  const deducoesDescontos = money(seed.deducoesDescontos);
  const receitaLiquida = receitaBrutaTotal.subtrair(deducoesDescontos);
  const cmvPecas = money(seed.cmvPecas);
  const custoMaoObra = money(seed.custoMaoObra);
  const custosDiretosTotal = cmvPecas.somar(custoMaoObra);
  const lucroBruto = receitaLiquida.subtrair(custosDiretosTotal);
  const despesasFixas = money(seed.despesasFixas);
  const despesasVariaveis = money(seed.despesasVariaveis);
  const despesasTotais = despesasFixas.somar(despesasVariaveis);
  const lucroLiquido = lucroBruto.subtrair(despesasTotais);

  const recLiqVal = receitaLiquida.valor;
  const margemBrutaPercentual = recLiqVal > 0 ? Number(((lucroBruto.valor / recLiqVal) * 100).toFixed(2)) : 0;
  const margemLiquidaPercentual = recLiqVal > 0 ? Number(((lucroLiquido.valor / recLiqVal) * 100).toFixed(2)) : 0;

  return {
    competenciaLabel: formatarCompetenciaLabel(ano, mes),
    ano,
    mes,
    origemDados: "DEMO",
    receitaVendasProdutos,
    receitaServicosOS,
    receitaBrutaTotal,
    deducoesDescontos,
    receitaLiquida,
    cmvPecas,
    custoMaoObra,
    custosDiretosTotal,
    lucroBruto,
    margemBrutaPercentual,
    despesasFixas,
    despesasVariaveis,
    despesasTotais,
    lucroLiquido,
    margemLiquidaPercentual,
    quantidadeVendas: seed.quantidadeVendas,
    quantidadeOS: seed.quantidadeOS,
  };
}

interface ApiItemDetalhe {
  descricao: string;
  quantidade: number;
  preco_unitario: string;
  custo_unitario: string;
  total: string;
}

interface ApiDetalhamentoDRE {
  periodo: string;
  total_vendas: string;
  total_ordens_servico: string;
  total_despesas: string;
  vendas: Array<{
    id: string;
    numero: string;
    data: string;
    operador: string | null;
    forma_pagamento: string | null;
    subtotal: string;
    desconto: string;
    total: string;
    custo: string;
    lucro_bruto: string;
    itens: ApiItemDetalhe[];
  }>;
  ordens_servico: Array<{
    id: string;
    numero: string;
    data: string;
    forma_pagamento: string | null;
    valor_pecas: string;
    valor_servicos: string;
    desconto: string;
    total: string;
    custo_pecas: string;
    itens: ApiItemDetalhe[];
    servicos: Array<{ descricao: string; valor: string }>;
  }>;
  despesas: Array<{
    id: string;
    descricao: string;
    categoria: string;
    valor: string;
    data_pagamento: string | null;
    forma_pagamento: string | null;
    entra_no_dre: boolean;
  }>;
}

/** Datas da API vêm em UTC sem fuso (naive); datas puras (AAAA-MM-DD) são locais. */
export function lerDataApi(valor: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(valor) ? valor : `${valor}Z`);
}

function mapearItens(itens: ApiItemDetalhe[]) {
  return itens.map((i) => ({
    descricao: i.descricao,
    quantidade: i.quantidade,
    precoUnitario: money(i.preco_unitario),
    custoUnitario: money(i.custo_unitario),
    total: money(i.total),
  }));
}

export function mapearDetalhamentoApi(dto: ApiDetalhamentoDRE): DetalhamentoDRE {
  return {
    periodo: dto.periodo,
    origemDados: "API",
    totalVendas: money(dto.total_vendas),
    totalOrdensServico: money(dto.total_ordens_servico),
    totalDespesas: money(dto.total_despesas),
    vendas: dto.vendas.map((v) => ({
      id: v.id,
      numero: v.numero,
      data: lerDataApi(v.data),
      operador: v.operador,
      formaPagamento: v.forma_pagamento,
      subtotal: money(v.subtotal),
      desconto: money(v.desconto),
      total: money(v.total),
      custo: money(v.custo),
      lucroBruto: money(v.lucro_bruto),
      itens: mapearItens(v.itens),
    })),
    ordensServico: dto.ordens_servico.map((o) => ({
      id: o.id,
      numero: o.numero,
      data: lerDataApi(o.data),
      formaPagamento: o.forma_pagamento,
      valorPecas: money(o.valor_pecas),
      valorServicos: money(o.valor_servicos),
      desconto: money(o.desconto),
      total: money(o.total),
      custoPecas: money(o.custo_pecas),
      itens: mapearItens(o.itens),
      servicos: o.servicos.map((s) => ({ descricao: s.descricao, valor: money(s.valor) })),
    })),
    despesas: dto.despesas.map((d) => ({
      id: d.id,
      descricao: d.descricao,
      categoria: d.categoria,
      valor: money(d.valor),
      dataPagamento: d.data_pagamento ? lerDataApi(d.data_pagamento) : null,
      formaPagamento: d.forma_pagamento,
      entraNoDRE: d.entra_no_dre,
    })),
  };
}

export class MockOrHttpDRERepository implements IRelatorioDRERepository {
  constructor(private readonly authRepository: MockOrHttpAuthRepository) {}

  private criarHeaders(): HeadersInit {
    const token = this.authRepository.obterAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  public async obterDetalhamento({
    ano,
    mes,
  }: Pick<FiltroDREParams, "ano" | "mes">): Promise<DetalhamentoDRE> {
    if (this.authRepository.isModoApi()) {
      const search = new URLSearchParams({ ano: String(ano) });
      if (mes !== "TODOS") {
        search.set("mes", String(mes));
      }
      const res = await fetch(`/api/v1/relatorios/dre/detalhes?${search.toString()}`, {
        headers: this.criarHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Falha ao consultar o detalhamento da DRE na API (HTTP ${res.status}).`);
      }
      return mapearDetalhamentoApi((await res.json()) as ApiDetalhamentoDRE);
    }

    // Base demonstrativa: os valores da DRE são agregados de exemplo, sem lançamentos individuais.
    return {
      periodo: formatarCompetenciaLabel(ano, mes),
      origemDados: "DEMO",
      totalVendas: Dinheiro.zero(),
      totalOrdensServico: Dinheiro.zero(),
      totalDespesas: Dinheiro.zero(),
      vendas: [],
      ordensServico: [],
      despesas: [],
    };
  }

  public async obterDREPeriodo({ ano, mes }: Pick<FiltroDREParams, "ano" | "mes">): Promise<DadosDREPeriodo> {
    if (this.authRepository.isModoApi()) {
      const search = new URLSearchParams({ ano: String(ano) });
      if (mes !== "TODOS") {
        search.set("mes", String(mes));
      }
      const res = await fetch(`/api/v1/relatorios/dre?${search.toString()}`, {
        headers: this.criarHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Falha ao consultar DRE na API (HTTP ${res.status}).`);
      }
      const dto = (await res.json()) as ApiRelatorioDRE;
      return {
        competenciaLabel: formatarCompetenciaLabel(ano, mes),
        ano,
        mes,
        origemDados: "API",
        receitaVendasProdutos: money(dto.receita_vendas_produtos),
        receitaServicosOS: money(dto.receita_servicos_os),
        receitaBrutaTotal: money(dto.receita_bruta_total),
        deducoesDescontos: money(dto.deducoes_descontos),
        receitaLiquida: money(dto.receita_liquida),
        cmvPecas: money(dto.custo_mercadorias_vendidas),
        custoMaoObra: money(dto.custo_mao_obra_direta),
        custosDiretosTotal: money(dto.custos_diretos_total),
        lucroBruto: money(dto.lucro_bruto),
        margemBrutaPercentual: Number(dto.margem_bruta_percentual) || 0,
        despesasFixas: money(dto.despesas_operacionais_fixas),
        despesasVariaveis: money(dto.despesas_variaveis),
        despesasTotais: money(dto.despesas_totais),
        lucroLiquido: money(dto.lucro_liquido),
        margemLiquidaPercentual: Number(dto.margem_lucro_liquido_percentual) || 0,
        quantidadeVendas: dto.quantidade_vendas,
        quantidadeOS: dto.quantidade_os,
      };
    }

    const seed =
      mes === "TODOS"
        ? consolidarAnoDemo(ano)
        : (REGISTROS_POR_ANO[ano]?.[mes] ?? REGISTROS_POR_ANO[2026][11]);
    return calcularDadosDREDemo(ano, mes, seed);
  }

  public async obterResumoMensalAnual({
    ano,
    resultado,
  }: Pick<FiltroDREParams, "ano" | "resultado">): Promise<ResumoMensalDREAnual> {
    if (this.authRepository.isModoApi()) {
      const search = new URLSearchParams({
        ano: String(ano),
        resultado,
      });
      const res = await fetch(`/api/v1/relatorios/dre/mensal?${search.toString()}`, {
        headers: this.criarHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Falha ao consultar resumo mensal da DRE na API (HTTP ${res.status}).`);
      }
      const dto = (await res.json()) as ApiResumoMensalDRE;
      return {
        ano: dto.ano,
        filtroResultado: dto.filtro_resultado,
        origemDados: "API",
        totalMesesFiltrados: dto.total_meses_filtrados,
        somaLucros: money(dto.soma_lucros),
        somaPrejuizos: money(dto.soma_prejuizos),
        saldoLiquidoFiltrado: money(dto.saldo_liquido_filtrado),
        meses: dto.meses.map((item) => ({
          ano: item.ano,
          mes: item.mes,
          competencia: item.competencia,
          receitaBrutaTotal: money(item.receita_bruta_total),
          receitaLiquida: money(item.receita_liquida),
          custosDiretosTotal: money(item.custos_diretos_total),
          despesasTotais: money(item.despesas_totais),
          lucroBruto: money(item.lucro_bruto),
          lucroLiquido: money(item.lucro_liquido),
          margemLiquidaPercentual: Number(item.margem_lucro_liquido_percentual) || 0,
          ehLucro: item.eh_lucro,
          ehPrejuizo: item.eh_prejuizo,
          quantidadeVendas: item.quantidade_vendas,
          quantidadeOS: item.quantidade_os,
        })),
      };
    }

    const tabelaAno = REGISTROS_POR_ANO[ano] ?? REGISTROS_POR_ANO[2026];
    let somaLucrosCentavos = 0;
    let somaPrejuizosCentavos = 0;
    const mesesFiltrados: ResumoMensalDREItem[] = [];

    for (let mes = 1; mes <= 12; mes += 1) {
      const seed = tabelaAno[mes];
      const dados = calcularDadosDREDemo(ano, mes, seed);
      const ehLucro = dados.lucroLiquido.centavos > 0;
      const ehPrejuizo = dados.lucroLiquido.centavos < 0;

      if (ehLucro) {
        somaLucrosCentavos += dados.lucroLiquido.centavos;
      } else if (ehPrejuizo) {
        somaPrejuizosCentavos += Math.abs(dados.lucroLiquido.centavos);
      }

      if (resultado === "LUCROS" && !ehLucro) continue;
      if (resultado === "PREJUIZOS" && !ehPrejuizo) continue;

      mesesFiltrados.push({
        ano,
        mes,
        competencia: `${String(mes).padStart(2, "0")}/${ano}`,
        receitaBrutaTotal: dados.receitaBrutaTotal,
        receitaLiquida: dados.receitaLiquida,
        custosDiretosTotal: dados.custosDiretosTotal,
        despesasTotais: dados.despesasTotais,
        lucroBruto: dados.lucroBruto,
        lucroLiquido: dados.lucroLiquido,
        margemLiquidaPercentual: dados.margemLiquidaPercentual,
        ehLucro,
        ehPrejuizo,
        quantidadeVendas: dados.quantidadeVendas,
        quantidadeOS: dados.quantidadeOS,
      });
    }

    const saldoCentavos = mesesFiltrados.reduce((acc, m) => acc + m.lucroLiquido.centavos, 0);

    return {
      ano,
      filtroResultado: resultado,
      origemDados: "DEMO",
      totalMesesFiltrados: mesesFiltrados.length,
      somaLucros: new Dinheiro(somaLucrosCentavos / 100, true),
      somaPrejuizos: new Dinheiro(somaPrejuizosCentavos / 100, true),
      saldoLiquidoFiltrado: new Dinheiro(saldoCentavos / 100, true),
      meses: mesesFiltrados,
    };
  }

  public async obterDRECompetencias(competencias: CompetenciaDRE[]): Promise<DadosDREPeriodo> {
    const ordenadas = normalizarCompetencias(competencias);
    if (ordenadas.length === 0) {
      return this.obterDREPeriodo({ ano: 2026, mes: 11 });
    }

    const consultas = agruparConsultasPorAno(ordenadas);
    if (consultas.length === 1) {
      const unico = await this.obterDREPeriodo(consultas[0]);
      return {
        ...unico,
        competenciaLabel: formatarRotuloCompetencias(ordenadas),
      };
    }

    const resultados = await Promise.all(consultas.map((c) => this.obterDREPeriodo(c)));

    const somar = (seletor: (r: DadosDREPeriodo) => Dinheiro) =>
      resultados.reduce((acc, item) => acc.somar(seletor(item)), Dinheiro.zero());

    const receitaVendasProdutos = somar((r) => r.receitaVendasProdutos);
    const receitaServicosOS = somar((r) => r.receitaServicosOS);
    const receitaBrutaTotal = somar((r) => r.receitaBrutaTotal);
    const deducoesDescontos = somar((r) => r.deducoesDescontos);
    const receitaLiquida = somar((r) => r.receitaLiquida);
    const cmvPecas = somar((r) => r.cmvPecas);
    const custoMaoObra = somar((r) => r.custoMaoObra);
    const custosDiretosTotal = somar((r) => r.custosDiretosTotal);
    const lucroBruto = somar((r) => r.lucroBruto);
    const despesasFixas = somar((r) => r.despesasFixas);
    const despesasVariaveis = somar((r) => r.despesasVariaveis);
    const despesasTotais = somar((r) => r.despesasTotais);
    const lucroLiquido = somar((r) => r.lucroLiquido);

    const recLiqVal = receitaLiquida.valor;
    const margemBrutaPercentual =
      recLiqVal > 0 ? Number(((lucroBruto.valor / recLiqVal) * 100).toFixed(2)) : 0;
    const margemLiquidaPercentual =
      recLiqVal > 0 ? Number(((lucroLiquido.valor / recLiqVal) * 100).toFixed(2)) : 0;

    const ultimo = ordenadas[ordenadas.length - 1];
    return {
      competenciaLabel: formatarRotuloCompetencias(ordenadas),
      ano: ultimo.ano,
      mes: "TODOS",
      origemDados: resultados[0]?.origemDados ?? "DEMO",
      receitaVendasProdutos,
      receitaServicosOS,
      receitaBrutaTotal,
      deducoesDescontos,
      receitaLiquida,
      cmvPecas,
      custoMaoObra,
      custosDiretosTotal,
      lucroBruto,
      margemBrutaPercentual,
      despesasFixas,
      despesasVariaveis,
      despesasTotais,
      lucroLiquido,
      margemLiquidaPercentual,
      quantidadeVendas: resultados.reduce((acc, r) => acc + r.quantidadeVendas, 0),
      quantidadeOS: resultados.reduce((acc, r) => acc + r.quantidadeOS, 0),
    };
  }

  public async obterResumoMensalAnos(
    anos: number[],
    resultado: FiltroResultadoDRE,
  ): Promise<ResumoMensalDREAnual> {
    const anosUnicos = Array.from(new Set(anos)).sort((a, b) => a - b);
    if (anosUnicos.length === 0) {
      return this.obterResumoMensalAnual({ ano: 2026, resultado });
    }
    if (anosUnicos.length === 1) {
      return this.obterResumoMensalAnual({ ano: anosUnicos[0], resultado });
    }

    const resumos = await Promise.all(
      anosUnicos.map((ano) => this.obterResumoMensalAnual({ ano, resultado })),
    );

    const meses = resumos
      .flatMap((r) => r.meses)
      .sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));

    const somaLucros = resumos.reduce((acc, r) => acc.somar(r.somaLucros), Dinheiro.zero());
    const somaPrejuizos = resumos.reduce((acc, r) => acc.somar(r.somaPrejuizos), Dinheiro.zero());
    const saldoLiquidoFiltrado = resumos.reduce(
      (acc, r) => acc.somar(r.saldoLiquidoFiltrado),
      Dinheiro.zero(),
    );

    return {
      ano: anosUnicos[anosUnicos.length - 1],
      filtroResultado: resultado,
      origemDados: resumos[0]?.origemDados ?? "DEMO",
      totalMesesFiltrados: meses.length,
      somaLucros,
      somaPrejuizos,
      saldoLiquidoFiltrado,
      meses,
    };
  }

  public async obterDetalhamentoCompetencias(
    competencias: CompetenciaDRE[],
  ): Promise<DetalhamentoDRE> {
    const ordenadas = normalizarCompetencias(competencias);
    const consultas = agruparConsultasPorAno(ordenadas);
    if (consultas.length === 1) {
      const unico = await this.obterDetalhamento(consultas[0]);
      return {
        ...unico,
        periodo: formatarRotuloCompetencias(ordenadas),
      };
    }

    const detalhes = await Promise.all(consultas.map((c) => this.obterDetalhamento(c)));
    const vendas = detalhes.flatMap((d) => d.vendas).sort((a, b) => b.data.getTime() - a.data.getTime());
    const ordensServico = detalhes
      .flatMap((d) => d.ordensServico)
      .sort((a, b) => b.data.getTime() - a.data.getTime());
    const despesas = detalhes.flatMap((d) => d.despesas).sort((a, b) => {
      const ta = a.dataPagamento?.getTime() ?? 0;
      const tb = b.dataPagamento?.getTime() ?? 0;
      return tb - ta;
    });

    return {
      periodo: formatarRotuloCompetencias(ordenadas),
      origemDados: detalhes[0]?.origemDados ?? "DEMO",
      totalVendas: detalhes.reduce((acc, d) => acc.somar(d.totalVendas), Dinheiro.zero()),
      totalOrdensServico: detalhes.reduce((acc, d) => acc.somar(d.totalOrdensServico), Dinheiro.zero()),
      totalDespesas: detalhes.reduce((acc, d) => acc.somar(d.totalDespesas), Dinheiro.zero()),
      vendas,
      ordensServico,
      despesas,
    };
  }

  public async obterDREDias(diasIso: string[]): Promise<DadosDREPeriodo> {
    const ordenados = normalizarDiasIso(diasIso);
    if (ordenados.length === 0) {
      return this.obterDREPeriodo({ ano: 2026, mes: 11 });
    }

    const rotulo = formatarRotuloDias(ordenados);
    const ultimo = decomporDataIso(ordenados[ordenados.length - 1]);

    if (this.authRepository.isModoApi()) {
      const intervalos = agruparDiasEmIntervalos(ordenados);
      const dtos = await Promise.all(
        intervalos.map(async ({ inicio, fim }) => {
          const search = new URLSearchParams({ data_inicio: inicio, data_fim: fim });
          const res = await fetch(`/api/v1/relatorios/dre?${search.toString()}`, {
            headers: this.criarHeaders(),
          });
          if (!res.ok) {
            throw new Error(`Falha ao consultar DRE por dias na API (HTTP ${res.status}).`);
          }
          return (await res.json()) as ApiRelatorioDRE;
        }),
      );

      const somar = (seletor: (d: ApiRelatorioDRE) => string) =>
        dtos.reduce((acc, item) => acc.somar(money(seletor(item))), Dinheiro.zero());

      const receitaVendasProdutos = somar((d) => d.receita_vendas_produtos);
      const receitaServicosOS = somar((d) => d.receita_servicos_os);
      const receitaBrutaTotal = somar((d) => d.receita_bruta_total);
      const deducoesDescontos = somar((d) => d.deducoes_descontos);
      const receitaLiquida = somar((d) => d.receita_liquida);
      const cmvPecas = somar((d) => d.custo_mercadorias_vendidas);
      const custoMaoObra = somar((d) => d.custo_mao_obra_direta);
      const custosDiretosTotal = somar((d) => d.custos_diretos_total);
      const lucroBruto = somar((d) => d.lucro_bruto);
      const despesasFixas = somar((d) => d.despesas_operacionais_fixas);
      const despesasVariaveis = somar((d) => d.despesas_variaveis);
      const despesasTotais = somar((d) => d.despesas_totais);
      const lucroLiquido = somar((d) => d.lucro_liquido);

      const recLiqVal = receitaLiquida.valor;
      return {
        competenciaLabel: rotulo,
        ano: ultimo.ano,
        mes: ultimo.mes,
        origemDados: "API",
        receitaVendasProdutos,
        receitaServicosOS,
        receitaBrutaTotal,
        deducoesDescontos,
        receitaLiquida,
        cmvPecas,
        custoMaoObra,
        custosDiretosTotal,
        lucroBruto,
        margemBrutaPercentual:
          recLiqVal > 0 ? Number(((lucroBruto.valor / recLiqVal) * 100).toFixed(2)) : 0,
        despesasFixas,
        despesasVariaveis,
        despesasTotais,
        lucroLiquido,
        margemLiquidaPercentual:
          recLiqVal > 0 ? Number(((lucroLiquido.valor / recLiqVal) * 100).toFixed(2)) : 0,
        quantidadeVendas: dtos.reduce((acc, d) => acc + d.quantidade_vendas, 0),
        quantidadeOS: dtos.reduce((acc, d) => acc + d.quantidade_os, 0),
      };
    }

    // Modo DEMO: soma exatamente os slices dos dias selecionados (incluindo dias espaçados ou entre meses)
    const cacheSlices = new Map<string, SliceDiarioDemo[]>();
    const acumulado: RegistroMensalSeed = {
      receitaVendasProdutos: 0,
      receitaServicosOS: 0,
      deducoesDescontos: 0,
      cmvPecas: 0,
      custoMaoObra: 0,
      despesasFixas: 0,
      despesasVariaveis: 0,
      quantidadeVendas: 0,
      quantidadeOS: 0,
    };

    for (const iso of ordenados) {
      const { ano, mes, dia } = decomporDataIso(iso);
      const chaveMes = `${ano}-${mes}`;
      let slices = cacheSlices.get(chaveMes);
      if (!slices) {
        const seed = REGISTROS_POR_ANO[ano]?.[mes] ?? REGISTROS_POR_ANO[2026][11];
        slices = gerarSlicesDiariosDemo(ano, mes, seed);
        cacheSlices.set(chaveMes, slices);
      }
      const s = slices[dia - 1];
      if (!s) continue;
      acumulado.receitaVendasProdutos += s.receitaVendasProdutos;
      acumulado.receitaServicosOS += s.receitaServicosOS;
      acumulado.deducoesDescontos += s.deducoesDescontos;
      acumulado.cmvPecas += s.cmvPecas;
      acumulado.custoMaoObra += s.custoMaoObra;
      acumulado.despesasFixas += s.despesasFixas;
      acumulado.despesasVariaveis += s.despesasVariaveis;
      acumulado.quantidadeVendas += s.quantidadeVendas;
      acumulado.quantidadeOS += s.quantidadeOS;
    }

    const calculado = calcularDadosDREDemo(ultimo.ano, ultimo.mes, acumulado);
    return {
      ...calculado,
      competenciaLabel: rotulo,
    };
  }

  public async obterDetalhamentoDias(diasIso: string[]): Promise<DetalhamentoDRE> {
    const ordenados = normalizarDiasIso(diasIso);
    const rotulo = formatarRotuloDias(ordenados);
    if (!this.authRepository.isModoApi() || ordenados.length === 0) {
      return {
        periodo: rotulo,
        origemDados: this.authRepository.isModoApi() ? "API" : "DEMO",
        totalVendas: Dinheiro.zero(),
        totalOrdensServico: Dinheiro.zero(),
        totalDespesas: Dinheiro.zero(),
        vendas: [],
        ordensServico: [],
        despesas: [],
      };
    }

    const intervalos = agruparDiasEmIntervalos(ordenados);
    const detalhes = await Promise.all(
      intervalos.map(async ({ inicio, fim }) => {
        const search = new URLSearchParams({ data_inicio: inicio, data_fim: fim });
        const res = await fetch(`/api/v1/relatorios/dre/detalhes?${search.toString()}`, {
          headers: this.criarHeaders(),
        });
        if (!res.ok) {
          throw new Error(`Falha ao consultar detalhamento por dias na API (HTTP ${res.status}).`);
        }
        return mapearDetalhamentoApi((await res.json()) as ApiDetalhamentoDRE);
      }),
    );

    return {
      periodo: rotulo,
      origemDados: "API",
      totalVendas: detalhes.reduce((acc, d) => acc.somar(d.totalVendas), Dinheiro.zero()),
      totalOrdensServico: detalhes.reduce((acc, d) => acc.somar(d.totalOrdensServico), Dinheiro.zero()),
      totalDespesas: detalhes.reduce((acc, d) => acc.somar(d.totalDespesas), Dinheiro.zero()),
      vendas: detalhes.flatMap((d) => d.vendas).sort((a, b) => b.data.getTime() - a.data.getTime()),
      ordensServico: detalhes
        .flatMap((d) => d.ordensServico)
        .sort((a, b) => b.data.getTime() - a.data.getTime()),
      despesas: detalhes.flatMap((d) => d.despesas).sort((a, b) => {
        const ta = a.dataPagamento?.getTime() ?? 0;
        const tb = b.dataPagamento?.getTime() ?? 0;
        return tb - ta;
      }),
    };
  }

  public async obterSerieDiaria({
    ano,
    mes,
    detalhamento,
    diasFiltrados,
  }: {
    ano: number;
    mes: number;
    detalhamento?: DetalhamentoDRE | null;
    diasFiltrados?: string[];
  }): Promise<SerieDiariaDRE> {
    const filtroSet =
      diasFiltrados && diasFiltrados.length > 0 ? new Set(normalizarDiasIso(diasFiltrados)) : null;

    if (this.authRepository.isModoApi()) {
      const fonte = detalhamento ?? (await this.obterDetalhamento({ ano, mes }));
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const receitaPorDia = new Array<number>(ultimoDia).fill(0);
      const custosPorDia = new Array<number>(ultimoDia).fill(0);
      const vendasPorDia = new Array<number>(ultimoDia).fill(0);
      const osPorDia = new Array<number>(ultimoDia).fill(0);

      for (const v of fonte.vendas) {
        if (v.data.getFullYear() === ano && v.data.getMonth() + 1 === mes) {
          const idx = v.data.getDate() - 1;
          if (idx >= 0 && idx < ultimoDia) {
            receitaPorDia[idx] += v.total.centavos;
            custosPorDia[idx] += v.custo.centavos;
            vendasPorDia[idx] += 1;
          }
        }
      }

      for (const o of fonte.ordensServico) {
        if (o.data.getFullYear() === ano && o.data.getMonth() + 1 === mes) {
          const idx = o.data.getDate() - 1;
          if (idx >= 0 && idx < ultimoDia) {
            receitaPorDia[idx] += o.total.centavos;
            custosPorDia[idx] +=
              o.custoPecas.centavos + Math.round(o.valorServicos.centavos * 0.4);
            osPorDia[idx] += 1;
          }
        }
      }

      for (const d of fonte.despesas) {
        if (!d.entraNoDRE || !d.dataPagamento) continue;
        if (d.dataPagamento.getFullYear() === ano && d.dataPagamento.getMonth() + 1 === mes) {
          const idx = d.dataPagamento.getDate() - 1;
          if (idx >= 0 && idx < ultimoDia) {
            custosPorDia[idx] += d.valor.centavos;
          }
        }
      }

      const dias: ResultadoDiarioDRE[] = [];
      for (let i = 0; i < ultimoDia; i += 1) {
        const dia = i + 1;
        const iso = criarDataIso(ano, mes, dia);
        if (filtroSet && !filtroSet.has(iso)) continue;
        const dt = new Date(ano, mes - 1, dia);
        const recCents = receitaPorDia[i];
        const custoCents = custosPorDia[i];
        dias.push({
          dataIso: iso,
          dia,
          mes,
          ano,
          diaSemana: DIAS_SEMANA_PT[dt.getDay()],
          rotuloCurto: String(dia).padStart(2, "0"),
          receitaTotal: new Dinheiro(recCents / 100, true),
          custosEDespesas: new Dinheiro(custoCents / 100, true),
          lucroLiquido: new Dinheiro((recCents - custoCents) / 100, true),
          quantidadeVendas: vendasPorDia[i],
          quantidadeOS: osPorDia[i],
        });
      }

      const resumo = resumirSerieDiaria(ano, mes, "API", dias);
      return filtroSet
        ? { ...resumo, competenciaLabel: formatarRotuloDias(diasFiltrados ?? []) }
        : resumo;
    }

    if (filtroSet) {
      const ordenados = normalizarDiasIso(diasFiltrados ?? []);
      const cache = new Map<string, SerieDiariaDRE>();
      const dias: ResultadoDiarioDRE[] = [];
      const mesesDistintos = new Set(ordenados.map((iso) => iso.slice(0, 7))).size > 1;

      for (const iso of ordenados) {
        const { ano: a, mes: m, dia: d } = decomporDataIso(iso);
        const chave = `${a}-${m}`;
        let serieMes = cache.get(chave);
        if (!serieMes) {
          const seed = REGISTROS_POR_ANO[a]?.[m] ?? REGISTROS_POR_ANO[2026][11];
          serieMes = gerarSerieDiariaDemo(a, m, seed);
          cache.set(chave, serieMes);
        }
        const item = serieMes.dias[d - 1];
        if (item) {
          dias.push(
            mesesDistintos
              ? { ...item, rotuloCurto: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}` }
              : item,
          );
        }
      }
      const resumo = resumirSerieDiaria(ano, mes, "DEMO", dias);
      return { ...resumo, competenciaLabel: formatarRotuloDias(ordenados) };
    }

    const seed = REGISTROS_POR_ANO[ano]?.[mes] ?? REGISTROS_POR_ANO[2026][11];
    return gerarSerieDiariaDemo(ano, mes, seed);
  }
}
