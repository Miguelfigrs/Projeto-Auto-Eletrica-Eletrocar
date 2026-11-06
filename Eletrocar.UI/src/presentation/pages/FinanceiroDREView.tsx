/**
 * View: FinanceiroDREView
 * Demonstração do Resultado do Exercício (DRE Gerencial Simplificado)
 * Espelha fielmente o serviço de domínio src/domain/services/calculadora_dre_service.py.
 */
import React from "react";
import { TrendingUp, DollarSign, PieChart, Calendar } from "lucide-react";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { Page, PageHeader, StatCard } from "../components/ui";
import { cn } from "../../lib/utils";

type LinhaTipo = "grupo" | "detalhe" | "subtotal" | "resultado";

const Linha: React.FC<{
  tipo: LinhaTipo;
  rotulo: React.ReactNode;
  valor: Dinheiro;
  negativo?: boolean;
  destaque?: "ok";
}> = ({ tipo, rotulo, valor, negativo, destaque }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-4 border-b border-line px-6",
      tipo === "grupo" && "py-3.5 text-sm font-semibold text-fg",
      tipo === "detalhe" && "py-2.5 pl-11 text-sm text-fg-muted",
      tipo === "subtotal" && "bg-surface-2 py-3.5 text-sm font-semibold text-fg",
      tipo === "resultado" && "brand-stripe border-b-0 bg-brand-soft py-5 text-base font-semibold text-fg",
      destaque === "ok" && "text-ok-text"
    )}
  >
    <span>{rotulo}</span>
    <span
      className={cn(
        "money shrink-0",
        negativo && "text-neg-text",
        tipo === "resultado" && "text-2xl"
      )}
    >
      {negativo ? "- " : ""}
      {valor.formatar()}
    </span>
  </div>
);

export const FinanceiroDREView: React.FC = () => {
  // Valores consolidados do período corrente (exemplo do mês corrente da oficina)
  const receitaProdutos = new Dinheiro(48950.0);
  const receitaServicosOS = new Dinheiro(36400.0);
  const receitaBrutaTotal = receitaProdutos.somar(receitaServicosOS);

  const deducoesDescontos = new Dinheiro(2150.0);
  const receitaLiquida = receitaBrutaTotal.subtrair(deducoesDescontos);

  const cmvPecas = new Dinheiro(29800.0);
  const custoMaoObra = new Dinheiro(12400.0);
  const custosDiretosTotal = cmvPecas.somar(custoMaoObra);

  const lucroBruto = receitaLiquida.subtrair(custosDiretosTotal);
  const margemBrutaPercentual = ((lucroBruto.valor / receitaLiquida.valor) * 100).toFixed(1);

  const despesasFixas = new Dinheiro(14200.0); // Aluguel, energia, internet, taxas
  const despesasVariaveis = new Dinheiro(4800.0); // Comissões, insumos oficina
  const despesasTotais = despesasFixas.somar(despesasVariaveis);

  const lucroLiquido = lucroBruto.subtrair(despesasTotais);
  const margemLiquidaPercentual = ((lucroLiquido.valor / receitaLiquida.valor) * 100).toFixed(1);

  // Composição da receita (barra proporcional)
  const pctProdutos = (receitaProdutos.valor / receitaBrutaTotal.valor) * 100;

  return (
    <Page className="max-w-[1280px]">
      <PageHeader
        title="Financeiro & DRE"
        description="Resultado do mês: receitas, custos de peças e mão de obra, despesas e lucro."
        actions={
          <span className="chip h-9 px-4 text-xs">
            <Calendar size={14} /> Competência: mês atual
          </span>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Receita líquida"
          value={receitaLiquida.formatar()}
          icon={DollarSign}
          hint="Peças de balcão + mão de obra"
        />
        <StatCard
          label="Lucro bruto"
          value={lucroBruto.formatar()}
          icon={TrendingUp}
          tone="ok"
          hint={`Margem bruta de ${margemBrutaPercentual}%`}
        />
        <StatCard
          label="Lucro líquido"
          value={lucroLiquido.formatar()}
          icon={PieChart}
          tone="brand"
          hint={`Margem líquida de ${margemLiquidaPercentual}%`}
        />
      </div>

      <div className="card mb-6 p-5">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-fg">Composição da receita bruta</span>
          <span className="money text-fg-muted">{receitaBrutaTotal.formatar()}</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full bg-brand" style={{ width: `${pctProdutos}%` }} />
          <div className="h-full bg-fg-subtle" style={{ width: `${100 - pctProdutos}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-muted">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Peças (balcão) {pctProdutos.toFixed(0)}%
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-fg-subtle" /> Serviços (OS) {(100 - pctProdutos).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="card-title">
            <PieChart size={18} className="text-brand" /> Demonstrativo de resultado
          </h3>
        </div>

        <Linha tipo="grupo" rotulo="(+) Receita operacional bruta" valor={receitaBrutaTotal} />
        <Linha tipo="detalhe" rotulo="Venda de peças e componentes (balcão)" valor={receitaProdutos} />
        <Linha tipo="detalhe" rotulo="Serviços e mão de obra (ordens de serviço)" valor={receitaServicosOS} />
        <Linha tipo="grupo" rotulo="(−) Deduções e descontos concedidos" valor={deducoesDescontos} negativo />
        <Linha tipo="subtotal" rotulo="(=) Receita operacional líquida" valor={receitaLiquida} />

        <Linha tipo="grupo" rotulo="(−) Custos dos serviços e mercadorias" valor={custosDiretosTotal} negativo />
        <Linha tipo="detalhe" rotulo="Custo das peças vendidas (CMV)" valor={cmvPecas} />
        <Linha tipo="detalhe" rotulo="Custo direto com eletricistas" valor={custoMaoObra} />
        <Linha
          tipo="subtotal"
          rotulo={`(=) Lucro bruto · margem ${margemBrutaPercentual}%`}
          valor={lucroBruto}
          destaque="ok"
        />

        <Linha tipo="grupo" rotulo="(−) Despesas operacionais" valor={despesasTotais} negativo />
        <Linha tipo="detalhe" rotulo="Fixas (aluguel, energia, internet, software)" valor={despesasFixas} />
        <Linha tipo="detalhe" rotulo="Variáveis (insumos, taxas de cartão/PIX)" valor={despesasVariaveis} />

        <Linha
          tipo="resultado"
          rotulo={`(=) Lucro líquido · margem ${margemLiquidaPercentual}%`}
          valor={lucroLiquido}
        />
      </div>
    </Page>
  );
};
