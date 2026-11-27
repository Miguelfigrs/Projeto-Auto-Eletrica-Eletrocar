/**
 * Financeiro & DRE — Demonstrativo do Resultado do Exercício com calendário multi-mês/multi-ano,
 * filtros de lucros/prejuízos e gráficos analíticos em barras, curva e visão diária.
 */
import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  BookOpen,
  Filter,
  FileText,
  Loader2,
} from "lucide-react";
import type { FiltroResultadoDRE } from "../../application/ports/repositories/IRelatorioDRERepository";
import {
  MESES_ABREV_PT_BR,
  chaveCompetencia,
} from "../../adapters/repositories/MockOrHttpDRERepository";
import { useFinanceiroDRE } from "../../adapters/view-models/useFinanceiroDRE";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { Alerts, DidacticBanner, EmptyState, Page, PageHeader, StatCard } from "../components/ui";
import { cn } from "../../lib/utils";
import { formatarPercentual } from "../../lib/numeroBR";
import { DetalhamentoDREPanel } from "../components/DetalhamentoDREPanel";
import { SeletorPeriodoCalendario } from "../components/SeletorPeriodoCalendario";
import { GraficosFinanceirosDRE } from "../components/GraficosFinanceirosDRE";
import { imprimirDocumento, montarRelatorioMensalHtml } from "../relatorios/relatorioMensal";
import { container } from "../../infra/di/container";

interface LinhaDREProps {
  tipo: "grupo" | "detalhe" | "subtotal" | "resultado";
  rotulo: React.ReactNode;
  valor: Dinheiro;
  negativo?: boolean;
  destaque?: "ok" | "neg";
  dicaDidatica?: string;
  mostrarDica?: boolean;
}

const Linha: React.FC<LinhaDREProps> = ({
  tipo,
  rotulo,
  valor,
  negativo,
  destaque,
  dicaDidatica,
  mostrarDica,
}) => {
  const valorNegativoReal = valor.centavos < 0;
  const textoValor =
    negativo && valor.centavos > 0 ? `- ${valor.formatar()}` : valor.formatar();

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-5 py-3 text-sm last:border-b-0",
        tipo === "grupo" && "bg-surface-2/60 font-medium text-fg",
        tipo === "detalhe" && "pl-8 text-fg-muted",
        tipo === "subtotal" && "bg-surface-2/90 font-semibold text-fg",
        tipo === "resultado" &&
          (destaque === "neg"
            ? "bg-neg-soft font-semibold text-fg"
            : "bg-brand-soft font-semibold text-fg")
      )}
    >
      <div className="min-w-0">
        <div>{rotulo}</div>
        {mostrarDica && dicaDidatica && (
          <div className="mt-0.5 text-xs font-normal text-fg-muted">{dicaDidatica}</div>
        )}
      </div>
      <span
        className={cn(
          "money shrink-0 tabular-nums",
          (negativo || valorNegativoReal) && "text-neg-text",
          destaque === "ok" && !valorNegativoReal && "text-ok-text",
          destaque === "neg" && "text-neg-text font-bold"
        )}
      >
        {textoValor}
      </span>
    </div>
  );
};

interface FinanceiroDREViewProps {
  modoDidatico?: boolean;
}

const OPCOES_RESULTADO: Array<{
  valor: FiltroResultadoDRE;
  rotulo: string;
  descricao: string;
}> = [
  { valor: "TODOS", rotulo: "Todos", descricao: "Exibe receitas, custos, lucros e prejuízos" },
  { valor: "LUCROS", rotulo: "Somente Lucros", descricao: "Destaca entradas e meses positivos" },
  { valor: "PREJUIZOS", rotulo: "Somente Prejuízos", descricao: "Foca despesas, perdas e meses em déficit" },
];

export const FinanceiroDREView: React.FC<FinanceiroDREViewProps> = ({ modoDidatico = true }) => {
  const {
    ano,
    anosSelecionados,
    competenciasSelecionadas,
    diasSelecionados,
    competenciaDiaria,
    setCompetenciaDiaria,
    alternarDia,
    definirIntervaloDias,
    limparSelecaoDias,
    alternarMes,
    alternarAno,
    selecionarAnoInteiro,
    selecionarTodosAnos,
    selecionarUltimosMeses,
    filtroResultado,
    setFiltroResultado,
    drePeriodo,
    resumoMensal,
    detalhamento,
    serieDiaria,
    erroDetalhamento,
    carregando,
    erro,
    recarregar,
    selecionarMesAno,
    irParaMesAtual,
  } = useFinanceiroDRE();

  const [exibirNotas, setExibirNotas] = useState(true);

  const chavesSelecionadas = useMemo(
    () => new Set(competenciasSelecionadas.map((c) => chaveCompetencia(c))),
    [competenciasSelecionadas]
  );

  const gerarRelatorio = async () => {
    if (!drePeriodo) return;
    const usuario = await container.authRepository.obterUsuarioAtual().catch(() => null);
    imprimirDocumento(
      montarRelatorioMensalHtml({
        dre: drePeriodo,
        detalhamento,
        geradoEm: new Date(),
        geradoPor: usuario?.nome,
      })
    );
  };
  const mostrarDica = modoDidatico && exibirNotas;

  const receitaProdutos = drePeriodo?.receitaVendasProdutos ?? Dinheiro.zero();
  const receitaServicosOS = drePeriodo?.receitaServicosOS ?? Dinheiro.zero();
  const receitaBrutaTotal = drePeriodo?.receitaBrutaTotal ?? Dinheiro.zero();
  const deducoesDescontos = drePeriodo?.deducoesDescontos ?? Dinheiro.zero();
  const receitaLiquida = drePeriodo?.receitaLiquida ?? Dinheiro.zero();

  const cmvPecas = drePeriodo?.cmvPecas ?? Dinheiro.zero();
  const custoMaoObra = drePeriodo?.custoMaoObra ?? Dinheiro.zero();
  const lucroBruto = drePeriodo?.lucroBruto ?? Dinheiro.zero();

  const despesasFixas = drePeriodo?.despesasFixas ?? Dinheiro.zero();
  const despesasVariaveis = drePeriodo?.despesasVariaveis ?? Dinheiro.zero();
  const despesasTotais = drePeriodo?.despesasTotais ?? Dinheiro.zero();
  const lucroLiquido = drePeriodo?.lucroLiquido ?? Dinheiro.zero();

  const ehPrejuizoPeriodo = lucroLiquido.centavos < 0;
  const receitaBrutaNum = receitaBrutaTotal.valor;
  const pctProdutos =
    receitaBrutaNum > 0 ? Math.min(100, (receitaProdutos.valor / receitaBrutaNum) * 100) : 0;
  const pctServicos =
    receitaBrutaNum > 0 ? Math.min(100, (receitaServicosOS.valor / receitaBrutaNum) * 100) : 0;

  const pctCmv =
    receitaBrutaNum > 0 ? Math.max(0, Math.min(100, (cmvPecas.valor / receitaBrutaNum) * 100)) : 0;
  const pctMaoObra =
    receitaBrutaNum > 0 ? Math.max(0, Math.min(100, (custoMaoObra.valor / receitaBrutaNum) * 100)) : 0;
  const pctDespesas =
    receitaBrutaNum > 0 ? Math.max(0, Math.min(100, (despesasTotais.valor / receitaBrutaNum) * 100)) : 0;
  const pctLucro =
    receitaBrutaNum > 0
      ? Math.max(0, Math.min(100, (Math.max(0, lucroLiquido.valor) / receitaBrutaNum) * 100))
      : 0;

  const por100Liquido =
    (receitaBrutaNum > 0 ? (lucroLiquido.valor / receitaBrutaNum) * 100 : 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const periodoZeradoApi =
    drePeriodo?.origemDados === "API" &&
    receitaBrutaTotal.ehZero() &&
    despesasTotais.ehZero() &&
    lucroLiquido.ehZero();

  const mostrarEntradas = filtroResultado === "TODOS" || filtroResultado === "LUCROS";
  const mostrarSaidas = filtroResultado === "TODOS" || filtroResultado === "PREJUIZOS";

  const tituloFiltroResultado =
    filtroResultado === "LUCROS"
      ? "Somente Lucros"
      : filtroResultado === "PREJUIZOS"
      ? "Somente Prejuízos"
      : "Todos os resultados";

  const rotuloAnosComparativo =
    anosSelecionados.length > 1 ? anosSelecionados.join(" · ") : String(ano);

  return (
    <Page>
      <PageHeader
        eyebrow="Só para o dono · tecla F7"
        title="Financeiro & DRE"
        description="Resultado por competência: selecione um ou mais meses/anos no calendário, analise gráficos em barras ou curva e descubra os dias mais lucrativos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void gerarRelatorio()}
              disabled={!drePeriodo || carregando}
              className="btn btn-primary btn-sm"
              title="Gera o relatório de gastos e lucros da competência selecionada (imprimir ou salvar em PDF)"
            >
              <FileText size={15} /> Gerar relatório
            </button>
            <button
              type="button"
              onClick={() => setExibirNotas((v) => !v)}
              className={cn("btn btn-sm", exibirNotas ? "btn-primary" : "btn-ghost")}
            >
              <BookOpen size={15} />
              {exibirNotas ? "Ocultar notas contábeis" : "Explicar cada linha"}
            </button>
            <div className="chip" aria-label="Competência selecionada">
              <Calendar size={13} className="text-brand-text" />
              <span>{drePeriodo?.competenciaLabel ?? `Competência ${ano}`}</span>
            </div>
            {drePeriodo && (
              <span className="chip text-xs">
                {drePeriodo.origemDados === "API" ? "Dados reais" : "Dados de demonstração"}
              </span>
            )}
          </div>
        }
      />

      <DidacticBanner
        visivel={modoDidatico}
        titulo="Como ler o resultado do mês (DRE)"
        resumo="Vender muito não é o mesmo que lucrar. Aqui você vê quanto entrou, quanto custaram as peças e as despesas, e quanto sobrou de lucro."
        passos={[
          "Escolha o mês no calendário. Dá para marcar vários meses ou o ano inteiro.",
          "Nos gráficos, compare os meses ou veja os dias do mês que deram mais lucro.",
          "Use 'Somente Lucros' ou 'Somente Prejuízos' para achar rápido os meses bons e ruins.",
        ]}
        regraNegocio="Só o dono vê esta tela, porque ela mostra custos e lucro da oficina."
      />

      <Alerts erro={erro} />

      {/* Barra moderna de filtros: Calendário Multi-Mês/Multi-Ano + Lucros/Prejuízos */}
      <section
        className="card mb-6 p-4 sm:p-5"
        aria-label="Filtros da DRE por calendário de meses, anos e lucros ou prejuízos"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SeletorPeriodoCalendario
            competenciasSelecionadas={competenciasSelecionadas}
            diasSelecionados={diasSelecionados}
            resumoMesesDisponiveis={resumoMensal?.meses}
            onAlternarDia={alternarDia}
            onDefinirIntervaloDias={definirIntervaloDias}
            onLimparSelecaoDias={limparSelecaoDias}
            onAlternarMes={alternarMes}
            onAlternarAno={alternarAno}
            onSelecionarAnoInteiro={selecionarAnoInteiro}
            onSelecionarUltimosMeses={selecionarUltimosMeses}
            onSelecionarTodosAnos={selecionarTodosAnos}
            onIrParaMesAtual={irParaMesAtual}
          />

          <div className="flex flex-col gap-2 xl:items-end">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <Filter size={13} className="text-brand-text" />
              Filtro de Lucros e Prejuízos
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Filtro de lucros e prejuízos"
                className="inline-flex flex-wrap rounded-xl border border-line bg-surface-2 p-1"
              >
                {OPCOES_RESULTADO.map((op) => {
                  const ativo = filtroResultado === op.valor;
                  return (
                    <button
                      key={op.valor}
                      type="button"
                      title={op.descricao}
                      aria-pressed={ativo}
                      onClick={() => setFiltroResultado(op.valor)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                        ativo && op.valor === "TODOS" && "bg-brand text-brand-fg shadow-sm",
                        ativo &&
                          op.valor === "LUCROS" &&
                          "bg-ok/20 text-ok-text ring-1 ring-ok/40",
                        ativo &&
                          op.valor === "PREJUIZOS" &&
                          "bg-neg/25 text-neg-text ring-1 ring-neg/40",
                        !ativo && "text-fg-muted hover:text-fg"
                      )}
                    >
                      {op.rotulo}
                    </button>
                  );
                })}
              </div>

              {periodoZeradoApi && (
                <button
                  type="button"
                  onClick={() => selecionarMesAno(10, 2026)}
                  className="btn btn-outline btn-sm"
                >
                  Ir para Out/2026 (dados seed)
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Aviso de carregamento: no servidor de produção os números levam alguns segundos e,
          sem isso, a tela mostrava R$ 0,00 / 0,0% como se o mês tivesse sido zerado. */}
      {carregando && (
        <div className="alert alert-warn mb-5" role="status" aria-live="polite">
          <Loader2 size={22} className="shrink-0 animate-spin" />
          <span>Carregando os números do período... isso pode levar alguns segundos.</span>
        </div>
      )}

      {/* KPIs do período selecionado */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Receita líquida"
          value={carregando && !drePeriodo ? "..." : receitaLiquida.formatar()}
          hint={
            carregando && !drePeriodo
              ? "Carregando..."
              : `${drePeriodo?.quantidadeVendas ?? 0} vendas balcão · ${drePeriodo?.quantidadeOS ?? 0} OS`
          }
          icon={DollarSign}
        />
        <StatCard
          label="Lucro bruto"
          value={carregando && !drePeriodo ? "..." : lucroBruto.formatar()}
          tone={lucroBruto.centavos < 0 ? "neg" : "ok"}
          hint={
            carregando && !drePeriodo
              ? "Carregando..."
              : `Margem bruta de ${formatarPercentual(drePeriodo?.margemBrutaPercentual ?? 0)}`
          }
          icon={TrendingUp}
        />
        <StatCard
          label={ehPrejuizoPeriodo ? "Prejuízo líquido" : "Lucro líquido"}
          value={carregando && !drePeriodo ? "..." : lucroLiquido.formatar()}
          tone={ehPrejuizoPeriodo ? "neg" : "brand"}
          hint={
            carregando && !drePeriodo
              ? "Carregando..."
              : ehPrejuizoPeriodo
              ? `Resultado deficitário (${formatarPercentual(drePeriodo?.margemLiquidaPercentual ?? 0)})`
              : `Margem líquida de ${formatarPercentual(drePeriodo?.margemLiquidaPercentual ?? 0)}`
          }
          icon={ehPrejuizoPeriodo ? TrendingDown : PieChart}
        />
      </div>

      {/* Gráficos Analíticos: Barras / Curva · Comparação Mensal · Dias Mais Lucrativos */}
      <GraficosFinanceirosDRE
        mesesResumo={resumoMensal?.meses ?? []}
        competenciasSelecionadas={competenciasSelecionadas}
        diasSelecionados={diasSelecionados}
        competenciaDiaria={competenciaDiaria}
        serieDiaria={serieDiaria}
        onSelecionarMesDiario={setCompetenciaDiaria}
        onFocarMesComparativo={(anoClicado, mesClicado) => selecionarMesAno(mesClicado, anoClicado)}
      />

      {/* Gráficos de composição */}
      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Composição da receita bruta</h2>
            <span className="money text-sm text-fg-muted">{receitaBrutaTotal.formatar()}</span>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2">
            <div
              className="bg-brand"
              style={{ width: `${pctProdutos}%` }}
              title={`Produtos: ${formatarPercentual(pctProdutos)}`}
            />
            <div
              className="bg-fg-muted/50"
              style={{ width: `${pctServicos}%` }}
              title={`Serviços OS: ${formatarPercentual(pctServicos)}`}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-fg-muted">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
              Peças de balcão:{" "}
              <strong className="money text-fg">{receitaProdutos.formatar()}</strong> (
              {pctProdutos.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-fg-muted/50" />
              Serviços de OS:{" "}
              <strong className="money text-fg">{receitaServicosOS.formatar()}</strong> (
              {pctServicos.toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Cascata: de cada R$ 100 faturados</h2>
            <span
              className={cn(
                "money text-sm font-semibold",
                ehPrejuizoPeriodo ? "text-neg-text" : "text-ok-text"
              )}
            >
              {ehPrejuizoPeriodo ? `Déficit (${por100Liquido}%)` : `R$ ${por100Liquido} de lucro`}
            </span>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2">
            <div className="bg-neg/80" style={{ width: `${pctCmv}%` }} />
            <div className="bg-warn/80" style={{ width: `${pctMaoObra}%` }} />
            <div className="bg-fg-subtle" style={{ width: `${pctDespesas}%` }} />
            <div className="bg-ok" style={{ width: `${pctLucro}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-neg/80" /> CMV ({pctCmv.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-warn/80" /> Mão de obra (
              {pctMaoObra.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-fg-subtle" /> Despesas (
              {pctDespesas.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-sm",
                  ehPrejuizoPeriodo ? "bg-neg" : "bg-ok"
                )}
              />{" "}
              {ehPrejuizoPeriodo ? "Prejuízo" : `Lucro (${pctLucro.toFixed(0)}%)`}
            </span>
          </div>
        </div>
      </div>

      {/* Comparativo Mensal filtrado por Lucros / Prejuízos */}
      <div className="card mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/80 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Comparativo mensal · {rotuloAnosComparativo} ({tituloFiltroResultado})
            </h2>
            <p className="text-xs text-fg-muted">
              Clique em um mês para carregar sua DRE detalhada e análise diária.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">
              Meses exibidos: <strong className="text-fg">{resumoMensal?.totalMesesFiltrados ?? 0}</strong>
            </span>
            <span className="chip text-ok-text">
              Lucros:{" "}
              <strong className="money">{(resumoMensal?.somaLucros ?? Dinheiro.zero()).formatar()}</strong>
            </span>
            <span className="chip text-neg-text">
              Prejuízos:{" "}
              <strong className="money">
                {(resumoMensal?.somaPrejuizos ?? Dinheiro.zero()).ehZero()
                  ? Dinheiro.zero().formatar()
                  : `- ${(resumoMensal?.somaPrejuizos ?? Dinheiro.zero()).formatar()}`}
              </strong>
            </span>
            <span
              className={cn(
                "chip font-semibold",
                (resumoMensal?.saldoLiquidoFiltrado.centavos ?? 0) < 0
                  ? "text-neg-text"
                  : "text-ok-text"
              )}
            >
              Saldo filtrado:{" "}
              <strong className="money">
                {(resumoMensal?.saldoLiquidoFiltrado ?? Dinheiro.zero()).formatar()}
              </strong>
            </span>
          </div>
        </div>

        {!resumoMensal || resumoMensal.meses.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={`Nenhum mês encontrado para "${tituloFiltroResultado}" em ${rotuloAnosComparativo}`}
            description="Ajuste o filtro de Lucros e Prejuízos ou selecione outro período no calendário."
            action={
              <button
                type="button"
                onClick={() => setFiltroResultado("TODOS")}
                className="btn btn-outline btn-sm"
              >
                Exibir todos os meses
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resumoMensal.meses.map((item) => {
              const selecionado = chavesSelecionadas.has(
                chaveCompetencia({ ano: item.ano, mes: item.mes })
              );
              const abrev = MESES_ABREV_PT_BR[item.mes - 1] ?? item.competencia;
              return (
                <button
                  key={item.competencia}
                  type="button"
                  onClick={() => selecionarMesAno(item.mes, item.ano)}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                    selecionado
                      ? "border-brand-line bg-brand-soft shadow-sm"
                      : "border-line bg-surface-2/50 hover:border-line-strong hover:bg-surface-2"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-fg">
                      {abrev}/{item.ano}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                        item.ehLucro && "bg-ok/20 text-ok-text",
                        item.ehPrejuizo && "bg-neg/20 text-neg-text",
                        !item.ehLucro && !item.ehPrejuizo && "bg-surface text-fg-muted"
                      )}
                    >
                      {item.ehLucro ? "Lucro" : item.ehPrejuizo ? "Prejuízo" : "Neutro"}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "money mt-2 text-lg font-bold",
                      item.ehPrejuizo
                        ? "text-neg-text"
                        : item.ehLucro
                        ? "text-ok-text"
                        : "text-fg-muted"
                    )}
                  >
                    {item.lucroLiquido.formatar()}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-fg-muted">
                    <span>Rec: {item.receitaLiquida.formatar()}</span>
                    <span>Desp: {item.despesasTotais.formatar()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Demonstrativo completo */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2/80 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">Demonstrativo de resultado</h2>
            <span className="chip text-xs">
              {drePeriodo?.competenciaLabel ?? `${ano}`} · {tituloFiltroResultado}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">
              Receita − Custos − Despesas = Lucro ou Prejuízo líquido
            </span>
            <button
              type="button"
              onClick={() => void recarregar()}
              className="btn btn-ghost btn-sm"
              disabled={carregando}
            >
              Atualizar
            </button>
          </div>
        </div>

        {mostrarEntradas && (
          <>
            <Linha
              tipo="grupo"
              rotulo="Receita bruta de vendas"
              valor={receitaProdutos}
              mostrarDica={mostrarDica}
              dicaDidatica="Tudo o que foi vendido no balcão (PDV) antes de descontos."
            />
            <Linha
              tipo="detalhe"
              rotulo="Receita de serviços (OS)"
              valor={receitaServicosOS}
              mostrarDica={mostrarDica}
              dicaDidatica="Peças e mão de obra faturadas nas Ordens de Serviço finalizadas."
            />
          </>
        )}

        {mostrarSaidas && (
          <Linha
            tipo="detalhe"
            rotulo="(-) Deduções e descontos"
            valor={deducoesDescontos}
            negativo
            mostrarDica={mostrarDica}
            dicaDidatica="Descontos comerciais concedidos dentro da alçada."
          />
        )}

        {mostrarEntradas && (
          <Linha
            tipo="subtotal"
            rotulo="(=) Receita operacional líquida"
            valor={receitaLiquida}
            mostrarDica={mostrarDica}
            dicaDidatica="Valor real que entrou no caixa após abater os descontos."
          />
        )}

        {mostrarSaidas && (
          <>
            <Linha
              tipo="detalhe"
              rotulo="(-) Custo das mercadorias vendidas (CMV)"
              valor={cmvPecas}
              negativo
              mostrarDica={mostrarDica}
              dicaDidatica="Quanto a Eletrocar pagou para comprar as peças que foram vendidas."
            />
            <Linha
              tipo="detalhe"
              rotulo="(-) Mão de obra direta"
              valor={custoMaoObra}
              negativo
              mostrarDica={mostrarDica}
              dicaDidatica="Comissões e custo direto da hora trabalhada pelos eletricistas."
            />
          </>
        )}

        {mostrarEntradas && (
          <Linha
            tipo="subtotal"
            rotulo="(=) Lucro bruto"
            valor={lucroBruto}
            mostrarDica={mostrarDica}
            dicaDidatica="Quanto sobrou depois de pagar as peças e a execução dos serviços."
          />
        )}

        {mostrarSaidas && (
          <>
            <Linha
              tipo="detalhe"
              rotulo="(-) Despesas operacionais fixas (aluguel, energia, salários)"
              valor={despesasFixas}
              negativo
            />
            <Linha
              tipo="detalhe"
              rotulo="(-) Despesas variáveis (taxas de cartão, frete)"
              valor={despesasVariaveis}
              negativo
            />
          </>
        )}

        {(filtroResultado === "TODOS" ||
          (filtroResultado === "LUCROS" && !ehPrejuizoPeriodo) ||
          (filtroResultado === "PREJUIZOS" && ehPrejuizoPeriodo)) && (
          <Linha
            tipo="resultado"
            rotulo={
              ehPrejuizoPeriodo
                ? "(=) Prejuízo líquido do período"
                : "(=) Lucro líquido do período"
            }
            valor={lucroLiquido}
            destaque={ehPrejuizoPeriodo ? "neg" : "ok"}
            mostrarDica={mostrarDica}
            dicaDidatica={
              ehPrejuizoPeriodo
                ? "Os custos e despesas superaram a receita operacional líquida no período selecionado."
                : "Resultado final que fica livre para o dono ou reinvestimento na oficina."
            }
          />
        )}

        {filtroResultado === "LUCROS" && ehPrejuizoPeriodo && (
          <div className="border-t border-line bg-neg-soft/60 px-5 py-3 text-xs text-neg-text">
            Atenção: a competência selecionada ({drePeriodo?.competenciaLabel}) fechou em prejuízo de{" "}
            <strong className="money">{lucroLiquido.formatar()}</strong>.
          </div>
        )}

        {filtroResultado === "PREJUIZOS" && !ehPrejuizoPeriodo && (
          <div className="border-t border-line bg-ok-soft/60 px-5 py-3 text-xs text-ok-text">
            Esta competência ({drePeriodo?.competenciaLabel}) não teve prejuízo líquido — fechou com{" "}
            <strong className="money">{lucroLiquido.formatar()}</strong> positivos após custos e despesas.
          </div>
        )}
      </div>

      <div className="mt-6">
        <DetalhamentoDREPanel detalhamento={detalhamento} erro={erroDetalhamento} carregando={carregando} />
      </div>
    </Page>
  );
};
