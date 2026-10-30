/**
 * View: OrdensServicoView
 * Gestão de Ordens de Serviço, ciclo de vida por Máquina de Estados,
 * checklist elétrico e simulação do Telegram Voice Bot com Whisper & IA.
 */
import React, { useState } from "react";
import {
  Wrench,
  Mic,
  Plus,
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Send,
  Zap,
  Activity,
  FileText,
  X,
} from "lucide-react";
import { useOrdensServico } from "../../adapters/view-models/useOrdensServico";
import { StatusOS, OrigemOS, PrioridadeOS } from "../../domain/value-objects/Enums";
import { OrdemServicoStateMachine } from "../../domain/entities/OrdemServico";

export const OrdensServicoView: React.FC = () => {
  const {
    ordens,
    filtroStatus,
    setFiltroStatus,
    osSelecionada,
    setOsSelecionada,
    avancarStatus,
    criarOS,
    simularEnvioAudioTelegram,
    modalNovaOSAberto,
    setModalNovaOSAberto,
    modalTelegramAberto,
    setModalTelegramAberto,
    mensagemSucesso,
    mensagemErro,
    setMensagemErro,
    simulandoAudio,
  } = useOrdensServico();

  // Estados do formulário de nova OS manual
  const [novoCliente, setNovoCliente] = useState("");
  const [novoCarro, setNovoCarro] = useState("");
  const [novaPlaca, setNovaPlaca] = useState("");
  const [novoSintomas, setNovoSintomas] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<PrioridadeOS>(PrioridadeOS.MEDIA);

  // Cenários do Telegram Voice Bot
  const cenariosVoz = [
    {
      titulo: "Alternador Gol do Carlos",
      eletricista: "Márcio (Baia 01)",
      audioTexto: "Gol do seu Carlos, alternador com defeito, bateria não carrega. Trocar regulador de voltagem.",
      cliente: "Carlos Alberto",
      carro: "Gol 1.6 MSI",
    },
    {
      titulo: "Motor de Partida Strada",
      eletricista: "Roberto (Baia 02)",
      audioTexto: "Strada do seu Julio, motor de partida tá estalando pesado e sem arranque. Verificar automático.",
      cliente: "Julio Mendes",
      carro: "Fiat Strada 1.4 Fire",
    },
    {
      titulo: "Faróis LED Hilux Frota",
      eletricista: "Márcio (Baia 01)",
      audioTexto: "Hilux da transportadora, instalar chicote elétrico dos faróis de milha de LED e relé duplo.",
      cliente: "Transportadora Rápido Vale",
      carro: "Hilux 2.8 D-4D",
    },
  ];

  const handleCriarOSManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliente || !novoCarro) return;
    criarOS({
      clienteNome: novoCliente,
      carroModelo: novoCarro,
      carroPlaca: novaPlaca || "ABC-1234",
      sintomas: novoSintomas || "Revisão geral da parte elétrica",
      prioridade: novaPrioridade,
      origem: OrigemOS.BALCAO,
    });
    setNovoCliente("");
    setNovoCarro("");
    setNovaPlaca("");
    setNovoSintomas("");
  };

  const getStatusCor = (status: StatusOS) => {
    switch (status) {
      case StatusOS.TRIAGEM:
        return "#a855f7"; // Roxo
      case StatusOS.ORCAMENTO_PENDENTE:
        return "#f59e0b"; // Âmbar
      case StatusOS.APROVADO:
        return "#00e5ff"; // Ciano
      case StatusOS.EM_EXECUCAO:
        return "#3b82f6"; // Azul
      case StatusOS.AGUARDANDO_PECA:
        return "#f97316"; // Laranja
      case StatusOS.TESTES_ELETRICOS:
        return "#eab308"; // Amarelo
      case StatusOS.FINALIZADO:
      case StatusOS.ENTREGUE:
        return "#10b981"; // Verde
      case StatusOS.CANCELADO:
        return "#ef4444"; // Vermelho
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
            <AlertTriangle size={18} />
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

      {/* Barra de Ações do Topo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "4px" }}>
            Fila de Oficina & Ordens de Serviço
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Máquina de estados finitos com transições auditadas e abertura por voz no Telegram.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setModalTelegramAberto(true)}
            className="btn-primary"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
              boxShadow: "0 4px 14px rgba(168, 85, 247, 0.3)",
            }}
          >
            <Mic size={18} /> Simular Voz Telegram
          </button>

          <button onClick={() => setModalNovaOSAberto(true)} className="btn-secondary">
            <Plus size={18} /> Nova OS Manual
          </button>
        </div>
      </div>

      {/* Filtros por Status (Tabs) */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "12px",
          marginBottom: "20px",
        }}
      >
        {[
          "TODOS",
          StatusOS.TRIAGEM,
          StatusOS.ORCAMENTO_PENDENTE,
          StatusOS.APROVADO,
          StatusOS.EM_EXECUCAO,
          StatusOS.TESTES_ELETRICOS,
          StatusOS.FINALIZADO,
        ].map((st) => {
          const ativo = filtroStatus === st;
          return (
            <button
              key={st}
              onClick={() => setFiltroStatus(st as StatusOS | "TODOS")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: ativo ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.03)",
                border: ativo ? "1px solid var(--border-cyan)" : "1px solid var(--border-subtle)",
                color: ativo ? "var(--text-main)" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: ativo ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {st}
            </button>
          );
        })}
      </div>

      {/* Grid de Cards de Ordens de Serviço */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "20px" }}>
        {ordens.map((os) => {
          const destinosPermitidos = OrdemServicoStateMachine.TRANSICOES_PERMITIDAS[os.status] || [];
          return (
            <div
              key={os.id}
              className="glass-panel"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                borderLeft: `4px solid ${getStatusCor(os.status)}`,
              }}
            >
              <div>
                {/* Header do Card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                        {os.numeroOS}
                      </span>
                      {os.origem === OrigemOS.TELEGRAM_VOICE && (
                        <span
                          title="Aberta via comando de voz no Telegram"
                          style={{
                            background: "rgba(168, 85, 247, 0.15)",
                            color: "#c084fc",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Mic size={10} /> Telegram Voz
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Cliente: <strong style={{ color: "var(--text-main)" }}>{os.clienteNome}</strong>
                    </div>
                  </div>

                  <span
                    style={{
                      background: `${getStatusCor(os.status)}22`,
                      color: getStatusCor(os.status),
                      border: `1px solid ${getStatusCor(os.status)}44`,
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {os.status.replace("_", " ")}
                  </span>
                </div>

                {/* Veículo & Placa */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    marginBottom: "12px",
                  }}
                >
                  <Car size={16} color="var(--cyan-primary)" />
                  <span style={{ fontWeight: 600 }}>{os.carroModelo}</span>
                  <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                    • {os.carroPlaca}
                  </span>
                </div>

                {/* Sintomas Relatados */}
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.4 }}>
                  <strong style={{ color: "var(--text-main)" }}>Sintomas: </strong>
                  {os.sintomas}
                </div>

                {/* Checklist Elétrico */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "6px", fontWeight: 600 }}>
                    CHECKLIST DE COMPONENTES ELÉTRICOS:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {Object.entries(os.checklistEletrico).map(([chave, checado]) => (
                      <span
                        key={chave}
                        style={{
                          background: checado ? "rgba(0, 229, 255, 0.15)" : "rgba(255, 255, 255, 0.04)",
                          color: checado ? "var(--cyan-primary)" : "var(--text-dim)",
                          border: checado ? "1px solid var(--border-cyan)" : "1px solid var(--border-subtle)",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: checado ? 700 : 500,
                        }}
                      >
                        {chave === "bateria"
                          ? "Bateria"
                          : chave === "alternador"
                          ? "Alternador"
                          : chave === "motorPartida"
                          ? "Motor Partida"
                          : chave === "iluminacao"
                          ? "Iluminação"
                          : "Injeção"}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Resumo Financeiro da OS */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Peças: {os.subtotalPecas.formatar()} • Serviços: {os.subtotalServicos.formatar()}
                  </span>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--cyan-primary)", fontFamily: "var(--font-mono)" }}>
                    {os.total.formatar()}
                  </div>
                </div>
              </div>

              {/* Botões de Transição da State Machine */}
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "6px" }}>
                  Avançar Ciclo de Vida:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {destinosPermitidos.map((dest) => (
                    <button
                      key={dest}
                      onClick={() => avancarStatus(os.id, dest)}
                      className={dest === StatusOS.CANCELADO ? "btn-danger" : "btn-secondary"}
                      style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                    >
                      <Play size={10} /> {dest.replace("_", " ")}
                    </button>
                  ))}
                  {destinosPermitidos.length === 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                      OS em estado terminal concluída.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Simulação Telegram Voice Bot */}
      {modalTelegramAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px", padding: "26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mic size={20} color="#c084fc" />
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Telegram Voice Bot • Oficina</h2>
              </div>
              <button
                onClick={() => setModalTelegramAberto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "18px" }}>
              O eletricista na baia de trabalho grava uma mensagem de voz no Telegram. O backend recebe o webhook, transcreve com Whisper ASR e extrai entidades com LLM:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {cenariosVoz.map((cenario, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
                      {cenario.titulo}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#c084fc", fontWeight: 600 }}>
                      {cenario.eletricista}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "10px" }}>
                    "{cenario.audioTexto}"
                  </p>
                  <button
                    onClick={() => simularEnvioAudioTelegram(cenario.audioTexto, cenario.cliente, cenario.carro)}
                    disabled={simulandoAudio}
                    className="btn-primary"
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "0.8rem",
                      background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                    }}
                  >
                    <Send size={14} /> {simulandoAudio ? "Transcrevendo Whisper..." : "Disparar Áudio do Mecânico"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova OS Manual */}
      {modalNovaOSAberto && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px", padding: "26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Abertura de Ordem de Serviço</h2>
              <button
                onClick={() => setModalNovaOSAberto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCriarOSManual} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Nome do Cliente:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Alberto"
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Veículo / Modelo:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gol 1.6 MSI"
                    value={novoCarro}
                    onChange={(e) => setNovoCarro(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Placa:
                  </label>
                  <input
                    type="text"
                    placeholder="FXT-4E12"
                    value={novaPlaca}
                    onChange={(e) => setNovaPlaca(e.target.value)}
                    style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Sintomas e Relato do Cliente:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Carro não dá partida, luz de bateria acesa..."
                  value={novoSintomas}
                  onChange={(e) => setNovoSintomas(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)", resize: "vertical" }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: "10px", padding: "12px" }}>
                <Check size={18} /> Confirmar Abertura de OS
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
