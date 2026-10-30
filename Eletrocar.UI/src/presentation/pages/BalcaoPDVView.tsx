/**
 * View: BalcaoPDVView
 * Ponto de Venda (PDV) Rápido com leitor de código de barras físico (USB/Bluetooth),
 * suporte total a teclado, cálculo de troco, emissão de PIX dinâmico e conciliação.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Keyboard,
  Printer,
} from "lucide-react";
import { useVendaBalcao } from "../../adapters/view-models/useVendaBalcao";
import { FormaPagamento } from "../../domain/value-objects/Enums";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";

interface BalcaoPDVViewProps {
  operadorNome: string;
}

export const BalcaoPDVView: React.FC<BalcaoPDVViewProps> = ({ operadorNome }) => {
  const {
    venda,
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

  return (
    <div style={{ padding: "24px", maxWidth: "1500px", margin: "0 auto" }}>
      {/* Alertas de Notificação */}
      {mensagemSucesso && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            padding: "12px 18px",
            borderRadius: "10px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          {mensagemSucesso}
        </div>
      )}

      {mensagemErro && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            padding: "12px 18px",
            borderRadius: "10px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            {mensagemErro}
          </div>
          <button
            onClick={() => setMensagemErro(null)}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Grid Principal: 2 Colunas (Itens à Esquerda, Totais à Direita) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px" }}>
        {/* Coluna Esquerda: Entrada de Leitor & Tabela de Itens */}
        <div>
          {/* Caixa de Entrada Rápida com Leitor */}
          <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "20px" }}>
            <form onSubmit={handleSubmeterCodigo} style={{ display: "flex", gap: "12px" }}>
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Barcode
                  size={20}
                  color="var(--cyan-primary)"
                  style={{ position: "absolute", left: "14px" }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escaneie o código de barras ou digite o SKU/Código (ex: 7891049281023)..."
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 46px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-cyan)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    fontSize: "1rem",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                    boxShadow: "0 0 12px rgba(0, 229, 255, 0.1)",
                  }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: "0 22px" }}>
                Adicionar
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalBuscaAberto(true)}
                title="Buscar peça no catálogo (F4)"
              >
                <Search size={16} /> F4 Catálogo
              </button>
            </form>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "12px",
                fontSize: "0.78rem",
                color: "var(--text-dim)",
              }}
            >
              <span>
                💡 O leitor físico USB/Bluetooth injeta direto aqui <strong>mesmo sem clicar na caixa</strong>.
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Atalhos de Teste Rápido:</span>
                <button
                  type="button"
                  onClick={() => biparOuBuscarCodigo("7891049281023")}
                  style={{
                    background: "rgba(0, 229, 255, 0.1)",
                    border: "none",
                    color: "var(--cyan-primary)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Regulador Bosch
                </button>
                <button
                  type="button"
                  onClick={() => biparOuBuscarCodigo("7898237461928")}
                  style={{
                    background: "rgba(0, 229, 255, 0.1)",
                    border: "none",
                    color: "var(--cyan-primary)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Bateria Moura 60A
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Itens Adicionados no Carrinho */}
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShoppingCart size={18} color="var(--cyan-primary)" />
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                  Itens da Venda ({itens.length})
                </h2>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Operador: <strong>{operadorNome}</strong>
              </span>
            </div>

            {itens.length === 0 ? (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: "var(--text-dim)",
                }}
              >
                <Barcode size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
                <p style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>
                  Carrinho Vazio
                </p>
                <p style={{ fontSize: "0.82rem" }}>
                  Aproxime o leitor de código de barras da peça para registrar o item no balcão.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        borderBottom: "1px solid var(--border-subtle)",
                        textAlign: "left",
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                      }}
                    >
                      <th style={{ padding: "12px 18px" }}>#</th>
                      <th style={{ padding: "12px 18px" }}>SKU / Código</th>
                      <th style={{ padding: "12px 18px" }}>Descrição da Peça</th>
                      <th style={{ padding: "12px 18px", textAlign: "center" }}>Quantidade</th>
                      <th style={{ padding: "12px 18px", textAlign: "right" }}>Preço Un.</th>
                      <th style={{ padding: "12px 18px", textAlign: "right" }}>Subtotal</th>
                      <th style={{ padding: "12px 18px", textAlign: "center" }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => {
                      const itemSubtotal = item.precoUnitario.multiplicar(item.quantidade);
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "14px 18px", color: "var(--text-dim)", fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", color: "var(--cyan-primary)" }}>
                            {item.sku}
                          </td>
                          <td style={{ padding: "14px 18px", fontWeight: 600 }}>
                            {item.descricao}
                          </td>
                          <td style={{ padding: "14px 18px", textAlign: "center" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "rgba(255, 255, 255, 0.05)",
                                padding: "4px 8px",
                                borderRadius: "6px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                              >
                                <Minus size={13} />
                              </button>
                              <span style={{ fontWeight: 700, minWidth: "20px", textAlign: "center" }}>
                                {item.quantidade}
                              </span>
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                                style={{ background: "none", border: "none", color: "var(--cyan-primary)", cursor: "pointer" }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: "14px 18px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                            {item.precoUnitario.formatar()}
                          </td>
                          <td
                            style={{
                              padding: "14px 18px",
                              textAlign: "right",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              color: "#34d399",
                            }}
                          >
                            {itemSubtotal.formatar()}
                          </td>
                          <td style={{ padding: "14px 18px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => removerItem(item.id)}
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
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

        {/* Coluna Direita: Painel Financeiro e Fechamento */}
        <div>
          <div className="glass-panel" style={{ padding: "24px", position: "sticky", top: "110px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px", color: "var(--text-main)" }}>
              Resumo do Atendimento
            </h3>

            {/* Linhas de Valores */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                <span>Subtotal Itens:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-main)" }}>
                  {subtotal.formatar()}
                </span>
              </div>

              {/* Formulário de Desconto */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Desconto (R$):</span>
                <form onSubmit={handleAplicarDesconto} style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={descontoInput}
                    onChange={(e) => setDescontoInput(e.target.value)}
                    style={{
                      width: "80px",
                      padding: "6px 8px",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <button type="submit" className="btn-secondary" style={{ padding: "6px 10px", fontSize: "0.75rem" }}>
                    Aplicar
                  </button>
                </form>
              </div>

              {desconto.maiorQue(Dinheiro.zero()) && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#f87171", fontSize: "0.85rem" }}>
                  <span>Desconto Concedido:</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    - {desconto.formatar()}
                  </span>
                </div>
              )}

              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "16px",
                  marginTop: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>Total a Pagar:</span>
                <span
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "var(--cyan-primary)",
                    fontFamily: "var(--font-mono)",
                    textShadow: "0 0 20px rgba(0, 229, 255, 0.3)",
                  }}
                >
                  {total.formatar()}
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModalPagamentoAberto(true)}
                disabled={itens.length === 0}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "1.05rem",
                  opacity: itens.length === 0 ? 0.4 : 1,
                  cursor: itens.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                <CheckCircle2 size={20} /> Finalizar Venda (F9)
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={cancelarVenda}
                disabled={itens.length === 0}
                style={{ width: "100%", padding: "12px", opacity: itens.length === 0 ? 0.4 : 1 }}
              >
                <X size={16} /> Cancelar / Limpar (ESC)
              </button>
            </div>

            {/* Barra de Atalhos */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                fontSize: "0.74rem",
                color: "var(--text-dim)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <Keyboard size={13} color="var(--cyan-primary)" />
                <strong>Atalhos do Teclado:</strong>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li><code>[F4]</code> Abrir busca de catálogo de peças</li>
                <li><code>[F9]</code> Concluir pagamento e emitir cupom</li>
                <li><code>[F12]</code> Bloqueio / Troca rápida de operador</li>
                <li><code>[ESC]</code> Cancelar atendimento</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento & Checkout (F9) */}
      {modalPagamentoAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "520px", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Concluir Venda no Balcão</h2>
              <button
                onClick={() => setModalPagamentoAberto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: "rgba(0, 229, 255, 0.08)",
                border: "1px solid var(--border-cyan)",
                borderRadius: "10px",
                padding: "16px",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Valor Total:</span>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--cyan-primary)", fontFamily: "var(--font-mono)" }}>
                {total.formatar()}
              </div>
            </div>

            {/* Seleção do Meio de Pagamento */}
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
              Selecione o Meio de Pagamento:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
              {[
                { id: FormaPagamento.DINHEIRO, label: "Dinheiro", icon: Banknote },
                { id: FormaPagamento.PIX, label: "PIX Dinâmico", icon: QrCode },
                { id: FormaPagamento.CARTAO_CREDITO, label: "Crédito", icon: CreditCard },
                { id: FormaPagamento.CARTAO_DEBITO, label: "Débito", icon: CreditCard },
                { id: FormaPagamento.BOLETO, label: "Boleto", icon: FileText },
                { id: FormaPagamento.FATURADO, label: "Faturado (Frota)", icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                const selecionado = formaSelecionada === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormaSelecionada(item.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                      padding: "12px 8px",
                      borderRadius: "8px",
                      background: selecionado ? "rgba(0, 229, 255, 0.18)" : "rgba(255, 255, 255, 0.04)",
                      border: selecionado ? "1px solid var(--cyan-primary)" : "1px solid var(--border-subtle)",
                      color: selecionado ? "var(--cyan-primary)" : "var(--text-main)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Detalhes específicos de Dinheiro (Troco) */}
            {formaSelecionada === FormaPagamento.DINHEIRO && (
              <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "8px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", flex: 1 }}>
                    Valor em Dinheiro Recebido:
                  </label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={valorRecebidoInput}
                    onChange={(e) => setValorRecebidoInput(e.target.value)}
                    style={{
                      width: "120px",
                      padding: "8px",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      color: "var(--text-main)",
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                    }}
                  />
                </div>
                {trocoCalculado > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#34d399", fontWeight: 700, fontSize: "0.95rem" }}>
                    <span>Troco a Devolver:</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {new Dinheiro(trocoCalculado, false).formatar()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Detalhes específicos de PIX */}
            {formaSelecionada === FormaPagamento.PIX && (
              <div style={{ background: "rgba(0, 229, 255, 0.05)", border: "1px solid var(--border-cyan)", padding: "16px", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
                <QrCode size={64} color="var(--cyan-primary)" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                  QR Code PIX com Conciliação Automática
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  txid: eletrocar-{Date.now().toString().slice(-8)} • Chave: pix@eletrocar.com.br
                </p>
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={() => finalizarVenda(formaSelecionada)}
              disabled={processando}
              style={{ width: "100%", padding: "14px", fontSize: "1rem" }}
            >
              <Printer size={18} /> {processando ? "Processando..." : "Confirmar Recebimento e Baixa"}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Busca Manual no Catálogo (F4) */}
      {modalBuscaAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "680px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Catálogo de Peças (F4)</h2>
              <button
                onClick={() => setModalBuscaAberto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: "16px" }}>
              <Search size={18} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
              <input
                type="text"
                placeholder="Filtrar por nome, SKU, aplicação veicular ou fabricante (Bosch, Valeo...)"
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 10px 10px 38px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                }}
              />
            </div>

            <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {catalogo
                .filter(
                  (p) =>
                    !filtroBusca ||
                    p.descricao.toLowerCase().includes(filtroBusca.toLowerCase()) ||
                    p.sku.toLowerCase().includes(filtroBusca.toLowerCase()) ||
                    p.aplicacaoVeicular.toLowerCase().includes(filtroBusca.toLowerCase())
                )
                .map((peca) => (
                  <div
                    key={peca.id}
                    onClick={() => {
                      biparOuBuscarCodigo(peca.sku);
                      setModalBuscaAberto(false);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0, 229, 255, 0.08)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.03)")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{peca.descricao}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                        SKU: {peca.sku} • EAN: {peca.codigoBarras.valor} • {peca.aplicacaoVeicular}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#34d399", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        {peca.precoVenda.formatar()}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: peca.estoqueBaixo ? "#f87171" : "var(--text-dim)" }}>
                        Estoque: {peca.estoqueAtual} un
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
