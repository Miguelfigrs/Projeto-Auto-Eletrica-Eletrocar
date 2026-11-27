/**
 * View: BalcaoPDVView
 * Ponto de Venda (PDV) Rápido com leitor de código de barras físico (USB/Bluetooth),
 * fluxo didático em 3 passos, cálculo de troco, PIX dinâmico e emissão de recibo térmico.
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Keyboard,
  Minus,
  Plus,
  Printer,
  QrCode,
  Receipt,
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useVendaBalcao } from "../../adapters/view-models/useVendaBalcao";
import { FormaPagamento } from "../../domain/value-objects/Enums";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { VendaBalcao } from "../../domain/entities/VendaBalcao";
import { Alerts, ConfirmDialog, DidacticBanner, EmptyState, Modal, Page, StepFlow } from "../components/ui";
import { cn } from "../../lib/utils";
import { formatarPercentual, lerValorBR } from "../../lib/numeroBR";
import { BotaoCamera } from "../components/BotaoCamera";
import { ROTULO_FORMA_PAGAMENTO } from "../components/DetalhamentoDREPanel";

interface BalcaoPDVViewProps {
  operadorNome: string;
  caixaAberto?: boolean;
  modoDidatico?: boolean;
  codigoPendente?: string | null;
  onCodigoPendenteConsumido?: () => void;
  onIrParaCaixa?: () => void;
}

const FORMAS = [
  { id: FormaPagamento.DINHEIRO, label: "Dinheiro", icon: Banknote },
  { id: FormaPagamento.PIX, label: "PIX", icon: QrCode },
  { id: FormaPagamento.CARTAO_CREDITO, label: "Crédito", icon: CreditCard },
  { id: FormaPagamento.CARTAO_DEBITO, label: "Débito", icon: CreditCard },
  { id: FormaPagamento.BOLETO, label: "Boleto", icon: FileText },
  { id: FormaPagamento.FATURADO, label: "Faturado", icon: FileText },
];

interface ComprovanteGerado {
  venda: VendaBalcao;
  forma: FormaPagamento;
  troco: number;
  emitidoEm: string;
}

export const BalcaoPDVView: React.FC<BalcaoPDVViewProps> = ({
  operadorNome,
  caixaAberto = true,
  modoDidatico = true,
  codigoPendente,
  onCodigoPendenteConsumido,
  onIrParaCaixa,
}) => {
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
  const [comprovante, setComprovante] = useState<ComprovanteGerado | null>(null);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const abrirPagamento = () => {
    if (itens.length === 0) return;
    setErroPagamento(null);
    setModalPagamentoAberto(true);
  };

  // Atalhos do PDV: F9 conclui o pagamento e F4 abre o catálogo (sem sair da venda).
  const algumModalAberto =
    modalPagamentoAberto || modalBuscaAberto || Boolean(comprovante) || confirmarCancelamento;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        if (!algumModalAberto && itens.length > 0) {
          setErroPagamento(null);
          setModalPagamentoAberto(true);
        }
      } else if (e.key === "F4") {
        e.preventDefault();
        if (!algumModalAberto) setModalBuscaAberto(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [algumModalAberto, itens.length, setModalPagamentoAberto, setModalBuscaAberto]);

  // Atalhos de teste com peças reais do catálogo (só no modo de ajuda)
  const pecasTeste = useMemo(() => catalogo.filter((p) => p.estoqueAtual > 0).slice(0, 3), [catalogo]);

  useEffect(() => {
    if (codigoPendente) {
      biparOuBuscarCodigo(codigoPendente);
      onCodigoPendenteConsumido?.();
    }
  }, [codigoPendente, biparOuBuscarCodigo, onCodigoPendenteConsumido]);

  const txidPix = useMemo(
    () => `eletrocar-${String(Math.round(total.valor * 100)).padStart(6, "0")}-${itens.length}`,
    [total.valor, itens.length]
  );

  const handleSubmeterCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoInput.trim()) {
      biparOuBuscarCodigo(codigoInput);
      setCodigoInput("");
    }
  };

  const handleAplicarDesconto = (e: React.FormEvent) => {
    e.preventDefault();
    const val = lerValorBR(descontoInput);
    if (Number.isNaN(val) || val < 0) {
      setMensagemErro("Desconto inválido. Digite, por exemplo, 10,00.");
      return;
    }
    if (aplicarDesconto(val)) setDescontoInput("");
  };

  const valorRecebidoLido = lerValorBR(valorRecebidoInput);
  const valorRecebido = Number.isNaN(valorRecebidoLido) ? 0 : valorRecebidoLido;
  const trocoCalculado = valorRecebido > total.valor ? valorRecebido - total.valor : 0;
  const qtdTotal = itens.reduce((acc, i) => acc + i.quantidade, 0);
  const percentualDesconto = formatarPercentual(
    subtotal.valor > 0 ? (desconto.valor / subtotal.valor) * 100 : 0
  );
  const excedeAlcada = subtotal.valor > 0 && desconto.valor / subtotal.valor > 0.05;

  const handleConfirmarPagamento = async () => {
    setErroPagamento(null);
    if (formaSelecionada === FormaPagamento.DINHEIRO && valorRecebidoInput.trim()) {
      if (Number.isNaN(valorRecebidoLido)) {
        setErroPagamento("Valor recebido inválido. Digite, por exemplo, 200,00.");
        return;
      }
      if (valorRecebido < total.valor) {
        setErroPagamento(
          `O valor recebido (${new Dinheiro(valorRecebido).formatar()}) é menor que o total (${total.formatar()}).`
        );
        return;
      }
    }
    // Cópia dos itens para o recibo: o carrinho é esvaziado quando a venda é gravada.
    const itensDoRecibo = itens.map((i) => ({ ...i }));
    const descontoDoRecibo = new Dinheiro(desconto);
    const trocoAtual = formaSelecionada === FormaPagamento.DINHEIRO ? trocoCalculado : 0;
    const vendaGravada = await finalizarVenda(formaSelecionada);
    if (!vendaGravada) return; // o aviso de erro já está na tela; recibo só sai de venda gravada
    setComprovante({
      venda: new VendaBalcao({
        itens: itensDoRecibo,
        desconto: descontoDoRecibo,
        formaPagamento: formaSelecionada,
        operadorId: operadorNome,
        numeroVenda: vendaGravada.numeroVenda,
      }),
      forma: formaSelecionada,
      troco: trocoAtual,
      emitidoEm: new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setValorRecebidoInput("");
  };

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

      {!caixaAberto && (
        <div className="alert alert-warn mb-5 justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <span>
              <strong>Caixa fechado:</strong> você pode montar o carrinho, mas é necessário abrir um
              turno antes de finalizar a venda.
            </span>
          </div>
          {onIrParaCaixa && (
            <button type="button" onClick={onIrParaCaixa} className="btn btn-secondary btn-sm shrink-0">
              Abrir caixa (F6)
            </button>
          )}
        </div>
      )}

      <DidacticBanner
        visivel={modoDidatico}
        titulo="Como vender no balcão"
        resumo="Passe o leitor no código de barras da peça ou procure no catálogo pelo nome da peça ou do carro."
        passos={[
          "Passe o leitor na peça (ou toque em 'Catálogo') para colocá-la na venda.",
          "Confira as quantidades. Se for dar desconto, digite o valor em reais.",
          "Toque em 'Finalizar Venda' (ou tecla F9), escolha como o cliente pagou e confirme.",
        ]}
        regraNegocio="Ao finalizar, a peça sai do estoque e o valor entra no caixa do dia automaticamente."
      />

      <StepFlow
        className="mb-5"
        passos={[
          {
            numero: 1,
            titulo: "Bipar ou buscar peça",
            detalhe: itens.length > 0 ? `${qtdTotal} un. no carrinho` : "Aguardando leitor ou F4",
            ativo: itens.length === 0,
            concluido: itens.length > 0,
          },
          {
            numero: 2,
            titulo: "Conferir desconto",
            detalhe: desconto.valor > 0 ? `Desconto de ${desconto.formatar()}` : "Opcional (até 5% livre)",
            ativo: itens.length > 0 && !modalPagamentoAberto,
            concluido: modalPagamentoAberto,
          },
          {
            numero: 3,
            titulo: "Receber & Emitir Recibo",
            detalhe: "Dinheiro, PIX, Cartão ou Faturado",
            ativo: modalPagamentoAberto,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* Coluna esquerda */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Entrada do leitor */}
          <div className="card brand-stripe p-4 sm:p-5">
            <form onSubmit={handleSubmeterCodigo} className="flex flex-wrap gap-3">
              <div className="relative min-w-0 basis-full">
                <ScanBarcode
                  size={22}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-text"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escaneie o código de barras ou digite o código da peça"
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  className="field h-14 pl-13 text-lg"
                />
              </div>
              <button type="submit" className="btn btn-primary h-14 flex-1 px-4">
                <Plus size={18} /> Adicionar
              </button>
              <BotaoCamera
                className="h-14 flex-1 px-4"
                rotulo="Câmera"
                continuo
                onCodigo={(codigo) => biparOuBuscarCodigo(codigo)}
              />
              <button
                type="button"
                className="btn btn-secondary h-14 flex-1 px-4"
                onClick={() => setModalBuscaAberto(true)}
                title="Buscar peça no catálogo (F4)"
              >
                <Search size={17} /> Catálogo <span className="kbd">F4</span>
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-fg-subtle">
              <span>
                O leitor USB/Bluetooth envia o código direto para cá, mesmo sem foco no campo. Sem leitor, use a Câmera.
              </span>
              {modoDidatico && pecasTeste.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-fg-muted">Teste rápido:</span>
                  {pecasTeste.map((peca) => (
                    <button
                      key={peca.id}
                      type="button"
                      onClick={() => biparOuBuscarCodigo(peca.codigoBarras.valor)}
                      className="chip hover:border-brand-line hover:text-fg"
                      title={peca.descricao}
                    >
                      {peca.descricao.split(" ").slice(0, 3).join(" ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Itens */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div className="card-title">
                <ShoppingCart size={18} className="text-brand-text" />
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
                description="Passe o leitor no código de barras da peça ou clique em Catálogo (F4) / Teste rápido acima."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="hidden w-10 2xl:table-cell">#</th>
                      <th>Peça</th>
                      <th className="text-center!">Qtd.</th>
                      <th className="hidden text-right! 2xl:table-cell">Preço un.</th>
                      <th className="text-right!">Subtotal</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => {
                      const itemSubtotal = item.precoUnitario.multiplicar(item.quantidade);
                      return (
                        <tr key={item.id}>
                          <td className="hidden text-fg-subtle 2xl:table-cell">{idx + 1}</td>
                          <td>
                            <div className="font-medium text-fg">{item.descricao}</div>
                            <div className="mt-0.5 font-mono text-xs text-fg-subtle">{item.sku}</div>
                          </td>
                          <td className="text-center">
                            <div className="inline-flex items-center rounded-lg border border-line-strong bg-canvas">
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                                className="grid h-11 w-11 place-items-center text-fg-muted hover:text-fg"
                                aria-label="Diminuir quantidade"
                              >
                                <Minus size={20} />
                              </button>
                              <span className="money min-w-7 text-center font-semibold">
                                {item.quantidade}
                              </span>
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                                className="grid h-11 w-11 place-items-center text-fg-muted hover:text-fg"
                                aria-label="Aumentar quantidade"
                              >
                                <Plus size={20} />
                              </button>
                            </div>
                          </td>
                          <td className="money hidden text-right text-fg-muted 2xl:table-cell">
                            {item.precoUnitario.formatar()}
                          </td>
                          <td className="money text-right font-semibold text-fg">
                            {itemSubtotal.formatar()}
                            {item.quantidade > 1 && (
                              <div className="text-sm font-normal text-fg-subtle 2xl:hidden">
                                {item.quantidade} × {item.precoUnitario.formatar()}
                              </div>
                            )}
                          </td>
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
                <Receipt size={18} className="text-brand-text" /> Resumo da Venda
              </h3>
              <span className="chip h-6 px-2 text-xs">{qtdTotal} un.</span>
            </div>

            <div className="mt-5 flex flex-col gap-3 text-sm">
              <div className="flex justify-between text-fg-muted">
                <span>Subtotal</span>
                <span className="money text-fg">{subtotal.formatar()}</span>
              </div>

              <form onSubmit={handleAplicarDesconto} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-fg-muted">Desconto (R$)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={descontoInput}
                    onChange={(e) => setDescontoInput(e.target.value)}
                    className="field money w-32 text-right"
                  />
                  <button type="submit" className="btn btn-secondary">
                    Aplicar
                  </button>
                </div>
              </form>

              {desconto.maiorQue(Dinheiro.zero()) && (
                <div className="flex justify-between text-neg-text">
                  <span>Desconto concedido ({percentualDesconto}%)</span>
                  <span className="money">- {desconto.formatar()}</span>
                </div>
              )}

              {excedeAlcada && (
                <div className="rounded-xl border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn-text">
                  Desconto acima de 5% ({percentualDesconto}%): em produção requer PIN do gerente
                  (alçada).
                </div>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-line-strong bg-canvas px-5 py-4">
              <div className="eyebrow">Total a pagar</div>
              <div className="money mt-1 text-4xl font-semibold text-fg">{total.formatar()}</div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="btn btn-primary btn-lg w-full"
                onClick={abrirPagamento}
                disabled={itens.length === 0}
              >
                <CheckCircle2 size={20} /> Finalizar Venda (F9)
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => setConfirmarCancelamento(true)}
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
                  ["F12", "Trocar operador por PIN"],
                  ["ESC", "Fechar modal / cancelar"],
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
                onClick={() => {
                  setFormaSelecionada(item.id);
                  setErroPagamento(null);
                }}
                aria-pressed={selecionado}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors",
                  selecionado
                    ? "border-brand-hover bg-brand-soft text-fg"
                    : "border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg"
                )}
              >
                <Icon size={19} className={selecionado ? "text-brand-text" : undefined} />
                {item.label}
              </button>
            );
          })}
        </div>

        {erroPagamento && (
          <div className="alert alert-neg mb-5" role="alert">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{erroPagamento}</span>
          </div>
        )}

        {formaSelecionada === FormaPagamento.DINHEIRO && (
          <div className="mb-5 rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-fg-muted" htmlFor="valor-recebido">
                Valor recebido (para cálculo de troco)
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
                <span>Troco a devolver</span>
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
              <p className="mt-1 truncate font-mono text-xs text-fg-subtle">txid: {txidPix}</p>
              <p className="truncate font-mono text-xs text-fg-subtle">pix@eletrocar.com.br</p>
            </div>
          </div>
        )}

        {(formaSelecionada === FormaPagamento.BOLETO ||
          formaSelecionada === FormaPagamento.FATURADO) && (
          <div className="mb-5 rounded-xl border border-line bg-canvas p-3.5 text-xs text-fg-muted">
            Vendas em <strong>Boleto</strong> ou <strong>Faturado</strong> geram título em Contas a
            Receber e não entram como dinheiro imediato na gaveta do caixa.
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg w-full"
          onClick={handleConfirmarPagamento}
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
        descricao="Busque por veículo, SKU ou fabricante e clique para adicionar ao carrinho."
        icon={Search}
        largura={680}
      >
        <div className="relative mb-4">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
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

      <ConfirmDialog
        aberto={confirmarCancelamento}
        titulo="Cancelar esta venda?"
        mensagem={`Os ${qtdTotal} item(ns) do carrinho serão removidos. Nada foi cobrado ainda.`}
        textoConfirmar="Sim, cancelar a venda"
        textoVoltar="Não, continuar vendendo"
        perigoso
        onConfirmar={() => {
          cancelarVenda();
          setConfirmarCancelamento(false);
        }}
        onVoltar={() => setConfirmarCancelamento(false)}
      />

      {/* Modal Comprovante Térmico 80mm */}
      <Modal
        aberto={Boolean(comprovante)}
        onFechar={() => setComprovante(null)}
        titulo="Comprovante Térmico (80mm)"
        descricao="Simulação do cupom não fiscal emitido após baixa no estoque."
        icon={Printer}
        largura={420}
      >
        {comprovante && (
          <div>
            <div className="rounded-xl border border-line-strong bg-[#f5f3ee] p-5 font-mono text-xs text-[#1a1d22]">
              <div className="border-b border-dashed border-neutral-400 pb-3 text-center">
                <div className="text-sm font-bold uppercase">AUTO ELÉTRICA ELETROCAR</div>
                <div className="text-xs text-neutral-600">
                  Comprovante de venda · {comprovante.emitidoEm}
                </div>
                <div className="mt-1 font-bold">VENDA #{comprovante.venda.numeroVenda}</div>
              </div>

              <div className="border-b border-dashed border-neutral-400 py-3">
                {comprovante.venda.itens.map((it) => (
                  <div key={it.id} className="mb-1.5 flex justify-between gap-2">
                    <span className="truncate">
                      {it.quantidade}x {it.descricao}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {it.precoUnitario.multiplicar(it.quantidade).formatar()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-3">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>{comprovante.venda.subtotal.formatar()}</span>
                </div>
                {comprovante.venda.desconto.valor > 0 && (
                  <div className="flex justify-between">
                    <span>DESCONTO</span>
                    <span>- {comprovante.venda.desconto.formatar()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold">
                  <span>TOTAL</span>
                  <span>{comprovante.venda.total.formatar()}</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>PAGAMENTO</span>
                  <span>{ROTULO_FORMA_PAGAMENTO[comprovante.forma] ?? comprovante.forma}</span>
                </div>
                {comprovante.troco > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>TROCO</span>
                    <span>{new Dinheiro(comprovante.troco, false).formatar()}</span>
                  </div>
                )}
                <div className="pt-2 text-center text-xs text-neutral-600">
                  Operador: {operadorNome}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setComprovante(null)}
              className="btn btn-primary mt-4 w-full"
            >
              Concluir e iniciar próxima venda
            </button>
          </div>
        )}
      </Modal>
    </Page>
  );
};
