/**
 * View: EstoqueView
 * Catálogo inteligente de peças e componentes elétricos, ponto de reposição
 * e visualização de códigos de barras (EAN-13, SKU).
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Search,
  Barcode,
  AlertTriangle,
  MapPin,
  Layers,
  Copy,
  Check,
  Plus,
  ShoppingCart,
  PackagePlus,
  PackageCheck,
  History,
} from "lucide-react";
import { Peca } from "../../domain/entities/Peca";
import { container } from "../../infra/di/container";
import { Alerts, DidacticBanner, EmptyState, Page, PageHeader, StatCard } from "../components/ui";
import { cn } from "../../lib/utils";
import { EntradaEstoqueModal, NovaPecaModal } from "../components/EstoqueModals";
import { HistoricoEstoquePanel } from "../components/HistoricoEstoquePanel";
import type { NovaPecaDados } from "../../application/ports/repositories/IPecaRepository";

interface EstoqueViewProps {
  onBiparPecaNoBalcao: (codigo: string) => void;
  modoDidatico?: boolean;
}

function calcularPorcentagemSaude(atual: number, minimo: number): number {
  const referencia = Math.max(minimo * 2, 1);
  return Math.max(6, Math.min(100, Math.round((atual / referencia) * 100)));
}

const ABAS = [
  ["catalogo", "Catálogo", Package],
  ["historico", "Histórico de entradas e saídas", History],
] as const;

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  onBiparPecaNoBalcao,
  modoDidatico = true,
}) => {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [fabricanteFiltro, setFabricanteFiltro] = useState<string>("TODOS");
  const [apenasReposicao, setApenasReposicao] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [aba, setAba] = useState<"catalogo" | "historico">("catalogo");
  const [novaPecaAberto, setNovaPecaAberto] = useState(false);
  const [entradaAberta, setEntradaAberta] = useState(false);
  const [pecaEntrada, setPecaEntrada] = useState<Peca | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const carregarPecas = useCallback(async () => {
    const lista = await container.pecaRepository.listar();
    setPecas([...lista]);
  }, []);

  useEffect(() => {
    void carregarPecas();
  }, [carregarPecas]);

  const copiarCodigo = (codigo: string, id: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(codigo);
    }
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const abrirEntrada = (peca: Peca | null = null) => {
    setPecaEntrada(peca);
    setEntradaAberta(true);
  };

  const fecharEntrada = useCallback(() => setEntradaAberta(false), []);
  const fecharNovaPeca = useCallback(() => setNovaPecaAberto(false), []);

  const registrarEntrada = async (peca: Peca, quantidade: number) => {
    await container.pecaRepository.atualizarEstoque(peca.id, quantidade);
    await carregarPecas();
    const atualizada = (await container.pecaRepository.buscarPorId(peca.id)) ?? peca;
    setEntradaAberta(false);
    setFeedback({
      tipo: "sucesso",
      texto: `+${quantidade} un adicionadas em "${peca.descricao}" (${peca.sku}). Novo saldo: ${atualizada.estoqueAtual} un.`,
    });
  };

  const cadastrarPeca = async (dados: NovaPecaDados) => {
    const peca = await container.pecaRepository.cadastrar(dados);
    await carregarPecas();
    setNovaPecaAberto(false);
    setFabricanteFiltro("TODOS");
    setApenasReposicao(false);
    setFeedback({
      tipo: "sucesso",
      texto: `Peça "${peca.descricao}" (${peca.sku}) cadastrada com ${peca.estoqueAtual} un em estoque.`,
    });
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
    const matchReposicao = !apenasReposicao || p.estoqueBaixo;

    return matchTermo && matchFabricante && matchReposicao;
  });

  const totalUnidades = pecas.reduce((acc, p) => acc + p.estoqueAtual, 0);
  const emReposicao = pecas.filter((p) => p.estoqueBaixo).length;

  return (
    <Page>
      <PageHeader
        title="Peças & estoque"
        description="Saldo em tempo real, ponto de reposição e integração direta com o leitor de código de barras."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                placeholder="Buscar por descrição, código, SKU, aplicação..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="field pl-10"
              />
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => abrirEntrada(null)}>
              <PackageCheck size={16} /> Entrada de estoque
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setNovaPecaAberto(true)}>
              <PackagePlus size={16} /> Nova peça
            </button>
          </div>
        }
      />

      <DidacticBanner
        visivel={modoDidatico}
        titulo="Como funciona o controle de estoque"
        resumo="Cada peça tem código, prateleira, preço de custo, preço de venda e uma quantidade mínima para não faltar no balcão."
        passos={[
          "Quando a quantidade chega no mínimo, a peça fica vermelha: é hora de comprar.",
          "'Nova peça' cadastra um item novo. 'Entrada de estoque' soma as peças que chegaram do fornecedor.",
          "'Ao Balcão' abre a venda já com a peça escolhida.",
        ]}
        regraNegocio="O sistema não deixa vender mais peças do que existem no estoque."
      />

      {feedback && (
        <div className="mb-5">
          <Alerts
            sucesso={feedback.tipo === "sucesso" ? feedback.texto : null}
            erro={feedback.tipo === "erro" ? feedback.texto : null}
            onFecharErro={() => setFeedback(null)}
          />
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-line" role="tablist">
        {ABAS.map(([id, rotulo, Icone]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              aba === id ? "border-brand text-fg" : "border-transparent text-fg-muted hover:text-fg"
            )}
          >
            <Icone size={15} /> {rotulo}
          </button>
        ))}
      </div>

      {aba === "historico" ? (
        <HistoricoEstoquePanel termoInicial={termoBusca} />
      ) : (
        <>
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

          <div className="-mx-1 mb-6 flex flex-wrap items-center gap-2 px-1 pb-1">
            <button
              type="button"
              onClick={() => setApenasReposicao((v) => !v)}
              data-active={apenasReposicao}
              className={cn(
                "pill",
                apenasReposicao && "border-neg/40 bg-neg-soft text-neg-text"
              )}
            >
              <AlertTriangle size={13} /> Somente reposição ({emReposicao})
            </button>

            {fabricantes.map((fab) => (
              <button
                type="button"
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
              {pecas.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhuma peça cadastrada ainda"
                  description="Comece cadastrando a primeira peça do catálogo. Depois é só usar 'Entrada de estoque' quando chegar mercadoria."
                  action={
                    <button type="button" className="btn btn-primary" onClick={() => setNovaPecaAberto(true)}>
                      <PackagePlus size={20} /> Cadastrar a primeira peça
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title="Nenhuma peça encontrada"
                  description="Ajuste a busca, o filtro de reposição ou o fabricante."
                />
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pecasFiltradas.map((peca) => {
                const saudePct = calcularPorcentagemSaude(peca.estoqueAtual, peca.estoqueMinimo);
                const margemPct =
                  peca.precoCusto.centavos > 0
                    ? Math.round(
                        ((peca.precoVenda.centavos - peca.precoCusto.centavos) / peca.precoCusto.centavos) * 100
                      )
                    : 0;

                return (
                  <div
                    key={peca.id}
                    className={cn(
                      "card flex flex-col p-5",
                      peca.estoqueBaixo && "border-neg/35"
                    )}
                  >
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

                    {/* Barra de saúde de estoque */}
                    <div className="mt-4 rounded-xl border border-line bg-canvas/70 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-fg-muted">Saúde do saldo</span>
                        <span className={cn("font-semibold", peca.estoqueBaixo ? "text-neg-text" : "text-ok-text")}>
                          {peca.estoqueAtual} / mín. {peca.estoqueMinimo} un
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            peca.estoqueBaixo ? "bg-brand" : "bg-ok"
                          )}
                          style={{ width: `${saudePct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="eyebrow">Preço balcão</div>
                        <div className="money mt-1 text-2xl font-semibold text-fg">{peca.precoVenda.formatar()}</div>
                        <div className="mt-0.5 text-xs text-fg-subtle">
                          Custo: {peca.precoCusto.formatar()} • Markup +{margemPct}%
                        </div>
                      </div>
                      <span className={cn("chip", peca.estoqueBaixo ? "chip-neg" : "chip-ok")}>
                        {peca.estoqueBaixo && <AlertTriangle size={12} />}
                        {peca.estoqueAtual} un
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
                      <button
                        type="button"
                        onClick={() => abrirEntrada(peca)}
                        className="btn btn-secondary btn-sm w-full"
                        title="Registrar entrada de unidades desta peça no estoque"
                      >
                        <Plus size={14} /> Entrada
                      </button>
                      <button
                        type="button"
                        disabled={peca.estoqueAtual <= 0}
                        onClick={() => onBiparPecaNoBalcao(peca.codigoBarras.valor)}
                        className="btn btn-primary btn-sm w-full"
                        title="Abrir o Balcão PDV e adicionar esta peça ao carrinho"
                      >
                        <ShoppingCart size={14} /> Ao Balcão
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <NovaPecaModal aberto={novaPecaAberto} onFechar={fecharNovaPeca} onSalvar={cadastrarPeca} />
      <EntradaEstoqueModal
        aberto={entradaAberta}
        onFechar={fecharEntrada}
        pecas={pecas}
        pecaInicial={pecaEntrada}
        onConfirmar={registrarEntrada}
      />
    </Page>
  );
};
