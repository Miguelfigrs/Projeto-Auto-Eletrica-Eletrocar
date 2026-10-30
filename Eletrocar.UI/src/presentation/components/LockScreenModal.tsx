/**
 * Componente: LockScreenModal
 * Tela de bloqueio e troca rápida de operador por PIN de 4 dígitos.
 * Permite alternar o operador no balcão sem fechar o turno ou sair do sistema.
 */
import React, { useState } from "react";
import { Lock, ShieldCheck, KeyRound, X } from "lucide-react";

interface LockScreenModalProps {
  aberto: boolean;
  onFechar: () => void;
  onAutenticarPorPin: (pin: string) => Promise<boolean>;
  erro: string | null;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  aberto,
  onFechar,
  onAutenticarPorPin,
  erro,
}) => {
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!aberto) return null;

  const handleDigito = (digito: string) => {
    if (pin.length < 6) {
      const novo = pin + digito;
      setPin(novo);
      if (novo.length === 4) {
        submeterPin(novo);
      }
    }
  };

  const handleLimpar = () => {
    setPin("");
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const submeterPin = async (valorPin: string) => {
    setEnviando(true);
    const sucesso = await onAutenticarPorPin(valorPin);
    setEnviando(false);
    if (sucesso) {
      setPin("");
    } else {
      setPin("");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "380px", padding: "28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
          <button
            onClick={onFechar}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(0, 229, 255, 0.12)",
            color: "var(--cyan-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            border: "1px solid var(--border-cyan)",
          }}
        >
          <Lock size={26} />
        </div>

        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "4px" }}>
          Troca Rápida de Operador
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
          Digite o PIN numérico do seu crachá/cadastro
        </p>

        {/* Indicadores Visuais de PIN */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {[0, 1, 2, 3].map((idx) => {
            const preenchido = pin.length > idx;
            return (
              <div
                key={idx}
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  border: "2px solid var(--border-cyan)",
                  background: preenchido ? "var(--cyan-primary)" : "transparent",
                  boxShadow: preenchido ? "0 0 10px rgba(0, 229, 255, 0.5)" : "none",
                  transition: "all 0.15s ease",
                }}
              />
            );
          })}
        </div>

        {erro && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "8px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              marginBottom: "16px",
            }}
          >
            {erro}
          </div>
        )}

        {/* Teclado Numérico */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            maxWidth: "240px",
            margin: "0 auto 16px",
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              onClick={() => handleDigito(n)}
              disabled={enviando}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                fontSize: "1.25rem",
                fontWeight: 600,
                padding: "14px 0",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
              onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(0.95)")}
              onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleLimpar}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              fontWeight: 600,
              padding: "14px 0",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            LIMPAR
          </button>
          <button
            onClick={() => handleDigito("0")}
            disabled={enviando}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-main)",
              fontSize: "1.25rem",
              fontWeight: 600,
              padding: "14px 0",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              fontWeight: 600,
              padding: "14px 0",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            ⌫
          </button>
        </div>

        <p style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
          Dica para teste rápido: <strong>1234</strong> (Admin), <strong>1122</strong> (Carlos), <strong>4321</strong> (Márcio)
        </p>
      </div>
    </div>
  );
};
