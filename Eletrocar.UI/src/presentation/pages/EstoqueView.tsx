/**
 * View: EstoqueView
 * Catálogo inteligente de peças e componentes elétricos, ponto de reposição
 * e visualização de códigos de barras (EAN-13, SKU).
 */
import React, { useState, useEffect } from "react";
import { Package, Search, Barcode, AlertTriangle, MapPin, Layers, Copy, Check } from "lucide-react";
import { Peca } from "../../domain/entities/Peca";
import { container } from "../../infra/di/container";
import { EmptyState, Page, PageHeader, StatCard } from "../components/ui";
import { cn } from "../../lib/utils";

interface EstoqueViewProps {
  onBiparPecaNoBalcao: (codigo: string) => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = () => {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [fabricanteFiltro, setFabricanteFiltro] = useState<string>("TODOS");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    container.pecaRepository.listar().then(setPecas);
  }, []);

  const copiarCodigo = (codigo: string, id: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const fabricantes = ["TODOS", ...Array.from(new Set(pecas.map((p) => p.marcaFabricante)))];

  const pecasFiltradas = pecas.filter((p) => {
    const matchTermo =
      !termoBusca ||
      p.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
      p.sku.toLowerCase().includes(termoBusca.toLowerCase()) ||
      p.codigoBarras.valor.includes(termoBusca) ||
      p.aplicacaoVeicular.toLowerCase().includes(termoBusca.toLowerCase());

    const matchFabricante = fabricanteFiltro === "TODOS" || p.marcaFabricante === fabricanteFiltro;

    return matchTermo && matchFabricante;
  });

  const totalUnidades = pecas.reduce((acc, p) => acc + p.estoqueAtual, 0);
  const emReposicao = pecas.filter((p) => p.estoqueBaixo).length;

  return (
    <Page>
      <PageHeader
        title="Peças & estoque"
        description="Saldo em tempo real, localização na prateleira e códigos de barras."
        actions={
          <div className="relative w-full sm:w-80">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              placeholder="Buscar por descrição, código, SKU, aplicação..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="field pl-10"
            />
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Itens no catálogo" value={pecas.length} icon={Package} />
        <StatCard label="Unidades em estoque" value={totalUnidades} icon={Layers} />
        <StatCard
          label="Abaixo do mínimo"
          value={emReposicao}
          icon={AlertTriangle}
          tone={emReposicao > 0 ? "neg" : "ok"}
          hint={emReposicao > 0 ? "Precisam de reposição" : "Tudo em dia"}
        />
      </div>

      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {fabricantes.map((fab) => (
          <button
            key={fab}
            onClick={() => setFabricanteFiltro(fab)}
            data-active={fabricanteFiltro === fab}
            className="pill"
          >
            {fab === "TODOS" ? "Todos os fabricantes" : fab}
          </button>
        ))}
      </div>

      {pecasFiltradas.length === 0 ? (
        <div className="card">
          <EmptyState icon={Package} title="Nenhuma peça encontrada" description="Ajuste a busca ou o filtro de fabricante." />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {pecasFiltradas.map((peca) => (
            <div key={peca.id} className="card flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-fg-muted">{peca.sku}</span>
                <span className="chip h-6 px-2">{peca.marcaFabricante}</span>
              </div>

              <h3 className="mt-3 text-base font-semibold leading-snug text-fg">{peca.descricao}</h3>

              <div className="mt-3 flex flex-col gap-1.5 text-xs text-fg-muted">
                <div className="flex items-center gap-2">
                  <Layers size={13} className="shrink-0 text-fg-subtle" />
                  <span className="truncate">{peca.aplicacaoVeicular}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="shrink-0 text-fg-subtle" />
                  <span className="truncate">{peca.localizacao}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-fg-muted">
                <span className="flex items-center gap-2">
                  <Barcode size={14} className="text-fg-subtle" />
                  {peca.codigoBarras.valor}
                </span>
                <button
                  type="button"
                  onClick={() => copiarCodigo(peca.codigoBarras.valor, peca.id)}
                  className="rounded p-1 text-fg-subtle hover:text-fg"
                  title="Copiar código de barras"
                >
                  {copiadoId === peca.id ? <Check size={14} className="text-ok-text" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                <div>
                  <div className="eyebrow">Preço balcão</div>
                  <div className="money mt-1 text-2xl font-semibold text-fg">{peca.precoVenda.formatar()}</div>
                </div>
                <div className="text-right">
                  <span className={cn("chip", peca.estoqueBaixo ? "chip-neg" : "chip-ok")}>
                    {peca.estoqueBaixo && <AlertTriangle size={12} />}
                    {peca.estoqueAtual} un
                  </span>
                  {peca.estoqueBaixo && (
                    <div className="mt-1 text-[0.68rem] text-neg-text">Mínimo: {peca.estoqueMinimo}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
};
