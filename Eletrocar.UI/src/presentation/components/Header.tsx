/**
 * Componente: Header
 * Barra de topo com identidade visual Eletrocar, monitor de hardware do leitor,
 * status do caixa, status do operador ativo e atalho F12 para troca rápida por PIN.
 */
import React from "react";
import {
  Zap,
  Barcode,
  Lock,
  User,
  ShieldAlert,
  Wallet,
  Wifi,
} from "lucide-react";
import { DeviceStatus } from "../../application/ports/gateways/IBarcodeReaderGateway";
import { Usuario } from "../../domain/entities/Usuario";

interface HeaderProps {
  usuario: Usuario | null;
  hardwareStatus: DeviceStatus;
  hardwareModelo: string;
  caixaAberto: boolean;
  turnoNumero?: number;
  abaAtiva: string;
  onSelecionarAba: (aba: string) => void;
  onAbrirLockScreen: () => void;
  onSimularScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  usuario,
  hardwareStatus,
  hardwareModelo,
  caixaAberto,
  turnoNumero,
  abaAtiva,
  onSelecionarAba,
  onAbrirLockScreen,
  onSimularScan,
}) => {
  const getBadgeClass = (status: DeviceStatus) => {
    switch (status) {
      case "CONECTADO":
        return "badge-connected";
      case "STANDBY":
        return "badge-standby";
      case "DESCONECTADO":
        return "badge-disconnected";
    }
  };

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 15, 29, 0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Barra superior de status e telemetria */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Badge do Leitor de Código de Barras */}
          <div
            title={`Hardware: ${hardwareModelo}`}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span className={`status-badge ${getBadgeClass(hardwareStatus)}`}>
              <Barcode size={13} />
              {hardwareStatus === "CONECTADO"
                ? "🟢 Leitor USB/BT Ativo"
                : hardwareStatus === "STANDBY"
                ? "🟡 Leitor em Standby"
                : "🔴 Leitor Desconectado"}
            </span>
            <button
              onClick={onSimularScan}
              style={{
                background: "none",
                border: "none",
                color: "var(--cyan-primary)",
                fontSize: "0.75rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              (Testar Bip)
            </button>
          </div>

          {/* Status do Caixa */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Wallet size={14} color={caixaAberto ? "#34d399" : "#f87171"} />
            <span>
              {caixaAberto ? `Caixa Aberto (Turno #${turnoNumero || 12})` : "Caixa Fechado"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* PWA / Status Offline */}
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34d399" }}>
            <Wifi size={13} /> PWA Online
          </span>

          {/* Operador Ativo & Lock Screen */}
          {usuario && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={14} color="var(--cyan-primary)" />
                <strong style={{ color: "var(--text-main)" }}>{usuario.nome}</strong>
                <span
                  style={{
                    background: "rgba(0, 229, 255, 0.12)",
                    color: "var(--cyan-primary)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {usuario.papeis.join(" / ")}
                </span>
              </div>

              <button
                onClick={onAbrirLockScreen}
                title="Trocar operador ou bloquear terminal (F12)"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-main)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                <Lock size={12} /> Bloquear (F12)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navegação Principal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(0, 229, 255, 0.4)",
            }}
          >
            <Zap size={22} color="#030712" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              ELETROCAR{" "}
              <span style={{ color: "var(--cyan-primary)", fontWeight: 400 }}>AUTO ELÉTRICA</span>
            </h1>
            <p style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
              Sistema Operacional & Balcão PDV • Clean Architecture
            </p>
          </div>
        </div>

        {/* Abas do Sistema */}
        <nav style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "balcao", label: "Balcão & PDV", atalho: "F2" },
            { id: "os", label: "Ordens de Serviço", atalho: "F3" },
            { id: "estoque", label: "Peças & Estoque", atalho: "F4" },
            { id: "caixa", label: "Caixa & Turnos", atalho: "F6" },
            { id: "dre", label: "Financeiro & DRE", atalho: "F7" },
          ].map((item) => {
            const ativa = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelecionarAba(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: ativa ? "rgba(0, 229, 255, 0.14)" : "transparent",
                  color: ativa ? "var(--cyan-primary)" : "var(--text-muted)",
                  border: ativa ? "1px solid var(--border-cyan)" : "1px solid transparent",
                  fontWeight: ativa ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    background: ativa ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.06)",
                    color: ativa ? "#ffffff" : "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {item.atalho}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
