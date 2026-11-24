/**
 * Financeiro & DRE — Demonstrativo do Resultado do Exercício com filtros por mês, ano e lucros/prejuízos.
 */
import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  BookOpen,
  Filter,
  RotateCcw,
} from "lucide-react";
import type { FiltroResultadoDRE } from "../../application/ports/repositories/IRelatorioDRERepository";
import {
  ANOS_DISPONIVEIS_DRE,
  MESES_ABREV_PT_BR,
  MESES_PT_BR,
} from "../../adapters/repositories/MockOrHttpDRERepository";
import { useFinanceiroDRE } from "../../adapters/view-models/useFinanceiroDRE";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { Alerts, DidacticBanner, EmptyState, Page, PageHeader, StatCard } from "../components/ui";
import { cn } from "../../lib/utils";
import { DetalhamentoDREPanel } from "../components/DetalhamentoDREPanel";

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
    setAno,
    mes,
    setMes,
    filtroResultado,
    setFiltroResultado,
    drePeriodo,
    resumoMensal,
    detalhamento,
    erroDetalhamento,
    carregando,
    erro,
    recarregar,
    selecionarMesAno,
    irParaMesAtual,
  } = useFinanceiroDRE();

  const [exibirNotas, setExibirNotas] = useState(true);
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
    receitaBrutaNum > 0 ? ((lucroLiquido.valor / receitaBrutaNum) * 100).toFixed(1) : "0.0";

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

  return (
    <Page>
      <PageHeader
        eyebrow="Exclusivo Dono / Admin · F7"
        title="Financeiro & DRE"
        description="Resultado por competência: selecione mês, ano e filtre entre lucros e prejuízos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
              <span className="chip text-[0.7rem]">
                {drePeriodo.origemDados === "API" ? "API PostgreSQL" : "Base Demonstrativa"}
              </span>
            )}
          </div>
        }
      />

      <DidacticBanner
        visivel={modoDidatico}
        titulo="Como ler a DRE e comparar Lucros e Prejuízos"
        resumo="Faturamento não é lucro. Use os filtros de mês, ano e resultado abaixo para alternar entre visão mensal ou anual consolidada e isolar meses lucrativos de períodos com déficit."
        passos={[
          "1. Escolha Mês e Ano (ou 'Todos os meses' para o consolidado anual).",
          "2. Filtre por 'Somente Lucros' ou 'Somente Prejuízos' para auditar o comparativo mensal.",
          "3. Clique em qualquer mês no comparativo abaixo para inspecionar sua DRE detalhada.",
        ]}
        regraNegocio="Acesso restrito ao perfil Dono/Admin (RBAC) para proteger margens de lucro, CMV e despesas fixas."
      />

      <Alerts erro={erro} />

      {/* Barra de filtros: Mês, Ano e Lucros/Prejuízos */}
      <section
        className="card mb-6 p-4 sm:p-5"
        aria-label="Filtros da DRE por mês, ano e lucros ou prejuízos"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end lg:gap-4">
            <div className="min-w-[200px]">
              <label
                htmlFor="dre-mes"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted"
              >
                <Calendar size={13} className="text-brand-text" />
                Mês de competência
              </label>
              <select
                id="dre-mes"
                aria-label="Selecionar mês"
                value={mes === "TODOS" ? "TODOS" : String(mes)}
                onChange={(e) => {
                  const val = e.target.value;
                  setMes(val === "TODOS" ? "TODOS" : Number(val));
                }}
                className="input h-10 w-full cursor-pointer text-sm"
              >
                <option value="TODOS">Todos os meses (Anual)</option>
                {MESES_PT_BR.map((nome, idx) => (
                  <option key={nome} value={String(idx + 1)}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[130px]">
              <label
                htmlFor="dre-ano"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fg-muted"
              >
                Ano
              </label>
              <select
                id="dre-ano"
                aria-label="Selecionar ano"
                value={String(ano)}
                onChange={(e) => setAno(Number(e.target.value))}
                className="input h-10 w-full cursor-pointer text-sm"
              >
                {ANOS_DISPONIVEIS_DRE.map((anoItem) => (
                  <option key={anoItem} value={String(anoItem)}>
                    {anoItem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
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

              <button
                type="button"
                onClick={irParaMesAtual}
                className="btn btn-ghost btn-sm"
                title="Voltar para o mês e ano atuais"
              >
                <RotateCcw size={13} />
                Mês atual
              </button>

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

      {/* KPIs do período selecionado */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Receita líquida"
          value={carregando && !drePeriodo ? "..." : receitaLiquida.formatar()}
          hint={`${drePeriodo?.quantidadeVendas ?? 0} vendas balcão · ${drePeriodo?.quantidadeOS ?? 0} OS`}
          icon={DollarSign}
        />
        <StatCard
          label="Lucro bruto"
          value={carregando && !drePeriodo ? "..." : lucroBruto.formatar()}
          tone={lucroBruto.centavos < 0 ? "neg" : "ok"}
          hint={`Margem bruta de ${(drePeriodo?.margemBrutaPercentual ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
        />
        <StatCard
          label={ehPrejuizoPeriodo ? "Prejuízo líquido" : "Lucro líquido"}
          value={carregando && !drePeriodo ? "..." : lucroLiquido.formatar()}
          tone={ehPrejuizoPeriodo ? "neg" : "brand"}
          hint={
            ehPrejuizoPeriodo
              ? `Resultado deficitário (${(drePeriodo?.margemLiquidaPercentual ?? 0).toFixed(1)}%)`
              : `Margem líquida de ${(drePeriodo?.margemLiquidaPercentual ?? 0).toFixed(1)}%`
          }
          icon={ehPrejuizoPeriodo ? TrendingDown : PieChart}
        />
      </div>

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
              title={`Produtos: ${pctProdutos.toFixed(1)}%`}
            />
            <div
              className="bg-fg-muted/50"
              style={{ width: `${pctServicos}%` }}
              title={`Serviços OS: ${pctServicos.toFixed(1)}%`}
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
              {ehPrejuizoPeriodo ? `Déficit (${por100Liquido}%)` : `R$ ${por100Liquido} líquidos`}
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
              Comparativo mensal · {ano} ({tituloFiltroResultado})
            </h2>
            <p className="text-xs text-fg-muted">
              Clique em um mês para carregar o demonstrativo detalhado daquela competência.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">
              Meses exibidos: <strong className="text-fg">{resumoMensal?.totalMesesFiltrados ?? 0}</strong>
            </span>
            <span className="chip text-ok-text">
              Lucros no ano:{" "}
              <strong className="money">{(resumoMensal?.somaLucros ?? Dinheiro.zero()).formatar()}</strong>
            </span>
            <span className="chip text-neg-text">
              Prejuízos no ano:{" "}
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
            title={`Nenhum mês encontrado para "${tituloFiltroResultado}" em ${ano}`}
            description="Ajuste o filtro de Lucros e Prejuízos ou escolha outro ano para visualizar as competências."
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
              const selecionado = mes === item.mes;
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
                        "rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider",
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

                  <div className="mt-2 flex items-center justify-between text-[0.72rem] text-fg-muted">
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
            <span className="chip text-[0.68rem]">
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
