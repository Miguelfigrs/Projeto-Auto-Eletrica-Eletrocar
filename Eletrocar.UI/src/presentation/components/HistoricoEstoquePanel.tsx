/**
 * Relatório: histórico de entradas e saídas de peças, com filtro de período, tipo e busca,
 * totais do período e exportação em CSV.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Download, History, RotateCcw, Search } from "lucide-react";
import type {
  HistoricoEstoque,
  MovimentacaoEstoque,
  OrigemMovimentacaoEstoque,
  TipoMovimentacaoEstoque,
} from "../../application/ports/repositories/IHistoricoEstoqueRepository";
import { paraDataIso } from "../../adapters/repositories/MockOrHttpHistoricoEstoqueRepository";
import { container } from "../../infra/di/container";
import { EmptyState, StatCard } from "./ui";
import { formatarDataHora } from "./DetalhamentoDREPanel";
import { cn } from "../../lib/utils";

export const ROTULO_ORIGEM: Record<OrigemMovimentacaoEstoque, string> = {
  VENDA: "Venda no balcão",
  CANCELAMENTO_VENDA: "Cancelamento de venda",
  ORDEM_SERVICO: "Ordem de serviço",
  ENTRADA_FORNECEDOR: "Entrada de fornecedor",
  AJUSTE_INVENTARIO: "Ajuste de inventário",
  CADASTRO: "Cadastro (saldo inicial)",
};

type Periodo = "7" | "30" | "90" | "365" | "personalizado";

function diasAtras(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

function lerDataInput(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [a, m, d] = valor.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function csvCampo(valor: string | number | null): string {
  const texto = valor == null ? "" : String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function exportarCsv(movs: MovimentacaoEstoque[], periodo: string): void {
  const cabecalho = ["Data", "Tipo", "Origem", "SKU", "Peça", "Quantidade", "Valor unitário", "Documento", "Usuário", "Observação"];
  const linhas = movs.map((m) =>
    [
      formatarDataHora(m.data),
      m.tipo === "ENTRADA" ? "Entrada" : "Saída",
      ROTULO_ORIGEM[m.origem] ?? m.origem,
      m.sku,
      m.descricao,
      m.tipo === "ENTRADA" ? m.quantidade : -m.quantidade,
      m.valorUnitario ? m.valorUnitario.valor.toFixed(2).replace(".", ",") : "",
      m.documento,
      m.usuario,
      m.observacao,
    ]
      .map(csvCampo)
      .join(";")
  );
  // BOM para o Excel reconhecer acentos; ";" é o separador padrão do Excel em pt-BR.
  const blob = new Blob(["﻿" + [cabecalho.join(";"), ...linhas].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `movimentacoes-estoque-${periodo.replace(/\//g, "-").replace(/\s+/g, "_")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const HistoricoEstoquePanel: React.FC<{ termoInicial?: string }> = ({ termoInicial = "" }) => {
  const [periodo, setPeriodo] = useState<Periodo>("90");
  const [inicio, setInicio] = useState(() => paraDataIso(diasAtras(90)));
  const [fim, setFim] = useState(() => paraDataIso(new Date()));
  const [tipo, setTipo] = useState<TipoMovimentacaoEstoque | "TODOS">("TODOS");
  const [busca, setBusca] = useState(termoInicial);
  const [historico, setHistorico] = useState<HistoricoEstoque | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => setBusca(termoInicial), [termoInicial]);

  const carregar = useCallback(async () => {
    const dataInicio = lerDataInput(inicio);
    const dataFim = lerDataInput(fim);
    if (!dataInicio || !dataFim) return;
    setCarregando(true);
    setErro(null);
    try {
      setHistorico(
        await container.historicoEstoqueRepository.listarMovimentacoes({
          dataInicio,
          dataFim,
          tipo: tipo === "TODOS" ? undefined : tipo,
        })
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim, tipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const escolherPeriodo = (p: Periodo) => {
    setPeriodo(p);
    if (p !== "personalizado") {
      setInicio(paraDataIso(diasAtras(Number(p))));
      setFim(paraDataIso(new Date()));
    }
  };

  const movimentacoes = useMemo(() => {
    const lista = historico?.movimentacoes ?? [];
    const t = busca.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter((m) =>
      [m.descricao, m.sku, m.documento, m.usuario, m.observacao, ROTULO_ORIGEM[m.origem]]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(t))
    );
  }, [historico, busca]);

  const entradas = movimentacoes.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.quantidade, 0);
  const saidas = movimentacoes.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + m.quantidade, 0);

  return (
    <div data-testid="historico-estoque">
      <div className="card mb-5 flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["7", "7 dias"],
              ["30", "30 dias"],
              ["90", "90 dias"],
              ["365", "12 meses"],
              ["personalizado", "Personalizado"],
            ] as Array<[Periodo, string]>
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className="pill"
              data-active={periodo === valor}
              onClick={() => escolherPeriodo(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)]">
          <div>
            <label className="label" htmlFor="hist-inicio">De</label>
            <input
              id="hist-inicio"
              type="date"
              className="field"
              value={inicio}
              max={fim}
              onChange={(e) => {
                setPeriodo("personalizado");
                setInicio(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="hist-fim">Até</label>
            <input
              id="hist-fim"
              type="date"
              className="field"
              value={fim}
              min={inicio}
              onChange={(e) => {
                setPeriodo("personalizado");
                setFim(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="hist-tipo">Tipo</label>
            <select
              id="hist-tipo"
              className="field"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoMovimentacaoEstoque | "TODOS")}
            >
              <option value="TODOS">Entradas e saídas</option>
              <option value="ENTRADA">Somente entradas</option>
              <option value="SAIDA">Somente saídas</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="hist-busca">Peça, SKU ou documento</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                id="hist-busca"
                className="field pl-9"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ex.: bateria, VB-2026-0006"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Entradas (un)" value={entradas} icon={ArrowDownLeft} tone="ok" />
        <StatCard label="Saídas (un)" value={saidas} icon={ArrowUpRight} tone={saidas > 0 ? "neg" : undefined} />
        <StatCard
          label="Movimentações"
          value={movimentacoes.length}
          icon={History}
          hint={historico ? `Período ${historico.periodo}` : undefined}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2/80 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-fg">Histórico de entradas e saídas</h2>
            <p className="text-xs text-fg-muted">
              {historico?.origemDados === "DEMO"
                ? "Modo demonstração: mostra as movimentações feitas nesta sessão."
                : "Vendas, cancelamentos, ordens de serviço, entradas de fornecedor, ajustes e cadastros."}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void carregar()} disabled={carregando}>
              <RotateCcw size={14} /> {carregando ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={movimentacoes.length === 0}
              onClick={() => exportarCsv(movimentacoes, historico?.periodo ?? "")}
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        {erro ? (
          <div className="px-5 py-4 text-sm text-neg-text" role="alert">
            {erro}
          </div>
        ) : movimentacoes.length === 0 ? (
          <EmptyState
            icon={History}
            title={carregando ? "Carregando..." : "Nenhuma movimentação"}
            description="Ajuste o período, o tipo ou a busca."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-surface-2/50 text-left text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="py-2.5 pl-5 pr-4 font-medium">Data</th>
                  <th className="py-2.5 pr-4 font-medium">Movimento</th>
                  <th className="py-2.5 pr-4 font-medium">Peça</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Qtd</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Valor un.</th>
                  <th className="py-2.5 pr-4 font-medium">Documento</th>
                  <th className="py-2.5 pr-5 font-medium">Responsável / obs.</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m, i) => {
                  const entrada = m.tipo === "ENTRADA";
                  return (
                    <tr key={`${m.data.getTime()}-${m.pecaId}-${m.origem}-${i}`} className="border-t border-line align-top">
                      <td className="whitespace-nowrap py-3 pl-5 pr-4 text-fg-muted">{formatarDataHora(m.data)}</td>
                      <td className="py-3 pr-4">
                        <span className={cn("chip", entrada ? "chip-ok" : "chip-neg")}>
                          {entrada ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {entrada ? "Entrada" : "Saída"}
                        </span>
                        <div className="mt-1 text-xs text-fg-muted">{ROTULO_ORIGEM[m.origem] ?? m.origem}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-fg">{m.descricao}</div>
                        {m.sku && <div className="font-mono text-xs text-fg-subtle">{m.sku}</div>}
                      </td>
                      <td
                        className={cn(
                          "py-3 pr-4 text-right font-semibold tabular-nums",
                          entrada ? "text-ok-text" : "text-neg-text"
                        )}
                      >
                        {entrada ? "+" : "−"}
                        {m.quantidade}
                      </td>
                      <td className="money py-3 pr-4 text-right text-fg-muted">
                        {m.valorUnitario ? m.valorUnitario.formatar() : "—"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-fg-muted">{m.documento ?? "—"}</td>
                      <td className="py-3 pr-5 text-xs text-fg-muted">
                        <div>{m.usuario ?? "—"}</div>
                        {m.observacao && <div className="mt-0.5 text-fg-subtle">{m.observacao}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
