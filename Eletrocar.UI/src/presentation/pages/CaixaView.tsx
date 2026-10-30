/**
 * View: CaixaView
 * Gestão do fluxo de caixa diário, sangrias, suprimentos, conciliação e fechamento de turno.
 */
import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  PlusCircle,
  MinusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useCaixa } from "../../adapters/view-models/useCaixa";
import { FormaPagamento, TipoMovimentacaoCaixa } from "../../domain/value-objects/Enums";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";

interface CaixaViewProps {
  operadorNome: string;
}

export const CaixaView: React.FC<CaixaViewProps> = ({ operadorNome }) => {
  const {
    caixa,
    abrirTurno,
    fecharTurno,
    realizarSangria,
    realizarSuprimento,
    modalSangriaAberto,
    setModalSangriaAberto,
    modalSuprimentoAberto,
    setModalSuprimentoAberto,
    modalAberturaAberto,
    setModalAberturaAberto,
    mensagemSucesso,
    mensagemErro,
    setMensagemErro,
  } = useCaixa(operadorNome);

  const [valorSangria, setValorSangria] = useState("");
  const [motivoSangria, setMotivoSangria] = useState("");
  const [valorSuprimento, setValorSuprimento] = useState("");
  const [motivoSuprimento, setMotivoSuprimento] = useState("");
  const [saldoInicialAbertura, setSaldoInicialAbertura] = useState("200,00");

  const handleSubmeterSangria = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorSangria.replace(",", "."));
    if (!isNaN(val) && val > 0 && motivoSangria) {
      realizarSangria(val, motivoSangria);
      setValorSangria("");
      setMotivoSangria("");
    }
  };

  const handleSubmeterSuprimento = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorSuprimento.replace(",", "."));
    if (!isNaN(val) && val > 0 && motivoSuprimento) {
      realizarSuprimento(val, motivoSuprimento);
      setValorSuprimento("");
      setMotivoSuprimento("");
    }
  };

  const handleSubmeterAbertura = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(saldoInicialAbertura.replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      abrirTurno(val);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1500px", margin: "0 auto" }}>
      {/* Alertas */}
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

      {/* Cabeçalho do Caixa */}
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
            Caixa Operacional & Turnos
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Controle de sangrias, suprimentos de troco e fechamento com conciliação auditada.
          </p>
        </div>

        {caixa && caixa.estaAberto ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setModalSuprimentoAberto(true)}
              className="btn-secondary"
            >
              <PlusCircle size={16} color="#34d399" /> Suprimento de Troco
            </button>
            <button
              onClick={() => setModalSangriaAberto(true)}
              className="btn-secondary"
            >
              <MinusCircle size={16} color="#f87171" /> Sangria (Retirada)
            </button>
            <button
              onClick={fecharTurno}
              className="btn-danger"
            >
              <Lock size={16} /> Fechar Turno #{caixa.turnoNumero}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setModalAberturaAberto(true)}
            className="btn-primary"
          >
            <Wallet size={18} /> Abrir Novo Turno de Caixa
          </button>
        )}
      </div>

      {caixa && caixa.estaAberto ? (
        <>
          {/* Cards de Métricas em Tempo Real */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Fundo de Troco Inicial
              </span>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)", marginTop: "6px" }}>
                {caixa.saldoInicial.formatar()}
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Aberto às {caixa.dataAbertura.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Entradas em Dinheiro
              </span>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)", marginTop: "6px" }}>
                + {caixa.totalEntradasDinheiro.formatar()}
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Vendas & Suprimentos
              </span>
            </div>

            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Sangrias Realizadas
              </span>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f87171", fontFamily: "var(--font-mono)", marginTop: "6px" }}>
                - {caixa.totalSaidasDinheiro.formatar()}
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Recolhimentos para o cofre
              </span>
            </div>

            <div className="glass-panel" style={{ padding: "20px", border: "1px solid var(--border-cyan)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--cyan-primary)", textTransform: "uppercase", fontWeight: 700 }}>
                Saldo em Dinheiro na Gaveta
              </span>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--cyan-primary)", fontFamily: "var(--font-mono)", marginTop: "6px" }}>
                {caixa.saldoEsperadoEmDinheiro.formatar()}
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Valor físico obrigatório na contagem
              </span>
            </div>
          </div>

          {/* Resumo por Forma de Pagamento Eletrônico */}
          <div className="glass-panel" style={{ padding: "20px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "14px", color: "var(--text-main)" }}>
              Totalizador do Turno por Meio de Pagamento
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              {[
                { forma: FormaPagamento.DINHEIRO, label: "Dinheiro Físico" },
                { forma: FormaPagamento.PIX, label: "PIX Dinâmico" },
                { forma: FormaPagamento.CARTAO_CREDITO, label: "Cartão de Crédito" },
                { forma: FormaPagamento.CARTAO_DEBITO, label: "Cartão de Débito" },
              ].map((item) => (
                <div
                  key={item.forma}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>{item.label}</span>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "4px" }}>
                    {caixa.totalPorFormaPagamento(item.forma).formatar()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extrato / Livro Caixa */}
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
                Movimentações do Turno #{caixa.turnoNumero} ({caixa.movimentacoes.length})
              </h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.02)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.76rem" }}>
                  <th style={{ padding: "12px 18px" }}>Horário</th>
                  <th style={{ padding: "12px 18px" }}>Tipo</th>
                  <th style={{ padding: "12px 18px" }}>Descrição</th>
                  <th style={{ padding: "12px 18px" }}>Forma</th>
                  <th style={{ padding: "12px 18px" }}>Operador</th>
                  <th style={{ padding: "12px 18px", textAlign: "right" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {caixa.movimentacoes.map((mov) => {
                  const ehEntrada =
                    mov.tipo === TipoMovimentacaoCaixa.ENTRADA_VENDA ||
                    mov.tipo === TipoMovimentacaoCaixa.ENTRADA_OS ||
                    mov.tipo === TipoMovimentacaoCaixa.SUPRIMENTO;
                  return (
                    <tr key={mov.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={{ padding: "12px 18px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                        {new Date(mov.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span
                          style={{
                            background: ehEntrada ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: ehEntrada ? "#34d399" : "#f87171",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          {mov.tipo}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontWeight: 600 }}>{mov.descricao}</td>
                      <td style={{ padding: "12px 18px", color: "var(--text-muted)" }}>{mov.formaPagamento}</td>
                      <td style={{ padding: "12px 18px", color: "var(--text-dim)" }}>{mov.operadorNome}</td>
                      <td
                        style={{
                          padding: "12px 18px",
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: ehEntrada ? "#34d399" : "#f87171",
                        }}
                      >
                        {ehEntrada ? "+" : "-"} {mov.valor.formatar()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-dim)" }}>
          <Lock size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
            Nenhum Turno de Caixa Aberto
          </h3>
          <p style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 20px" }}>
            Para registrar vendas no balcão e emitir comprovantes, abra o turno com o fundo de troco inicial.
          </p>
          <button onClick={() => setModalAberturaAberto(true)} className="btn-primary">
            <Wallet size={18} /> Abrir Turno de Caixa
          </button>
        </div>
      )}

      {/* Modal Sangria */}
      {modalSangriaAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "440px", padding: "26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Realizar Sangria (Retirada)</h2>
              <button
                onClick={() => setModalSangriaAberto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmeterSangria} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Valor da Retirada (R$):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 150,00"
                  value={valorSangria}
                  onChange={(e) => setValorSangria(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Motivo da Sangria:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Recolhimento para cofre / pagamento avulso"
                  value={motivoSangria}
                  onChange={(e) => setMotivoSangria(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: "8px", padding: "12px" }}>
                Confirmar Sangria
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suprimento */}
      {modalSuprimentoAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "440px", padding: "26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Suprimento de Troco</h2>
              <button
                onClick={() => setModalSuprimentoAberto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmeterSuprimento} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Valor do Aporte (R$):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 100,00"
                  value={valorSuprimento}
                  onChange={(e) => setValorSuprimento(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Motivo do Suprimento:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troco adicional de moedas e notas de R$ 5"
                  value={motivoSuprimento}
                  onChange={(e) => setMotivoSuprimento(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: "8px", padding: "12px" }}>
                Confirmar Suprimento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Abertura de Turno */}
      {modalAberturaAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "440px", padding: "26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Abertura de Turno de Caixa</h2>
              <button
                onClick={() => setModalAberturaAberto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmeterAbertura} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Saldo Inicial de Troco (R$):
                </label>
                <input
                  type="text"
                  required
                  value={saldoInicialAbertura}
                  onChange={(e) => setSaldoInicialAbertura(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}
                />
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                Operador Responsável: <strong>{operadorNome}</strong>
              </p>
              <button type="submit" className="btn-primary" style={{ marginTop: "8px", padding: "12px" }}>
                Confirmar e Abrir Turno
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
