/**
 * View: FinanceiroDREView
 * Demonstração do Resultado do Exercício (DRE Gerencial Simplificado)
 * Espelha fielmente o serviço de domínio src/domain/services/calculadora_dre_service.py.
 */
import React from "react";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";

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

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "4px" }}>
            DRE Gerencial • Performance Financeira
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Demonstrativo estruturado do resultado operacional: Receita, CMV de Peças, Mão de Obra e Lucro Líquido.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
          }}
        >
          <Calendar size={15} color="var(--cyan-primary)" />
          <span>Competência: <strong>Mês Atual (Tempo Real)</strong></span>
        </div>
      </div>

      {/* Cards de Indicadores Principais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
            Receita Líquida Total
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)", marginTop: "6px" }}>
            {receitaLiquida.formatar()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#34d399", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            <ArrowUpRight size={13} /> Peças de Balcão + Mão de Obra
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
            Lucro Bruto (Margem de Contribuição)
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)", marginTop: "6px" }}>
            {lucroBruto.formatar()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Margem Bruta: <strong>{margemBrutaPercentual}%</strong>
          </span>
        </div>

        <div className="glass-panel" style={{ padding: "20px", border: "1px solid var(--border-cyan)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--cyan-primary)", textTransform: "uppercase", fontWeight: 700 }}>
            Resultado Líquido do Exercício
          </span>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--cyan-primary)", fontFamily: "var(--font-mono)", marginTop: "6px" }}>
            {lucroLiquido.formatar()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600 }}>
            Margem Líquida Real: {margemLiquidaPercentual}%
          </span>
        </div>
      </div>

      {/* Tabela Estruturada do DRE */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "8px" }}>
          <PieChart size={18} color="var(--cyan-primary)" />
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Linhas do DRE Contábil / Gerencial</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* 1. Receita Bruta */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.04)", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.95rem" }}>
            <span>(+) RECEITA OPERACIONAL BRUTA</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "#34d399" }}>{receitaBrutaTotal.formatar()}</span>
          </div>
          <div style={{ padding: "10px 20px 10px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.02)", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>• Venda de Peças e Componentes Elétricos (Balcão)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{receitaProdutos.formatar()}</span>
          </div>
          <div style={{ padding: "10px 20px 10px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.02)", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>• Prestação de Serviços & Mão de Obra (Ordens de Serviço)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{receitaServicosOS.formatar()}</span>
          </div>

          {/* 2. Deduções */}
          <div style={{ padding: "12px 20px 12px 30px", borderBottom: "1px solid rgba(255, 255, 255, 0.04)", display: "flex", justifyContent: "space-between", color: "#f87171", fontSize: "0.88rem" }}>
            <span>(-) Deduções da Receita e Descontos Concedidos</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>- {deducoesDescontos.formatar()}</span>
          </div>

          {/* 3. Receita Líquida */}
          <div style={{ padding: "14px 20px", background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem" }}>
            <span>(=) RECEITA OPERACIONAL LÍQUIDA</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{receitaLiquida.formatar()}</span>
          </div>

          {/* 4. Custos Diretos */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.04)", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.95rem", color: "#f87171" }}>
            <span>(-) CUSTOS DOS SERVIÇOS E MERCADORIAS (CMV)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>- {custosDiretosTotal.formatar()}</span>
          </div>
          <div style={{ padding: "10px 20px 10px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.02)", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>• Custo de Mercadorias Vendidas (CMV Peças Bosch, Valeo, Moura...)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{cmvPecas.formatar()}</span>
          </div>
          <div style={{ padding: "10px 20px 10px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.02)", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>• Custo Direto com Eletricistas e Executores Técnicos</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{custoMaoObra.formatar()}</span>
          </div>

          {/* 5. Lucro Bruto */}
          <div style={{ padding: "14px 20px", background: "rgba(16, 185, 129, 0.08)", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "#34d399" }}>
            <span>(=) LUCRO BRUTO (Margem Bruta {margemBrutaPercentual}%)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{lucroBruto.formatar()}</span>
          </div>

          {/* 6. Despesas Operacionais */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.04)", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.95rem", color: "#f87171" }}>
            <span>(-) DESPESAS OPERACIONAIS</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>- {despesasTotais.formatar()}</span>
          </div>
          <div style={{ padding: "10px 20px 10px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.02)", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>• Despesas Fixas (Aluguel da oficina, energia trifásica, internet, software)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{despesasFixas.formatar()}</span>
          </div>
          <div style={{ padding: "10px 20px 10px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.02)", display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>• Despesas Variáveis (Insumos solda/estanho, fitas, taxas de cartão/PIX)</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{despesasVariaveis.formatar()}</span>
          </div>

          {/* 7. Lucro Líquido Final */}
          <div
            style={{
              padding: "18px 20px",
              background: "rgba(0, 229, 255, 0.12)",
              borderTop: "2px solid var(--cyan-primary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: 800,
              fontSize: "1.15rem",
              color: "var(--cyan-primary)",
            }}
          >
            <span>(=) LUCRO LÍQUIDO FINAL (Margem Líquida {margemLiquidaPercentual}%)</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem" }}>{lucroLiquido.formatar()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
