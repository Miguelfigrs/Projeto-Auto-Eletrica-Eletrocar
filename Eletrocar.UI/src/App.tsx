/**
 * Componente Principal: App
 * Orquestra as telas operacionais da Auto Elétrica Eletrocar, atalhos de teclado (F1-F12),
 * autenticação e status do leitor de código de barras.
 */
import React, { useState, useEffect } from "react";
import { Header } from "./presentation/components/Header";
import { LockScreenModal } from "./presentation/components/LockScreenModal";
import { BalcaoPDVView } from "./presentation/pages/BalcaoPDVView";
import { OrdensServicoView } from "./presentation/pages/OrdensServicoView";
import { CaixaView } from "./presentation/pages/CaixaView";
import { EstoqueView } from "./presentation/pages/EstoqueView";
import { FinanceiroDREView } from "./presentation/pages/FinanceiroDREView";
import { useAuth } from "./adapters/view-models/useAuth";
import { useHardwareStatus } from "./adapters/view-models/useHardwareStatus";
import { useCaixa } from "./adapters/view-models/useCaixa";
import { Lock, Zap, User, KeyRound } from "lucide-react";

export const App: React.FC = () => {
  const {
    usuario,
    carregando,
    lockScreenAberto,
    setLockScreenAberto,
    erroAuth,
    login,
    trocarOperadorPorPin,
  } = useAuth();

  const { status: hardwareStatus, modelo: hardwareModelo, simularLeitura } = useHardwareStatus();
  const { caixa } = useCaixa(usuario?.nome || "Operador");

  const [abaAtiva, setAbaAtiva] = useState<string>("balcao");
  const [loginEmail, setLoginEmail] = useState("admin");
  const [loginSenha, setLoginSenha] = useState("admin123");

  // Escuta de Teclas de Atalho Globais (F2 a F12)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Bloqueio / Lock Screen (F12)
      if (e.key === "F12") {
        e.preventDefault();
        setLockScreenAberto(true);
        return;
      }
      // F2 -> Balcão PDV
      if (e.key === "F2") {
        e.preventDefault();
        setAbaAtiva("balcao");
        return;
      }
      // F3 -> Ordens de Serviço
      if (e.key === "F3") {
        e.preventDefault();
        setAbaAtiva("os");
        return;
      }
      // F4 -> Peças & Estoque (quando não estiver digitando em input)
      if (e.key === "F4" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        setAbaAtiva("estoque");
        return;
      }
      // F6 -> Caixa & Turnos
      if (e.key === "F6") {
        e.preventDefault();
        setAbaAtiva("caixa");
        return;
      }
      // F7 -> Financeiro & DRE
      if (e.key === "F7") {
        e.preventDefault();
        setAbaAtiva("dre");
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setLockScreenAberto]);

  if (carregando) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-main)",
          color: "var(--cyan-primary)",
        }}
      >
        <Zap size={36} className="pulse" />
      </div>
    );
  }

  // Se não houver operador logado, exibe tela de login inicial
  if (!usuario) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-main)",
          padding: "20px",
        }}
      >
        <div
          className="glass-panel"
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "36px",
            textAlign: "center",
            border: "1px solid var(--border-cyan)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
            }}
          >
            <Zap size={28} color="#030712" />
          </div>

          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "4px" }}>
            AUTO ELÉTRICA ELETROCAR
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "24px" }}>
            Acesso ao Sistema Operacional & Balcão PDV
          </p>

          {erroAuth && (
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
              {erroAuth}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login(loginEmail, loginSenha);
            }}
            style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}
          >
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Usuário ou E-mail:
              </label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Senha:
              </label>
              <input
                type="password"
                required
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-main)",
                }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: "10px", padding: "12px" }}>
              Entrar no Sistema
            </button>
          </form>

          <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "20px" }}>
            Usuário padrão de demonstração: <strong>admin</strong> / Senha: <strong>admin123</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header com Navegação e Telemetria */}
      <Header
        usuario={usuario}
        hardwareStatus={hardwareStatus}
        hardwareModelo={hardwareModelo}
        caixaAberto={!!caixa?.estaAberto}
        turnoNumero={caixa?.turnoNumero}
        abaAtiva={abaAtiva}
        onSelecionarAba={setAbaAtiva}
        onAbrirLockScreen={() => setLockScreenAberto(true)}
        onSimularScan={() => {
          simularLeitura("7891049281023", () => {
            // Callback handled by listener
          });
        }}
      />

      {/* Conteúdo Dinâmico das Telas */}
      <main style={{ flex: 1 }}>
        {abaAtiva === "balcao" && <BalcaoPDVView operadorNome={usuario.nome} />}
        {abaAtiva === "os" && <OrdensServicoView />}
        {abaAtiva === "estoque" && (
          <EstoqueView
            onBiparPecaNoBalcao={(codigo) => {
              setAbaAtiva("balcao");
            }}
          />
        )}
        {abaAtiva === "caixa" && <CaixaView operadorNome={usuario.nome} />}
        {abaAtiva === "dre" && <FinanceiroDREView />}
      </main>

      {/* Modal Lock Screen para troca ágil de operador por PIN (F12) */}
      <LockScreenModal
        aberto={lockScreenAberto}
        onFechar={() => setLockScreenAberto(false)}
        onAutenticarPorPin={trocarOperadorPorPin}
        erro={erroAuth}
      />
    </div>
  );
};

export default App;
