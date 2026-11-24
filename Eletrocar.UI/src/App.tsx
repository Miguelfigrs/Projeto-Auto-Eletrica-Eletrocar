/**
 * Componente Principal: App
 * Orquestra as telas operacionais da Auto Elétrica Eletrocar, atalhos de teclado (F1-F12),
 * autenticação e status do leitor de código de barras.
 */
import React, { useState, useEffect } from "react";
import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import { AppShell, NAV_ITENS, temAcessoAba } from "./presentation/components/AppShell";
import { BrandMark, Page } from "./presentation/components/ui";
import { LoginView } from "./presentation/components/LoginView";
import { LockScreenModal } from "./presentation/components/LockScreenModal";
import { OverviewView } from "./presentation/pages/OverviewView";
import { BalcaoPDVView } from "./presentation/pages/BalcaoPDVView";
import { OrdensServicoView } from "./presentation/pages/OrdensServicoView";
import { CaixaView } from "./presentation/pages/CaixaView";
import { EstoqueView } from "./presentation/pages/EstoqueView";
import { FinanceiroDREView } from "./presentation/pages/FinanceiroDREView";
import { UsuariosView } from "./presentation/pages/UsuariosView";
import { useAuth } from "./adapters/view-models/useAuth";
import { useHardwareStatus } from "./adapters/view-models/useHardwareStatus";
import { useCaixa } from "./adapters/view-models/useCaixa";
import { Usuario } from "./domain/entities/Usuario";

function abaInicialPorPerfil(usuario: Usuario): string {
  if (usuario.ehAdmin) return "overview";
  if (usuario.ehBalconista) return "balcao";
  if (usuario.ehEletricista) return "os";
  return "overview";
}

export const App: React.FC = () => {
  const {
    usuario,
    operadoresRapidos,
    carregando,
    autenticando,
    lockScreenAberto,
    setLockScreenAberto,
    erroAuth,
    setErroAuth,
    login,
    trocarOperadorPorPin,
    logout,
    recarregarSessaoEOperadores,
  } = useAuth();

  const { status: hardwareStatus, modelo: hardwareModelo, simularLeitura } = useHardwareStatus();
  const { caixa } = useCaixa(usuario?.nome || "Operador");

  const [abaAtiva, setAbaAtiva] = useState<string>("overview");
  const [modoDidatico, setModoDidatico] = useState<boolean>(true);
  const [codigoPendente, setCodigoPendente] = useState<string | null>(null);

  // Escuta de Teclas de Atalho Globais (F1 a F12) quando autenticado
  useEffect(() => {
    if (!usuario) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        setErroAuth(null);
        setLockScreenAberto(true);
        return;
      }
      if (e.key === "F1") {
        e.preventDefault();
        setAbaAtiva("overview");
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
      // F4 -> Peças & Estoque (quando não estiver digitando em campo de formulário)
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "F4" && tag !== "INPUT" && tag !== "TEXTAREA") {
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
      if (e.key === "F8") {
        e.preventDefault();
        setAbaAtiva("usuarios");
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [usuario, setErroAuth, setLockScreenAberto]);

  const handleLogin = async (
    identificador: string,
    senha: string,
    lembrarSessao: boolean
  ) => {
    const logado = await login(identificador, senha, lembrarSessao);
    if (logado) {
      setAbaAtiva(abaInicialPorPerfil(logado));
    }
    return logado;
  };

  const handleLogout = async () => {
    setCodigoPendente(null);
    await logout();
  };

  const handleAbrirLockScreen = () => {
    setErroAuth(null);
    setLockScreenAberto(true);
  };

  const handleFecharLockScreen = () => {
    setErroAuth(null);
    setLockScreenAberto(false);
  };

  if (carregando) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <BrandMark size={52} className="animate-pulse" />
      </div>
    );
  }

  // Sem sessão ativa: exige autenticação explícita na tela de Login moderna
  if (!usuario) {
    return (
      <LoginView
        operadoresRapidos={operadoresRapidos}
        autenticando={autenticando}
        erroAuth={erroAuth}
        onLogin={handleLogin}
      />
    );
  }

  const acessoPermitido = temAcessoAba(usuario, abaAtiva);
  const infoAbaRestrita = NAV_ITENS.find((item) => item.id === abaAtiva);

  return (
    <>
      <AppShell
        usuario={usuario}
        hardwareStatus={hardwareStatus}
        hardwareModelo={hardwareModelo}
        caixaAberto={!!caixa?.estaAberto}
        rotuloTurno={caixa?.rotuloTurno}
        abaAtiva={abaAtiva}
        modoDidatico={modoDidatico}
        onAlternarModoDidatico={() => setModoDidatico((v) => !v)}
        onSelecionarAba={setAbaAtiva}
        onAbrirLockScreen={handleAbrirLockScreen}
        onLogout={handleLogout}
        onSimularScan={() => {
          setAbaAtiva("balcao");
          simularLeitura("7891049281023", () => {
            // Tratado pelo listener do PDV
          });
        }}
      >
        {!acessoPermitido ? (
          <Page className="max-w-2xl">
            <div className="card p-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-brand-line bg-brand-soft text-brand-text">
                <ShieldAlert size={30} />
              </div>
              <div className="eyebrow mt-5 text-brand-text">Controle de Acesso (RBAC)</div>
              <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-fg">
                Módulo restrito ao seu perfil
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-fg-muted">
                O operador <strong className="text-fg">{usuario.nome}</strong> possui perfil{" "}
                <strong className="text-fg">{usuario.papeis.join(", ")}</strong> e não tem permissão
                para abrir <strong className="text-fg">{infoAbaRestrita?.label ?? abaAtiva}</strong>.
              </p>
              <div className="mt-4 rounded-xl border border-line bg-canvas/80 p-4 text-left text-xs leading-relaxed text-fg-muted">
                <strong className="text-fg">Por que isso existe na oficina?</strong>
                <br />
                A segregação de funções (RBAC) evita que operadores técnicos alterem fechamentos de
                caixa ou acessem o DRE financeiro e custos de compra (CMV). Use o PIN do Dono/Admin
                para autorizar ou volte ao seu fluxo normal.
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAbaAtiva(abaInicialPorPerfil(usuario))}
                  className="btn btn-secondary"
                >
                  <ArrowLeft size={16} /> Voltar para minha tela inicial
                </button>
                <button type="button" onClick={handleAbrirLockScreen} className="btn btn-primary">
                  <Lock size={16} /> Trocar operador por PIN (F12)
                </button>
              </div>
            </div>
          </Page>
        ) : (
          <>
            {abaAtiva === "overview" && (
              <OverviewView
                usuario={usuario}
                caixa={caixa}
                modoDidatico={modoDidatico}
                onIrParaAba={setAbaAtiva}
                onAbrirLockScreen={handleAbrirLockScreen}
              />
            )}
            {abaAtiva === "balcao" && (
              <BalcaoPDVView
                operadorNome={usuario.nome}
                caixaAberto={!!caixa?.estaAberto}
                modoDidatico={modoDidatico}
                codigoPendente={codigoPendente}
                onCodigoPendenteConsumido={() => setCodigoPendente(null)}
                onIrParaCaixa={() => setAbaAtiva("caixa")}
              />
            )}
            {abaAtiva === "os" && <OrdensServicoView modoDidatico={modoDidatico} />}
            {abaAtiva === "estoque" && (
              <EstoqueView
                modoDidatico={modoDidatico}
                onBiparPecaNoBalcao={(codigo) => {
                  setCodigoPendente(codigo);
                  setAbaAtiva("balcao");
                }}
              />
            )}
            {abaAtiva === "caixa" && (
              <CaixaView operadorNome={usuario.nome} modoDidatico={modoDidatico} />
            )}
            {abaAtiva === "dre" && <FinanceiroDREView modoDidatico={modoDidatico} />}
            {abaAtiva === "usuarios" && (
              <UsuariosView
                usuarioAtual={usuario}
                modoDidatico={modoDidatico}
                onUsuariosAlterados={recarregarSessaoEOperadores}
              />
            )}
          </>
        )}
      </AppShell>

      {/* Modal Lock Screen para troca ágil de operador por PIN (F12) */}
      <LockScreenModal
        aberto={lockScreenAberto}
        operadoresRapidos={operadoresRapidos}
        usuarioAtualId={usuario.id}
        onFechar={handleFecharLockScreen}
        onAutenticarPorPin={trocarOperadorPorPin}
        onLogout={handleLogout}
        erro={erroAuth}
      />
    </>
  );
};

export default App;
