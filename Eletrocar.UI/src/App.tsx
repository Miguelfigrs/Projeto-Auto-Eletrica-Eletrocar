/**
 * Componente Principal: App
 * Orquestra as telas operacionais da Auto Elétrica Eletrocar, atalhos de teclado (F1-F12),
 * autenticação e status do leitor de código de barras.
 */
import React, { useState, useEffect } from "react";
import { AppShell } from "./presentation/components/AppShell";
import { BrandMark, BrandWordmark } from "./presentation/components/ui";
import { LockScreenModal } from "./presentation/components/LockScreenModal";
import { BalcaoPDVView } from "./presentation/pages/BalcaoPDVView";
import { OrdensServicoView } from "./presentation/pages/OrdensServicoView";
import { CaixaView } from "./presentation/pages/CaixaView";
import { EstoqueView } from "./presentation/pages/EstoqueView";
import { FinanceiroDREView } from "./presentation/pages/FinanceiroDREView";
import { useAuth } from "./adapters/view-models/useAuth";
import { useHardwareStatus } from "./adapters/view-models/useHardwareStatus";
import { useCaixa } from "./adapters/view-models/useCaixa";
import { AlertCircle, ArrowRight, ScanBarcode, Wrench, Wallet } from "lucide-react";

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
      if (e.key === "F12") {
        e.preventDefault();
        setLockScreenAberto(true);
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        setAbaAtiva("balcao");
        return;
      }
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
      if (e.key === "F6") {
        e.preventDefault();
        setAbaAtiva("caixa");
        return;
      }
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
      <div className="grid min-h-screen place-items-center bg-canvas">
        <BrandMark size={52} className="animate-pulse" />
      </div>
    );
  }

  // Tela de login
  if (!usuario) {
    return (
      <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.1fr_1fr]">
        {/* Painel da marca */}
        <div className="relative hidden overflow-hidden border-r border-line bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div
            className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, rgb(225 29 42 / 0.35), transparent 65%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />

          <div className="relative flex items-center gap-4">
            <BrandMark size={52} />
            <BrandWordmark />
          </div>

          <div className="relative max-w-md">
            <div className="mb-5 h-1 w-14 rounded-full bg-brand" />
            <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide text-fg">
              Oficina, balcão e caixa
              <span className="text-brand"> no mesmo lugar.</span>
            </h1>
            <p className="mt-5 text-base text-fg-muted">
              Venda peças com leitor de código de barras, acompanhe cada ordem de serviço e feche o
              turno com o caixa conferido.
            </p>
          </div>

          <ul className="relative grid grid-cols-3 gap-3 text-sm">
            {[
              { icon: ScanBarcode, t: "Balcão PDV" },
              { icon: Wrench, t: "Ordens de serviço" },
              { icon: Wallet, t: "Caixa & turnos" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="card flex items-center gap-2 px-3 py-3 text-fg-muted">
                <Icon size={16} className="text-brand" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Formulário */}
        <div className="flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-[380px]">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <BrandMark size={44} />
              <BrandWordmark />
            </div>

            <h2 className="text-2xl font-semibold text-fg">Entrar no sistema</h2>
            <p className="mt-1 text-sm text-fg-muted">Use seu usuário e senha de operador.</p>

            {erroAuth && (
              <div className="alert alert-neg mt-6">
                <AlertCircle size={18} className="shrink-0" />
                {erroAuth}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                login(loginEmail, loginSenha);
              }}
              className="mt-8 flex flex-col gap-5"
            >
              <div>
                <label className="label" htmlFor="login-usuario">
                  Usuário ou e-mail
                </label>
                <input
                  id="login-usuario"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="field h-11"
                />
              </div>

              <div>
                <label className="label" htmlFor="login-senha">
                  Senha
                </label>
                <input
                  id="login-senha"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  className="field h-11"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg mt-2 w-full">
                Entrar <ArrowRight size={18} />
              </button>
            </form>

            <p className="mt-8 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-fg-muted">
              Acesso de demonstração: <strong className="text-fg">admin</strong> /{" "}
              <strong className="text-fg">admin123</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell
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
      >
        {abaAtiva === "balcao" && <BalcaoPDVView operadorNome={usuario.nome} />}
        {abaAtiva === "os" && <OrdensServicoView />}
        {abaAtiva === "estoque" && <EstoqueView onBiparPecaNoBalcao={() => setAbaAtiva("balcao")} />}
        {abaAtiva === "caixa" && <CaixaView operadorNome={usuario.nome} />}
        {abaAtiva === "dre" && <FinanceiroDREView />}
      </AppShell>

      {/* Modal Lock Screen para troca ágil de operador por PIN (F12) */}
      <LockScreenModal
        aberto={lockScreenAberto}
        onFechar={() => setLockScreenAberto(false)}
        onAutenticarPorPin={trocarOperadorPorPin}
        erro={erroAuth}
      />
    </>
  );
};

export default App;
