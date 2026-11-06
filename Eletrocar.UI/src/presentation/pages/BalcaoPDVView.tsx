/**
 * View: BalcaoPDVView
 * Ponto de Venda (PDV) Rápido com leitor de código de barras físico (USB/Bluetooth),
 * suporte total a teclado, cálculo de troco, emissão de PIX dinâmico e conciliação.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  FileText,
  CheckCircle2,
  X,
  Keyboard,
  Printer,
  Receipt,
} from "lucide-react";
import { useVendaBalcao } from "../../adapters/view-models/useVendaBalcao";
import { FormaPagamento } from "../../domain/value-objects/Enums";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { Alerts, EmptyState, Modal, Page } from "../components/ui";
import { cn } from "../../lib/utils";

interface BalcaoPDVViewProps {
  operadorNome: string;
}

const FORMAS = [
  { id: FormaPagamento.DINHEIRO, label: "Dinheiro", icon: Banknote },
  { id: FormaPagamento.PIX, label: "PIX", icon: QrCode },
  { id: FormaPagamento.CARTAO_CREDITO, label: "Crédito", icon: CreditCard },
  { id: FormaPagamento.CARTAO_DEBITO, label: "Débito", icon: CreditCard },
  { id: FormaPagamento.BOLETO, label: "Boleto", icon: FileText },
  { id: FormaPagamento.FATURADO, label: "Faturado", icon: FileText },
];

export const BalcaoPDVView: React.FC<BalcaoPDVViewProps> = ({ operadorNome }) => {
  const {
    itens,
    subtotal,
    desconto,
    total,
    catalogo,
    filtroBusca,
    setFiltroBusca,
    biparOuBuscarCodigo,
    alterarQuantidade,
    removerItem,
    aplicarDesconto,
    cancelarVenda,
    finalizarVenda,
    modalPagamentoAberto,
    setModalPagamentoAberto,
    modalBuscaAberto,
    setModalBuscaAberto,
    mensagemSucesso,
    mensagemErro,
    setMensagemErro,
    processando,
  } = useVendaBalcao(operadorNome);

  const [codigoInput, setCodigoInput] = useState("");
  const [descontoInput, setDescontoInput] = useState("");
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento>(FormaPagamento.DINHEIRO);
  const [valorRecebidoInput, setValorRecebidoInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmeterCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoInput.trim()) {
      biparOuBuscarCodigo(codigoInput);
      setCodigoInput("");
    }
  };

  const handleAplicarDesconto = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(descontoInput.replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      aplicarDesconto(val);
      setDescontoInput("");
    }
  };

  // Cálculo de troco
  const valorRecebido = parseFloat(valorRecebidoInput.replace(",", ".")) || 0;
  const trocoCalculado = valorRecebido > total.valor ? valorRecebido - total.valor : 0;
  const qtdTotal = itens.reduce((acc, i) => acc + i.quantidade, 0);

  const catalogoFiltrado = catalogo.filter(
    (p) =>
      !filtroBusca ||
      p.descricao.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      p.sku.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      p.aplicacaoVeicular.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  return (
    <Page>
      <Alerts sucesso={mensagemSucesso} erro={mensagemErro} onFecharErro={() => setMensagemErro(null)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Coluna esquerda */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Entrada do leitor */}
          <div className="card p-4 sm:p-5">
            <form onSubmit={handleSubmeterCodigo} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <ScanBarcode
                  size={22}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escaneie o código de barras ou digite o SKU/Código (ex: 7891049281023)..."
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  className="field h-14 pl-13 font-mono text-base"
                />
              </div>
              <button type="submit" className="btn btn-primary h-14 px-6">
                <Plus size={18} /> Adicionar
              </button>
              <button
                type="button"
                className="btn btn-secondary h-14"
                onClick={() => setModalBuscaAberto(true)}
                title="Buscar peça no catálogo (F4)"
              >
                <Search size={17} /> Catálogo <span className="kbd">F4</span>
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-fg-subtle">
              <span>O leitor USB/Bluetooth envia o código direto para cá, mesmo sem clicar no campo.</span>
              <div className="flex flex-wrap items-center gap-2">
                <span>Teste rápido:</span>
                <button
                  type="button"
                  onClick={() => biparOuBuscarCodigo("7891049281023")}
                  className="chip hover:border-brand-line hover:text-fg"
                >
                  Regulador Bosch
                </button>
                <button
                  type="button"
                  onClick={() => biparOuBuscarCodigo("7898237461928")}
                  className="chip hover:border-brand-line hover:text-fg"
                >
                  Bateria Moura 60A
                </button>
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div className="card-title">
                <ShoppingCart size={18} className="text-brand" />
                Itens da venda
                <span className="chip h-6 px-2">{itens.length}</span>
              </div>
              <span className="text-xs text-fg-muted">
                Operador: <strong className="text-fg">{operadorNome}</strong>
              </span>
            </div>

            {itens.length === 0 ? (
              <EmptyState
                icon={ScanBarcode}
                title="Nenhum item na venda"
                description="Passe o leitor no código de barras da peça para adicioná-la."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th>Peça</th>
                      <th className="text-center!">Qtd.</th>
                      <th className="text-right!">Preço un.</th>
                      <th className="text-right!">Subtotal</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => {
                      const itemSubtotal = item.precoUnitario.multiplicar(item.quantidade);
                      return (
                        <tr key={item.id}>
                          <td className="text-fg-subtle">{idx + 1}</td>
                          <td>
                            <div className="font-medium text-fg">{item.descricao}</div>
                            <div className="mt-0.5 font-mono text-xs text-fg-subtle">{item.sku}</div>
                          </td>
                          <td className="text-center">
                            <div className="inline-flex items-center rounded-lg border border-line bg-canvas">
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                                className="grid h-8 w-8 place-items-center text-fg-muted hover:text-fg"
                                aria-label="Diminuir quantidade"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="money min-w-7 text-center font-semibold">{item.quantidade}</span>
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                                className="grid h-8 w-8 place-items-center text-fg-muted hover:text-fg"
                                aria-label="Aumentar quantidade"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="money text-right text-fg-muted">{item.precoUnitario.formatar()}</td>
                          <td className="money text-right font-semibold text-fg">{itemSubtotal.formatar()}</td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => removerItem(item.id)}
                              className="btn btn-ghost btn-icon hover:text-neg-text!"
                              title="Remover peça do carrinho"
                            >
                              <Trash2 size={16} />
                            </button>
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

        {/* Coluna direita: resumo */}
        <div>
          <div className="card brand-stripe sticky top-[96px] p-6">
            <div className="flex items-center justify-between">
              <h3 className="card-title">
                <Receipt size={18} className="text-brand" /> Resumo
              </h3>
              <span className="text-xs text-fg-subtle">{qtdTotal} un.</span>
            </div>

            <div className="mt-5 flex flex-col gap-3 text-sm">
              <div className="flex justify-between text-fg-muted">
                <span>Subtotal</span>
                <span className="money text-fg">{subtotal.formatar()}</span>
              </div>

              <form onSubmit={handleAplicarDesconto} className="flex items-center justify-between gap-3">
                <span className="text-fg-muted">Desconto (R$)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={descontoInput}
                    onChange={(e) => setDescontoInput(e.target.value)}
                    className="field money h-9 w-24 text-right"
                  />
                  <button type="submit" className="btn btn-secondary btn-sm h-9">
                    Aplicar
                  </button>
                </div>
              </form>

              {desconto.maiorQue(Dinheiro.zero()) && (
                <div className="flex justify-between text-neg-text">
                  <span>Desconto concedido</span>
                  <span className="money">- {desconto.formatar()}</span>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-line bg-canvas px-5 py-4">
              <div className="eyebrow">Total a pagar</div>
              <div className="money mt-1 text-4xl font-semibold text-fg">{total.formatar()}</div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="btn btn-primary btn-lg w-full"
                onClick={() => setModalPagamentoAberto(true)}
                disabled={itens.length === 0}
              >
                <CheckCircle2 size={20} /> Finalizar Venda (F9)
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={cancelarVenda}
                disabled={itens.length === 0}
              >
                <X size={16} /> Cancelar venda
              </button>
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-fg-muted">
                <Keyboard size={14} /> Atalhos do Teclado
              </div>
              <ul className="flex flex-col gap-2 text-xs text-fg-subtle">
                {[
                  ["F4", "Buscar no catálogo"],
                  ["F9", "Concluir pagamento"],
                  ["F12", "Trocar operador"],
                  ["ESC", "Cancelar atendimento"],
                ].map(([k, t]) => (
                  <li key={k} className="flex items-center justify-between">
                    <span>{t}</span>
                    <span className="kbd">{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento (F9) */}
      <Modal
        aberto={modalPagamentoAberto}
        onFechar={() => setModalPagamentoAberto(false)}
        titulo="Concluir venda"
        descricao="Escolha a forma de pagamento e confirme o recebimento."
        icon={Receipt}
        largura={520}
      >
        <div className="mb-5 rounded-xl border border-brand-line bg-brand-soft px-5 py-4 text-center">
          <div className="eyebrow text-brand-text!">Valor total</div>
          <div className="money mt-1 text-4xl font-semibold text-fg">{total.formatar()}</div>
        </div>

        <div className="label">Forma de pagamento</div>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {FORMAS.map((item) => {
            const Icon = item.icon;
            const selecionado = formaSelecionada === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormaSelecionada(item.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors",
                  selecionado
                    ? "border-brand bg-brand-soft text-fg"
                    : "border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg"
                )}
              >
                <Icon size={19} className={selecionado ? "text-brand" : undefined} />
                {item.label}
              </button>
            );
          })}
        </div>

        {formaSelecionada === FormaPagamento.DINHEIRO && (
          <div className="mb-5 rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-fg-muted" htmlFor="valor-recebido">
                Valor recebido
              </label>
              <input
                id="valor-recebido"
                type="text"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={valorRecebidoInput}
                onChange={(e) => setValorRecebidoInput(e.target.value)}
                className="field money w-36 text-right"
              />
            </div>
            {trocoCalculado > 0 && (
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-semibold text-ok-text">
                <span>Troco</span>
                <span className="money">{new Dinheiro(trocoCalculado, false).formatar()}</span>
              </div>
            )}
          </div>
        )}

        {formaSelecionada === FormaPagamento.PIX && (
          <div className="mb-5 flex items-center gap-4 rounded-xl border border-line bg-canvas p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-white text-canvas">
              <QrCode size={60} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">QR Code PIX com conciliação automática</p>
              <p className="mt-1 truncate font-mono text-xs text-fg-subtle">
                txid: eletrocar-{Date.now().toString().slice(-8)}
              </p>
              <p className="truncate font-mono text-xs text-fg-subtle">pix@eletrocar.com.br</p>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg w-full"
          onClick={() => finalizarVenda(formaSelecionada)}
          disabled={processando}
        >
          <Printer size={18} /> {processando ? "Processando..." : "Confirmar recebimento"}
        </button>
      </Modal>

      {/* Modal de Busca no Catálogo (F4) */}
      <Modal
        aberto={modalBuscaAberto}
        onFechar={() => setModalBuscaAberto(false)}
        titulo="Catálogo de peças"
        descricao="Clique em uma peça para adicioná-la à venda."
        icon={Search}
        largura={680}
      >
        <div className="relative mb-4">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            autoFocus
            placeholder="Nome, SKU, aplicação ou fabricante (Bosch, Valeo...)"
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            className="field pl-10"
          />
        </div>

        <div className="-mx-2 flex max-h-[380px] flex-col overflow-y-auto">
          {catalogoFiltrado.map((peca) => (
            <button
              key={peca.id}
              type="button"
              onClick={() => {
                biparOuBuscarCodigo(peca.sku);
                setModalBuscaAberto(false);
              }}
              className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-fg">{peca.descricao}</div>
                <div className="mt-0.5 truncate font-mono text-xs text-fg-subtle">
                  {peca.sku} · {peca.codigoBarras.valor} · {peca.aplicacaoVeicular}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="money text-sm font-semibold text-fg">{peca.precoVenda.formatar()}</div>
                <div className={cn("text-xs", peca.estoqueBaixo ? "text-neg-text" : "text-fg-subtle")}>
                  {peca.estoqueAtual} em estoque
                </div>
              </div>
            </button>
          ))}
          {catalogoFiltrado.length === 0 && (
            <p className="py-10 text-center text-sm text-fg-subtle">Nenhuma peça encontrada.</p>
          )}
        </div>
      </Modal>
    </Page>
  );
};
