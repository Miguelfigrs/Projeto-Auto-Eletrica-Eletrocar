/**
 * Gráficos Financeiros da DRE:
 * - Alterna entre formato em Barras e em Curva (linha suave com área).
 * - Alterna entre Comparação entre Meses (totais + evolução mês a mês)
 *   e Análise Diária (quais dias do mês são mais lucrativos).
 * - Tooltip flutuante escuro no estilo painel de telemetria ao passar o mouse
 *   sobre qualquer barra ou ponto da curva, com linha tracejada de média.
 */
import React, { useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  Layers,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  CompetenciaDRE,
  ResumoMensalDREItem,
  SerieDiariaDRE,
} from "../../application/ports/repositories/IRelatorioDRERepository";
import {
  MESES_ABREV_PT_BR,
  chaveCompetencia,
} from "../../adapters/repositories/MockOrHttpDRERepository";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { cn } from "../../lib/utils";
import { formatarPercentual } from "../../lib/numeroBR";

type TipoGrafico = "BARRAS" | "CURVA";
type GranularidadeGrafico = "MESES" | "DIAS";
type MetricaGrafico = "LUCRO" | "COMPARATIVO" | "RECEITA";

interface PontoGrafico {
  id: string;
  rotuloEixo: string;
  rotuloTooltip: string;
  tituloCompleto: string;
  subtitulo?: string;
  receita: number;
  custos: number;
  lucro: number;
  quantidadeVendas: number;
  quantidadeOS: number;
  destaqueSelecionado?: boolean;
  onClick?: () => void;
}

interface GraficosFinanceirosDREProps {
  mesesResumo: ResumoMensalDREItem[];
  competenciasSelecionadas: CompetenciaDRE[];
  diasSelecionados?: string[];
  competenciaDiaria: CompetenciaDRE;
  serieDiaria: SerieDiariaDRE | null;
  onSelecionarMesDiario: (c: CompetenciaDRE) => void;
  onFocarMesComparativo?: (ano: number, mes: number) => void;
}

function formatarMoedaCurta(valor: number): string {
  const abs = Math.abs(valor);
  const sinal = valor < 0 ? "-" : "";
  const umaCasa = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (abs >= 1_000_000) return `${sinal}R$ ${umaCasa(abs / 1_000_000)} mi`;
  if (abs >= 1_000) return `${sinal}R$ ${umaCasa(abs / 1_000)} mil`;
  return `${sinal}R$ ${abs.toFixed(0)}`;
}

function formatarBRL(valor: number): string {
  return new Dinheiro(valor, true).formatar();
}

/** Gera curva suave (Catmull-Rom para cúbica de Bézier) entre pontos SVG. */
function gerarCaminhoCurva(pontos: Array<{ x: number; y: number }>): string {
  if (pontos.length === 0) return "";
  if (pontos.length === 1) return `M ${pontos[0].x} ${pontos[0].y}`;
  let d = `M ${pontos[0].x.toFixed(1)} ${pontos[0].y.toFixed(1)}`;
  for (let i = 0; i < pontos.length - 1; i += 1) {
    const p0 = pontos[Math.max(0, i - 1)];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[Math.min(pontos.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const GraficosFinanceirosDRE: React.FC<GraficosFinanceirosDREProps> = ({
  mesesResumo,
  competenciasSelecionadas,
  diasSelecionados = [],
  competenciaDiaria,
  serieDiaria,
  onSelecionarMesDiario,
  onFocarMesComparativo,
}) => {
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("BARRAS");
  const [granularidadeManual, setGranularidadeManual] = useState<GranularidadeGrafico | null>(null);
  const [metrica, setMetrica] = useState<MetricaGrafico>("LUCRO");
  const [indiceHover, setIndiceHover] = useState<number | null>(null);

  // Quando o usuário seleciona dias específicos no calendário, abre automaticamente na visão diária (a menos que alterne manualmente)
  const granularidade: GranularidadeGrafico =
    granularidadeManual ?? (diasSelecionados.length > 0 ? "DIAS" : "MESES");
  const setGranularidade = (g: GranularidadeGrafico) => setGranularidadeManual(g);

  const chavesSelecionadas = useMemo(
    () => new Set(competenciasSelecionadas.map((c) => chaveCompetencia(c))),
    [competenciasSelecionadas]
  );

  // Monta os pontos da série mensal
  const pontosMensais: PontoGrafico[] = useMemo(() => {
    const mesesBase =
      competenciasSelecionadas.length > 1
        ? mesesResumo.filter((m) => chavesSelecionadas.has(chaveCompetencia({ ano: m.ano, mes: m.mes })))
        : mesesResumo;

    const fonte = mesesBase.length > 0 ? mesesBase : mesesResumo;
    const variosAnos = new Set(fonte.map((m) => m.ano)).size > 1;

    return fonte.map((m) => {
      const abrev = MESES_ABREV_PT_BR[m.mes - 1] ?? String(m.mes);
      const custosTotais = m.custosDiretosTotal.valor + m.despesasTotais.valor;
      return {
        id: `${m.ano}-${m.mes}`,
        rotuloEixo: variosAnos ? `${abrev}/${String(m.ano).slice(-2)}` : abrev,
        rotuloTooltip: `${abrev}/${m.ano}`,
        tituloCompleto: `${abrev}/${m.ano}`,
        subtitulo: `${m.quantidadeVendas} vendas · ${m.quantidadeOS} OS`,
        receita: m.receitaLiquida.valor,
        custos: custosTotais,
        lucro: m.lucroLiquido.valor,
        quantidadeVendas: m.quantidadeVendas,
        quantidadeOS: m.quantidadeOS,
        destaqueSelecionado: chavesSelecionadas.has(chaveCompetencia({ ano: m.ano, mes: m.mes })),
        onClick: () => {
          onSelecionarMesDiario({ ano: m.ano, mes: m.mes });
          onFocarMesComparativo?.(m.ano, m.mes);
        },
      };
    });
  }, [
    mesesResumo,
    competenciasSelecionadas.length,
    chavesSelecionadas,
    onSelecionarMesDiario,
    onFocarMesComparativo,
  ]);

  const pontosDiarios: PontoGrafico[] = useMemo(() => {
    if (!serieDiaria) return [];
    return serieDiaria.dias.map((d) => ({
      id: d.dataIso,
      rotuloEixo: d.rotuloCurto,
      rotuloTooltip: `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")} · ${d.diaSemana}`,
      tituloCompleto: `Dia ${d.rotuloCurto}/${String(d.mes).padStart(2, "0")}/${d.ano} (${d.diaSemana})`,
      subtitulo: `${d.quantidadeVendas} vendas · ${d.quantidadeOS} OS`,
      receita: d.receitaTotal.valor,
      custos: d.custosEDespesas.valor,
      lucro: d.lucroLiquido.valor,
      quantidadeVendas: d.quantidadeVendas,
      quantidadeOS: d.quantidadeOS,
    }));
  }, [serieDiaria]);

  const pontos = granularidade === "MESES" ? pontosMensais : pontosDiarios;

  // Média da série principal (usada na linha tracejada de referência e classificação de cor das barras)
  const mediaPrincipal = useMemo(() => {
    if (pontos.length === 0) return 0;
    const soma = pontos.reduce(
      (acc, p) => acc + (metrica === "RECEITA" ? p.receita : p.lucro),
      0
    );
    return soma / pontos.length;
  }, [pontos, metrica]);

  // Ranking dos 3 dias mais lucrativos no modo diário
  const topDiasLucrativos = useMemo(() => {
    if (!serieDiaria) return [];
    return [...serieDiaria.dias]
      .sort((a, b) => b.lucroLiquido.centavos - a.lucroLiquido.centavos)
      .slice(0, 3);
  }, [serieDiaria]);

  // Comparativo automático entre os dois últimos meses visíveis
  const resumoComparativoMensal = useMemo(() => {
    if (pontosMensais.length === 0) return null;
    const totalReceita = pontosMensais.reduce((acc, p) => acc + p.receita, 0);
    const totalLucro = pontosMensais.reduce((acc, p) => acc + p.lucro, 0);
    const melhorMes = pontosMensais.reduce(
      (best, p) => (p.lucro > best.lucro ? p : best),
      pontosMensais[0]
    );
    // Compara o último mês que já começou com o anterior: um mês futuro (ainda zerado)
    // dava "-100%" e assustava quem lia o gráfico.
    const hoje = new Date();
    const chaveHoje = hoje.getFullYear() * 12 + hoje.getMonth();
    const jaComecaram = pontosMensais.filter((p) => {
      const [ano, mes] = p.id.split("-").map(Number);
      return ano * 12 + (mes - 1) <= chaveHoje;
    });
    const base = jaComecaram.length > 0 ? jaComecaram : pontosMensais;
    const atual = base[base.length - 1];
    const anterior = base.length >= 2 ? base[base.length - 2] : null;
    const variacaoValor = anterior ? atual.lucro - anterior.lucro : null;
    const variacaoPct =
      anterior && Math.abs(anterior.lucro) > 0.01
        ? ((atual.lucro - anterior.lucro) / Math.abs(anterior.lucro)) * 100
        : null;

    return {
      totalReceita,
      totalLucro,
      melhorMes,
      atual,
      anterior,
      variacaoValor,
      variacaoPct,
    };
  }, [pontosMensais]);

  // Geometria responsiva do SVG
  const svgW = 860;
  const svgH = 300;
  const padL = 68;
  const padR = 24;
  const padT = 24;
  const padB = 42;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const { minVal, maxVal, ticksY } = useMemo(() => {
    if (pontos.length === 0) {
      return { minVal: 0, maxVal: 100, ticksY: [0, 50, 100] };
    }

    const valores: number[] = [0, mediaPrincipal];
    for (const p of pontos) {
      if (metrica === "LUCRO") {
        valores.push(p.lucro);
      } else if (metrica === "RECEITA") {
        valores.push(p.receita);
      } else {
        valores.push(p.receita, p.custos, p.lucro);
      }
    }

    let min = Math.min(...valores, 0);
    let max = Math.max(...valores, 0);
    if (min === max) {
      max = min + 100;
    }
    const folga = (max - min) * 0.14;
    max += folga;
    if (min < 0) min -= folga;

    const passos = 4;
    const ticks: number[] = [];
    for (let i = 0; i <= passos; i += 1) {
      ticks.push(min + ((max - min) * i) / passos);
    }

    return { minVal: min, maxVal: max, ticksY: ticks };
  }, [pontos, metrica, mediaPrincipal]);

  const escalaY = (val: number) => {
    const span = maxVal - minVal || 1;
    return padT + ((maxVal - val) / span) * plotH;
  };

  const yZero = escalaY(0);
  const yMedia = escalaY(mediaPrincipal);
  const slotW = pontos.length > 0 ? plotW / pontos.length : plotW;
  const centroX = (idx: number) => padL + slotW * idx + slotW / 2;

  const indiceValidoHover =
    indiceHover !== null && indiceHover >= 0 && indiceHover < pontos.length ? indiceHover : null;
  const pontoHover = indiceValidoHover !== null ? pontos[indiceValidoHover] : null;
  const pontoAnteriorHover =
    indiceValidoHover !== null && indiceValidoHover > 0 ? pontos[indiceValidoHover - 1] : null;

  const pctMediaHover = useMemo(() => {
    if (!pontoHover || Math.abs(mediaPrincipal) < 0.01) return null;
    const val = metrica === "RECEITA" ? pontoHover.receita : pontoHover.lucro;
    return Math.round((val / Math.abs(mediaPrincipal)) * 100);
  }, [pontoHover, mediaPrincipal, metrica]);

  const deltaAnteriorHover =
    pontoHover && pontoAnteriorHover ? pontoHover.lucro - pontoAnteriorHover.lucro : null;

  // Curvas SVG (modo Curva)
  const pontosCurvaPrincipal = pontos.map((p, idx) => ({
    x: centroX(idx),
    y: escalaY(metrica === "RECEITA" ? p.receita : p.lucro),
  }));
  const pontosCurvaReceita = pontos.map((p, idx) => ({
    x: centroX(idx),
    y: escalaY(p.receita),
  }));
  const pontosCurvaCustos = pontos.map((p, idx) => ({
    x: centroX(idx),
    y: escalaY(p.custos),
  }));

  const pathCurvaPrincipal = gerarCaminhoCurva(pontosCurvaPrincipal);
  const pathAreaPrincipal =
    pontosCurvaPrincipal.length > 1
      ? `${pathCurvaPrincipal} L ${pontosCurvaPrincipal[pontosCurvaPrincipal.length - 1].x.toFixed(1)} ${yZero.toFixed(1)} L ${pontosCurvaPrincipal[0].x.toFixed(1)} ${yZero.toFixed(1)} Z`
      : "";

  // Posição flutuante do tooltip sobre o ponto/barra em hover (sempre dentro da área visível, sem cortar embaixo)
  const tooltipPos = (() => {
    if (indiceValidoHover === null || !pontoHover) return null;
    const xSvg = centroX(indiceValidoHover);
    const valorY = metrica === "RECEITA" ? pontoHover.receita : pontoHover.lucro;
    const ySvg = escalaY(valorY);
    const leftPct = (xSvg / svgW) * 100;
    const alinharEsquerda = leftPct > 56;
    const pontoNaMetadeInferior = ySvg > svgH * 0.48;
    const topPct = pontoNaMetadeInferior
      ? Math.max(6, Math.min(34, (ySvg / svgH) * 100 - 44))
      : Math.max(8, Math.min(36, (ySvg / svgH) * 100));
    return { leftPct, topPct, alinharEsquerda };
  })();

  const margemHover =
    pontoHover && pontoHover.receita > 0
      ? (pontoHover.lucro / pontoHover.receita) * 100
      : null;

  return (
    <section
      className="card mb-6 overflow-visible"
      aria-label="Análise gráfica financeira da DRE"
    >
      {/* Cabeçalho e Controles */}
      <div className="flex flex-col gap-3 rounded-t-2xl border-b border-line bg-surface-2/85 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-brand-line/60 bg-brand-soft text-brand-text">
              {tipoGrafico === "BARRAS" ? <BarChart3 size={15} /> : <Activity size={15} />}
            </span>
            <h2 className="text-sm font-semibold text-fg">
              Análise gráfica financeira ·{" "}
              {granularidade === "MESES"
                ? "Comparativo entre meses"
                : `Lucratividade por dia (${serieDiaria?.competenciaLabel ?? ""})`}
            </h2>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            {granularidade === "MESES"
              ? "Compare totais, receitas e lucros entre um mês e outro. Passe o mouse sobre o gráfico para inspecionar."
              : "Descubra quais dias do mês geram mais lucro líquido e passe o mouse para ver os detalhes de cada dia."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Granularidade: Meses vs Dias */}
          <div
            role="group"
            aria-label="Alternar visão entre meses e dias do mês"
            className="inline-flex rounded-xl border border-line bg-canvas p-1"
          >
            <button
              type="button"
              aria-pressed={granularidade === "MESES"}
              onClick={() => {
                setGranularidade("MESES");
                setIndiceHover(null);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                granularidade === "MESES"
                  ? "bg-brand text-brand-fg shadow-xs"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              <Layers size={13} />
              Comparar Meses
            </button>
            <button
              type="button"
              aria-pressed={granularidade === "DIAS"}
              onClick={() => {
                setGranularidade("DIAS");
                setIndiceHover(null);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                granularidade === "DIAS"
                  ? "bg-brand text-brand-fg shadow-xs"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              <CalendarDays size={13} />
              Dias do Mês
            </button>
          </div>

          {/* Tipo de Gráfico: Barras vs Curva */}
          <div
            role="group"
            aria-label="Tipo de gráfico: barras ou curva"
            className="inline-flex rounded-xl border border-line bg-canvas p-1"
          >
            <button
              type="button"
              aria-pressed={tipoGrafico === "BARRAS"}
              onClick={() => setTipoGrafico("BARRAS")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                tipoGrafico === "BARRAS"
                  ? "bg-surface-2 text-fg ring-1 ring-line-strong"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              <BarChart3 size={13} />
              Barras
            </button>
            <button
              type="button"
              aria-pressed={tipoGrafico === "CURVA"}
              onClick={() => setTipoGrafico("CURVA")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                tipoGrafico === "CURVA"
                  ? "bg-surface-2 text-fg ring-1 ring-line-strong"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              <Activity size={13} />
              Curva
            </button>
          </div>

          {/* Métrica */}
          <div
            role="group"
            aria-label="Métrica do gráfico"
            className="inline-flex rounded-xl border border-line bg-canvas p-1"
          >
            {(
              [
                { id: "LUCRO", label: "Lucro Líquido" },
                { id: "COMPARATIVO", label: "Receita × Custos" },
                { id: "RECEITA", label: "Total Receita" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={metrica === m.id}
                onClick={() => setMetrica(m.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
                  metrica === m.id
                    ? "bg-brand-soft text-brand-text ring-1 ring-brand-line/60"
                    : "text-fg-muted hover:text-fg"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Seletor rápido de mês quando estiver no modo "Dias do Mês" com múltiplos meses selecionados */}
      {granularidade === "DIAS" &&
        diasSelecionados.length === 0 &&
        competenciasSelecionadas.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas/50 px-5 py-2.5 text-xs">
            <span className="font-semibold text-fg-muted">Mês exibido nos dias:</span>
            {competenciasSelecionadas.slice(0, 12).map((c) => {
              const ativo = c.ano === competenciaDiaria.ano && c.mes === competenciaDiaria.mes;
              return (
                <button
                  key={chaveCompetencia(c)}
                  type="button"
                  onClick={() => onSelecionarMesDiario(c)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 font-semibold transition-all",
                    ativo
                      ? "border-brand-line bg-brand text-brand-fg"
                      : "border-line bg-surface-2 text-fg-muted hover:text-fg"
                  )}
                >
                  {MESES_ABREV_PT_BR[c.mes - 1]}/{c.ano}
                </button>
              );
            })}
          </div>
        )}

      {/* Faixa de KPIs Analíticos */}
      <div className="grid gap-3 border-b border-line bg-canvas/40 px-5 py-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {granularidade === "MESES" && resumoComparativoMensal ? (
          <>
            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Total Faturado ({pontosMensais.length}{" "}
                {pontosMensais.length === 1 ? "mês" : "meses"})
              </div>
              <div className="money mt-1 text-base font-bold text-fg">
                {formatarBRL(resumoComparativoMensal.totalReceita)}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Total Lucro / Prejuízo
              </div>
              <div
                className={cn(
                  "money mt-1 text-base font-bold",
                  resumoComparativoMensal.totalLucro < 0 ? "text-neg-text" : "text-ok-text"
                )}
              >
                {formatarBRL(resumoComparativoMensal.totalLucro)}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <Award size={12} className="text-ok-text" />
                Mês Mais Lucrativo
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-fg">
                  {resumoComparativoMensal.melhorMes.tituloCompleto}
                </span>
                <span className="money text-sm font-bold text-ok-text">
                  {formatarBRL(resumoComparativoMensal.melhorMes.lucro)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                {resumoComparativoMensal.anterior
                  ? `${resumoComparativoMensal.atual.tituloCompleto} vs ${resumoComparativoMensal.anterior.tituloCompleto}`
                  : "Comparação Mensal"}
              </div>
              {resumoComparativoMensal.variacaoValor !== null ? (
                <div
                  className={cn(
                    "money mt-1 flex items-center gap-1 text-sm font-bold",
                    resumoComparativoMensal.variacaoValor >= 0 ? "text-ok-text" : "text-neg-text"
                  )}
                >
                  {resumoComparativoMensal.variacaoValor >= 0 ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  {resumoComparativoMensal.variacaoValor >= 0 ? "+" : ""}
                  {formatarBRL(resumoComparativoMensal.variacaoValor)}
                  {resumoComparativoMensal.variacaoPct !== null && (
                    <span className="text-xs opacity-80">
                      ({resumoComparativoMensal.variacaoPct >= 0 ? "+" : ""}
                      {resumoComparativoMensal.variacaoPct.toFixed(0)}%)
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-xs text-fg-muted">
                  Selecione 2+ meses para comparar
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <Award size={12} className="text-ok-text" />
                Dia Mais Lucrativo
              </div>
              {serieDiaria?.melhorDia ? (
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-fg">
                    Dia {serieDiaria.melhorDia.rotuloCurto} ({serieDiaria.melhorDia.diaSemana})
                  </span>
                  <span className="money text-sm font-bold text-ok-text">
                    {serieDiaria.melhorDia.lucroLiquido.formatar()}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-fg-muted">Sem dados</div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Média Diária de Lucro
              </div>
              <div
                className={cn(
                  "money mt-1 text-base font-bold",
                  (serieDiaria?.mediaDiariaLucro.centavos ?? 0) < 0
                    ? "text-neg-text"
                    : "text-fg"
                )}
              >
                {(serieDiaria?.mediaDiariaLucro ?? Dinheiro.zero()).formatar()}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Dia de Maior Saída / Déficit
              </div>
              {serieDiaria?.piorDia ? (
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-fg">
                    Dia {serieDiaria.piorDia.rotuloCurto} ({serieDiaria.piorDia.diaSemana})
                  </span>
                  <span
                    className={cn(
                      "money text-sm font-bold",
                      serieDiaria.piorDia.lucroLiquido.centavos < 0
                        ? "text-neg-text"
                        : "text-fg-muted"
                    )}
                  >
                    {serieDiaria.piorDia.lucroLiquido.formatar()}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-fg-muted">Sem dados</div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface/80 px-3.5 py-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Top 3 Dias Mais Lucrativos
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {topDiasLucrativos.map((d, i) => (
                  <span
                    key={d.dataIso}
                    className="rounded-md border border-ok/30 bg-ok-soft px-1.5 py-0.5 font-semibold text-ok-text"
                  >
                    #{i + 1} Dia {d.rotuloCurto} ({d.diaSemana})
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Área do Gráfico SVG + Tooltip Flutuante */}
      <div className="p-4 sm:p-5">
        {pontos.length === 0 ? (
          <div className="py-12 text-center text-sm text-fg-muted">
            Sem dados disponíveis para os filtros selecionados.
          </div>
        ) : (
          <>
            <div
              className="relative w-full"
              onMouseLeave={() => setIndiceHover(null)}
            >
              <div className="w-full overflow-x-auto">
                <svg
                role="img"
                aria-label={
                  tipoGrafico === "BARRAS"
                    ? `Gráfico em barras de ${granularidade === "MESES" ? "comparação mensal" : "lucratividade diária"}`
                    : `Gráfico em curva de ${granularidade === "MESES" ? "comparação mensal" : "lucratividade diária"}`
                }
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="h-auto min-w-[560px] w-full select-none"
              >
                <defs>
                  <linearGradient id="dreAreaLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="dreAreaReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity="0.36" />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="dreBarraOk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <linearGradient id="dreBarraWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="dreBarraNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                  <linearGradient id="dreBarraBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#881337" />
                  </linearGradient>
                </defs>

                {/* Grade horizontal e rótulos eixo Y */}
                {ticksY.map((tick, idx) => {
                  const y = escalaY(tick);
                  return (
                    <g key={idx}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={svgW - padR}
                        y2={y}
                        stroke="rgba(148, 163, 184, 0.12)"
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="13"
                        fontFamily="monospace"
                      >
                        {formatarMoedaCurta(tick)}
                      </text>
                    </g>
                  );
                })}

                {/* Linha base Zero */}
                <line
                  x1={padL}
                  y1={yZero}
                  x2={svgW - padR}
                  y2={yZero}
                  stroke="rgba(226, 232, 240, 0.28)"
                  strokeWidth="1.2"
                />

                {/* Linha tracejada de Média do período (como nas referências) */}
                {metrica !== "COMPARATIVO" && pontos.length > 1 && (
                  <line
                    x1={padL}
                    y1={yMedia}
                    x2={svgW - padR}
                    y2={yMedia}
                    stroke="rgba(203, 213, 225, 0.45)"
                    strokeWidth="1.4"
                    strokeDasharray="5 5"
                  />
                )}

                {/* MODO BARRAS */}
                {tipoGrafico === "BARRAS" &&
                  pontos.map((p, idx) => {
                    const cx = centroX(idx);
                    const ativo = idx === indiceValidoHover;

                    if (metrica === "COMPARATIVO") {
                      const bw = Math.max(4, Math.min(18, (slotW * 0.72) / 3));
                      const yRec = escalaY(p.receita);
                      const yCus = escalaY(p.custos);
                      const yLuc = escalaY(p.lucro);

                      return (
                        <g
                          key={p.id}
                          data-testid={`grafico-ponto-${idx}`}
                          className="cursor-pointer"
                          onMouseEnter={() => setIndiceHover(idx)}
                          onClick={() => {
                            setIndiceHover(idx);
                            p.onClick?.();
                          }}
                        >
                          <rect
                            x={padL + slotW * idx}
                            y={padT}
                            width={slotW}
                            height={plotH}
                            rx="4"
                            fill={ativo ? "rgba(255, 255, 255, 0.06)" : "transparent"}
                          />
                          <rect
                            x={cx - bw * 1.55}
                            y={Math.min(yRec, yZero)}
                            width={bw}
                            height={Math.max(2, Math.abs(yZero - yRec))}
                            rx="4"
                            fill="url(#dreBarraBrand)"
                            opacity={ativo ? 1 : 0.88}
                          />
                          <rect
                            x={cx - bw * 0.5}
                            y={Math.min(yCus, yZero)}
                            width={bw}
                            height={Math.max(2, Math.abs(yZero - yCus))}
                            rx="4"
                            fill="#64748b"
                            opacity={ativo ? 1 : 0.82}
                          />
                          <rect
                            x={cx + bw * 0.55}
                            y={Math.min(yLuc, yZero)}
                            width={bw}
                            height={Math.max(2, Math.abs(yZero - yLuc))}
                            rx="4"
                            fill={p.lucro < 0 ? "url(#dreBarraNeg)" : "url(#dreBarraOk)"}
                            opacity={ativo ? 1 : 0.92}
                          />
                        </g>
                      );
                    }

                    const valor = metrica === "RECEITA" ? p.receita : p.lucro;
                    const yVal = escalaY(valor);
                    const largura = Math.max(8, Math.min(34, slotW * 0.62));
                    const topo = Math.min(yVal, yZero);
                    const altura = Math.max(3, Math.abs(yZero - yVal));

                    // Cor inteligente igual à referência: verde acima da média, âmbar abaixo da média, vermelho em prejuízo
                    const fill =
                      metrica === "RECEITA"
                        ? valor >= mediaPrincipal
                          ? "url(#dreBarraOk)"
                          : "url(#dreBarraWarn)"
                        : valor < 0
                        ? "url(#dreBarraNeg)"
                        : valor >= mediaPrincipal
                        ? "url(#dreBarraOk)"
                        : "url(#dreBarraWarn)";

                    return (
                      <g
                        key={p.id}
                        data-testid={`grafico-ponto-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setIndiceHover(idx)}
                        onClick={() => {
                          setIndiceHover(idx);
                          p.onClick?.();
                        }}
                      >
                        <rect
                          x={padL + slotW * idx}
                          y={padT}
                          width={slotW}
                          height={plotH}
                          rx="4"
                          fill={ativo ? "rgba(255, 255, 255, 0.065)" : "transparent"}
                        />
                        <rect
                          x={cx - largura / 2}
                          y={topo}
                          width={largura}
                          height={altura}
                          rx="5"
                          fill={fill}
                          opacity={ativo ? 1 : 0.92}
                        />
                      </g>
                    );
                  })}

                {/* MODO CURVA */}
                {tipoGrafico === "CURVA" && (
                  <g>
                    {metrica !== "COMPARATIVO" && pathAreaPrincipal && (
                      <path
                        d={pathAreaPrincipal}
                        fill={
                          metrica === "RECEITA" ? "url(#dreAreaReceita)" : "url(#dreAreaLucro)"
                        }
                      />
                    )}

                    {metrica === "COMPARATIVO" && (
                      <>
                        <path
                          d={gerarCaminhoCurva(pontosCurvaReceita)}
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                        <path
                          d={gerarCaminhoCurva(pontosCurvaCustos)}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.8"
                          strokeDasharray="5 4"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    <path
                      d={pathCurvaPrincipal}
                      fill="none"
                      stroke={metrica === "RECEITA" ? "#e11d48" : "#10b981"}
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />

                    {/* Feixe vertical suave + ponto luminoso no hover */}
                    {pontos.map((p, idx) => {
                      const pt = pontosCurvaPrincipal[idx];
                      const ativo = idx === indiceValidoHover;
                      const negativo = metrica !== "RECEITA" && p.lucro < 0;

                      return (
                        <g
                          key={p.id}
                          data-testid={`grafico-ponto-${idx}`}
                          className="cursor-pointer"
                          onMouseEnter={() => setIndiceHover(idx)}
                          onClick={() => {
                            setIndiceHover(idx);
                            p.onClick?.();
                          }}
                        >
                          <rect
                            x={padL + slotW * idx}
                            y={padT}
                            width={slotW}
                            height={plotH}
                            fill="transparent"
                          />
                          {ativo && (
                            <rect
                              x={pt.x - 4}
                              y={padT}
                              width={8}
                              height={plotH}
                              fill={
                                negativo
                                  ? "rgba(239, 68, 68, 0.16)"
                                  : metrica === "RECEITA"
                                  ? "rgba(225, 29, 72, 0.16)"
                                  : "rgba(16, 185, 129, 0.16)"
                              }
                            />
                          )}
                          {(ativo || pontos.length <= 16) && (
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={ativo ? 5.5 : 3}
                              fill={
                                negativo
                                  ? "#ef4444"
                                  : metrica === "RECEITA"
                                  ? "#e11d48"
                                  : "#10b981"
                              }
                              stroke={ativo ? "#0f172a" : "none"}
                              strokeWidth={ativo ? 2 : 0}
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Rótulos do Eixo X */}
                {pontos.map((p, idx) => {
                  const mostrarRotulo =
                    pontos.length <= 16 ||
                    idx === 0 ||
                    idx === pontos.length - 1 ||
                    idx === indiceValidoHover ||
                    idx % 2 === 0;
                  if (!mostrarRotulo) return null;

                  return (
                    <text
                      key={`lbl-${p.id}`}
                      x={centroX(idx)}
                      y={svgH - 14}
                      textAnchor="middle"
                      fill={idx === indiceValidoHover ? "#f8fafc" : "#94a3b8"}
                      fontSize={pontos.length > 18 ? "11.5" : "13"}
                      fontWeight={idx === indiceValidoHover ? "700" : "500"}
                    >
                      {p.rotuloEixo}
                    </text>
                  );
                })}
              </svg>
              </div>

              {/* Tooltip Flutuante Escuro (fora do overflow-x-auto para nunca ser cortado) */}
              {pontoHover && tooltipPos && (
                <div
                  role="tooltip"
                  aria-label={`Detalhes de ${pontoHover.rotuloTooltip}`}
                  style={{
                    left: `${tooltipPos.leftPct}%`,
                    top: `${tooltipPos.topPct}%`,
                  }}
                  className={cn(
                    "pointer-events-none absolute z-30 min-w-[255px] rounded-2xl border border-line-strong/90 bg-[#12151b]/96 px-4 py-3 shadow-2xl shadow-black/85 backdrop-blur-md transition-[left,top] duration-75",
                    tooltipPos.alinharEsquerda
                      ? "-translate-x-[calc(100%+14px)]"
                      : "translate-x-3.5"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="whitespace-nowrap font-mono text-sm font-bold tracking-tight text-amber-400">
                      {pontoHover.rotuloTooltip}
                    </span>
                    {pontoHover.subtitulo && (
                      <span className="whitespace-nowrap text-xs text-fg-subtle">
                        {pontoHover.subtitulo}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between gap-6">
                      <span className="whitespace-nowrap text-fg-muted">Receita</span>
                      <span className="money whitespace-nowrap font-bold text-fg">
                        {formatarBRL(pontoHover.receita)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                      <span className="whitespace-nowrap text-fg-muted">Custos + Desp.</span>
                      <span className="money whitespace-nowrap font-bold text-fg">
                        {formatarBRL(pontoHover.custos)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                      <span className="whitespace-nowrap text-fg-muted">
                        {pontoHover.lucro < 0 ? "Prejuízo" : "Lucro"}
                      </span>
                      <span
                        className={cn(
                          "money whitespace-nowrap font-bold",
                          pontoHover.lucro < 0 ? "text-red-400" : "text-emerald-400"
                        )}
                      >
                        {formatarBRL(pontoHover.lucro)}
                      </span>
                    </div>

                    {pctMediaHover !== null && (
                      <div className="mt-0.5 flex items-center justify-between gap-6 border-t border-white/10 pt-1.5">
                        <span className="whitespace-nowrap text-fg-muted">% da média</span>
                        <span
                          className={cn(
                            "money whitespace-nowrap font-bold",
                            pctMediaHover >= 100
                              ? "text-emerald-400"
                              : pctMediaHover < 0
                              ? "text-red-400"
                              : "text-amber-400"
                          )}
                        >
                          {pctMediaHover}%
                        </span>
                      </div>
                    )}

                    {margemHover !== null && (
                      <div className="flex items-center justify-between gap-6">
                        <span className="whitespace-nowrap text-fg-muted">Margem líquida</span>
                        <span
                          className={cn(
                            "money whitespace-nowrap font-semibold",
                            margemHover < 0 ? "text-red-400" : "text-emerald-400"
                          )}
                        >
                          {formatarPercentual(margemHover)}
                        </span>
                      </div>
                    )}

                    {deltaAnteriorHover !== null && (
                      <div className="flex items-center justify-between gap-6">
                        <span className="whitespace-nowrap text-fg-muted">vs anterior</span>
                        <span
                          className={cn(
                            "money whitespace-nowrap font-semibold",
                            deltaAnteriorHover >= 0 ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {deltaAnteriorHover >= 0 ? "+" : ""}
                          {formatarBRL(deltaAnteriorHover)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Legenda inferior */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
              <div className="flex flex-wrap items-center gap-4">
                {metrica === "COMPARATIVO" ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Receita Líquida
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" /> Custos + Despesas
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Lucro
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Prejuízo
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Acima da média
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Abaixo da média
                    </span>
                    {metrica === "LUCRO" && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Prejuízo
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 border-t-2 border-dashed border-slate-400" /> Média:{" "}
                      <strong className="money text-fg">{formatarBRL(mediaPrincipal)}</strong>
                    </span>
                  </>
                )}
              </div>

              <span className="text-xs text-fg-subtle">
                Passe o mouse sobre as {tipoGrafico === "BARRAS" ? "barras" : "curvas"} para
                abrir o cartão flutuante
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
