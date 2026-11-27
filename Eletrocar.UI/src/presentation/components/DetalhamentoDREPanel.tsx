/**
 * Detalhamento da DRE: cada venda, OS entregue e despesa paga que compõe o resultado do período,
 * com os itens de cada lançamento ao expandir a linha.
 */
import React, { useState } from "react";
import { ChevronDown, ChevronRight, ReceiptText, ShoppingCart, Wrench, Wallet } from "lucide-react";
import type {
  DetalhamentoDRE,
  ItemLancamentoDRE,
} from "../../application/ports/repositories/IRelatorioDRERepository";
import { EmptyState } from "./ui";
import { cn } from "../../lib/utils";

type Aba = "vendas" | "os" | "despesas";

export const ROTULO_FORMA_PAGAMENTO: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
  BOLETO: "Boleto",
  FATURADO: "Faturado (a prazo)",
};

const ROTULO_CATEGORIA: Record<string, string> = {
  DESPESA_FIXA: "Despesa fixa",
  DESPESA_VARIAVEL: "Despesa variável",
  COMPRA_MERCADORIA: "Compra de mercadoria",
  OUTROS: "Outros",
};

export function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarData(data: Date | null): string {
  return data ? data.toLocaleDateString("pt-BR") : "—";
}

const forma = (valor: string | null) => (valor ? ROTULO_FORMA_PAGAMENTO[valor] ?? valor : "—");

const TabelaItens: React.FC<{ itens: ItemLancamentoDRE[]; titulo?: string }> = ({ itens, titulo = "Peças" }) =>
  itens.length === 0 ? null : (
    <div>
      <div className="eyebrow mb-1.5">{titulo}</div>
      <table className="w-full text-xs">
        <thead className="text-left text-fg-subtle">
          <tr>
            <th className="py-1 font-medium">Descrição</th>
            <th className="py-1 text-right font-medium">Qtd</th>
            <th className="py-1 text-right font-medium">Preço un.</th>
            <th className="py-1 text-right font-medium">Custo un.</th>
            <th className="py-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, idx) => (
            <tr key={idx} className="border-t border-line/60 text-fg-muted">
              <td className="py-1.5 pr-2 text-fg">{item.descricao}</td>
              <td className="py-1.5 text-right">{item.quantidade}</td>
              <td className="money py-1.5 text-right">{item.precoUnitario.formatar()}</td>
              <td className="money py-1.5 text-right">{item.custoUnitario.formatar()}</td>
              <td className="money py-1.5 text-right text-fg">{item.total.formatar()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

const LinhaExpansivel: React.FC<{
  aberta: boolean;
  onAlternar: () => void;
  colunas: React.ReactNode[];
  children: React.ReactNode;
}> = ({ aberta, onAlternar, colunas, children }) => (
  <>
    <tr
      className="cursor-pointer border-t border-line hover:bg-surface-2/60"
      onClick={onAlternar}
      aria-expanded={aberta}
    >
      <td className="w-8 py-3 pl-4 text-fg-subtle">
        {aberta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </td>
      {colunas.map((c, i) => (
        <td key={i} className={cn("py-3 pr-4", i >= colunas.length - 2 && "text-right")}>
          {c}
        </td>
      ))}
    </tr>
    {aberta && (
      <tr className="bg-canvas/60">
        <td />
        <td colSpan={colunas.length} className="px-0 pb-4 pr-4 pt-1">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">{children}</div>
        </td>
      </tr>
    )}
  </>
);

export const DetalhamentoDREPanel: React.FC<{
  detalhamento: DetalhamentoDRE | null;
  erro?: string | null;
  carregando?: boolean;
}> = ({ detalhamento, erro, carregando }) => {
  const [aba, setAba] = useState<Aba>("vendas");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const alternar = (id: string) =>
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const vendas = detalhamento?.vendas ?? [];
  const ordens = detalhamento?.ordensServico ?? [];
  const despesas = detalhamento?.despesas ?? [];

  const abas: Array<{ id: Aba; rotulo: string; icon: React.ElementType; qtd: number; total?: string }> = [
    { id: "vendas", rotulo: "Vendas no balcão", icon: ShoppingCart, qtd: vendas.length, total: detalhamento?.totalVendas.formatar() },
    { id: "os", rotulo: "Ordens de serviço", icon: Wrench, qtd: ordens.length, total: detalhamento?.totalOrdensServico.formatar() },
    { id: "despesas", rotulo: "Despesas pagas", icon: Wallet, qtd: despesas.length, total: detalhamento?.totalDespesas.formatar() },
  ];

  const cabecalho = (colunas: string[]) => (
    <thead className="bg-surface-2/50 text-left text-xs uppercase tracking-wide text-fg-subtle">
      <tr>
        <th className="w-8" />
        {colunas.map((c, i) => (
          <th key={c} className={cn("py-2.5 pr-4 font-medium", i >= colunas.length - 2 && "text-right")}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );

  const vazio = (texto: string) => (
    <EmptyState
      icon={ReceiptText}
      title="Nenhum lançamento"
      description={
        detalhamento?.origemDados === "DEMO"
          ? "Os lançamentos individuais aparecem quando o sistema está conectado à API (a base demonstrativa só tem totais)."
          : texto
      }
    />
  );

  return (
    <div className="card mb-6 overflow-hidden" data-testid="detalhamento-dre">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2/80 px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-fg">O que foi vendido e gasto</h2>
          <p className="text-xs text-fg-muted">
            Lançamentos que formam a DRE {detalhamento ? `de ${detalhamento.periodo}` : "do período"}. Clique numa
            linha para ver os itens.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3" role="tablist">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            data-active={aba === a.id}
            onClick={() => setAba(a.id)}
            className="pill"
          >
            <a.icon size={13} /> {a.rotulo} ({a.qtd})
            {a.total && a.qtd > 0 && <span className="money ml-1 opacity-80">· {a.total}</span>}
          </button>
        ))}
      </div>

      {erro ? (
        <div className="px-5 py-4 text-sm text-neg-text" role="alert">
          {erro}
        </div>
      ) : carregando && !detalhamento ? (
        <div className="px-5 py-6 text-sm text-fg-muted">Carregando lançamentos...</div>
      ) : (
        <div className="overflow-x-auto">
          {aba === "vendas" &&
            (vendas.length === 0 ? (
              vazio("Nenhuma venda concluída no período.")
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                {cabecalho(["Data", "Venda", "Vendedor", "Pagamento", "Lucro bruto", "Total"])}
                <tbody>
                  {vendas.map((v) => (
                    <LinhaExpansivel
                      key={v.id}
                      aberta={abertos.has(v.id)}
                      onAlternar={() => alternar(v.id)}
                      colunas={[
                        <span className="text-fg-muted">{formatarDataHora(v.data)}</span>,
                        <span className="font-mono text-xs text-fg">{v.numero}</span>,
                        <span className="text-fg-muted">{v.operador ?? "—"}</span>,
                        <span className="text-fg-muted">{forma(v.formaPagamento)}</span>,
                        <span className={cn("money", v.lucroBruto.centavos >= 0 ? "text-ok-text" : "text-neg-text")}>
                          {v.lucroBruto.formatar()}
                        </span>,
                        <span className="money font-semibold text-fg">{v.total.formatar()}</span>,
                      ]}
                    >
                      <TabelaItens itens={v.itens} />
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-muted">
                        <span>Subtotal: <strong className="money text-fg">{v.subtotal.formatar()}</strong></span>
                        <span>Desconto: <strong className="money text-neg-text">{v.desconto.formatar()}</strong></span>
                        <span>Custo das peças: <strong className="money text-fg">{v.custo.formatar()}</strong></span>
                      </div>
                    </LinhaExpansivel>
                  ))}
                </tbody>
              </table>
            ))}

          {aba === "os" &&
            (ordens.length === 0 ? (
              vazio("Nenhuma OS entregue no período.")
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                {cabecalho(["Entrega", "OS", "Pagamento", "Peças", "Serviços", "Total"])}
                <tbody>
                  {ordens.map((o) => (
                    <LinhaExpansivel
                      key={o.id}
                      aberta={abertos.has(o.id)}
                      onAlternar={() => alternar(o.id)}
                      colunas={[
                        <span className="text-fg-muted">{formatarDataHora(o.data)}</span>,
                        <span className="font-mono text-xs text-fg">{o.numero}</span>,
                        <span className="text-fg-muted">{forma(o.formaPagamento)}</span>,
                        <span className="money text-fg-muted">{o.valorPecas.formatar()}</span>,
                        <span className="money text-fg-muted">{o.valorServicos.formatar()}</span>,
                        <span className="money font-semibold text-fg">{o.total.formatar()}</span>,
                      ]}
                    >
                      <TabelaItens itens={o.itens} />
                      {o.servicos.length > 0 && (
                        <div>
                          <div className="eyebrow mb-1.5">Serviços</div>
                          <ul className="text-xs">
                            {o.servicos.map((s, i) => (
                              <li key={i} className="flex justify-between border-t border-line/60 py-1.5 text-fg">
                                <span>{s.descricao}</span>
                                <span className="money">{s.valor.formatar()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-muted">
                        <span>Desconto: <strong className="money text-neg-text">{o.desconto.formatar()}</strong></span>
                        <span>Custo das peças: <strong className="money text-fg">{o.custoPecas.formatar()}</strong></span>
                      </div>
                    </LinhaExpansivel>
                  ))}
                </tbody>
              </table>
            ))}

          {aba === "despesas" &&
            (despesas.length === 0 ? (
              vazio("Nenhuma conta paga no período.")
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface-2/50 text-left text-xs uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="py-2.5 pl-5 pr-4 font-medium">Pagamento</th>
                    <th className="py-2.5 pr-4 font-medium">Descrição</th>
                    <th className="py-2.5 pr-4 font-medium">Categoria</th>
                    <th className="py-2.5 pr-4 font-medium">Forma</th>
                    <th className="py-2.5 pr-5 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {despesas.map((d) => (
                    <tr key={d.id} className="border-t border-line">
                      <td className="py-3 pl-5 pr-4 text-fg-muted">{formatarData(d.dataPagamento)}</td>
                      <td className="py-3 pr-4 text-fg">{d.descricao}</td>
                      <td className="py-3 pr-4">
                        <span className={cn("chip", d.entraNoDRE ? "" : "opacity-70")}>
                          {ROTULO_CATEGORIA[d.categoria] ?? d.categoria}
                        </span>
                        {!d.entraNoDRE && (
                          <div className="mt-1 text-xs text-fg-subtle">Não entra na DRE: vira CMV ao vender</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-fg-muted">{forma(d.formaPagamento)}</td>
                      <td className="money py-3 pr-5 text-right font-semibold text-neg-text">{d.valor.formatar()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
        </div>
      )}
    </div>
  );
};
