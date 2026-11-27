/**
 * Componente: AppShell
 * Estrutura principal em Chumbo + Vermelho Escuro, pensada para leitura fácil:
 * menu lateral grande com uma frase explicando cada tela, atalhos F1–F8 visíveis,
 * cartão do operador com troca por PIN (F12) e saída, e um topo com só o essencial
 * (situação do caixa, do leitor e o botão de ajuda).
 */
import React from "react";
import {
  CircleHelp,
  LayoutDashboard,
  Lock,
  LogOut,
  LucideIcon,
  Package,
  PieChart,
  ScanBarcode,
  ShoppingCart,
  UserRoundPen,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { DeviceStatus } from "../../application/ports/gateways/IBarcodeReaderGateway";
import { Usuario } from "../../domain/entities/Usuario";
import { BrandMark, BrandWordmark } from "./ui";
import { cn } from "../../lib/utils";

export interface NavItemConfig {
  id: string;
  label: string;
  /** Frase curta, em linguagem do dia a dia, do que se faz na tela */
  dica: string;
  atalho: string;
  icon: LucideIcon;
  somenteAdmin?: boolean;
}

export const NAV_ITENS: NavItemConfig[] = [
  { id: "overview", label: "Visão Geral", dica: "Resumo do dia", atalho: "F1", icon: LayoutDashboard },
  { id: "balcao", label: "Balcão & PDV", dica: "Vender peças", atalho: "F2", icon: ShoppingCart },
  { id: "os", label: "Ordens de Serviço", dica: "Carros na oficina", atalho: "F3", icon: Wrench },
  { id: "estoque", label: "Peças & Estoque", dica: "Ver e repor peças", atalho: "F4", icon: Package },
  { id: "caixa", label: "Caixa & Turnos", dica: "Abrir e fechar o dia", atalho: "F6", icon: Wallet },
  { id: "dre", label: "Financeiro & DRE", dica: "Lucro do mês", atalho: "F7", icon: PieChart },
  { id: "usuarios", label: "Usuários", dica: "Funcionários", atalho: "F8", icon: Users, somenteAdmin: true },
];

interface AppShellProps {
  usuario: Usuario;
  hardwareStatus: DeviceStatus;
  hardwareModelo: string;
  caixaAberto: boolean;
  /** false para quem não usa o caixa (eletricista): o topo não mostra a situação do caixa. */
  mostrarCaixa?: boolean;
  rotuloTurno?: string;
  abaAtiva: string;
  modoDidatico: boolean;
  onAlternarModoDidatico: () => void;
  onSelecionarAba: (aba: string) => void;
  onAbrirLockScreen: () => void;
  onLogout: () => void;
  onSimularScan: () => void;
  children: React.ReactNode;
}

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const ROTULO_PAPEL: Record<string, string> = {
  ADMIN: "Dono",
  BALCONISTA: "Balcão",
  ELETRICISTA: "Eletricista",
};

export function temAcessoAba(usuario: Usuario, aba: string): boolean {
  if (usuario.ehAdmin) return true;
  if (aba === "dre" || aba === "usuarios") return false;
  if (aba === "balcao" || aba === "caixa") return usuario.ehBalconista;
  return true;
}

export const AppShell: React.FC<AppShellProps> = ({
  usuario,
  hardwareStatus,
  hardwareModelo,
  caixaAberto,
  mostrarCaixa = true,
  rotuloTurno,
  abaAtiva,
  modoDidatico,
  onAlternarModoDidatico,
  onSelecionarAba,
  onAbrirLockScreen,
  onLogout,
  onSimularScan,
  children,
}) => {
  const leitor =
    hardwareStatus === "CONECTADO"
      ? { cls: "chip-ok", txt: "Leitor ligado" }
      : hardwareStatus === "STANDBY"
      ? { cls: "chip-warn", txt: "Leitor em espera" }
      : { cls: "chip-neg", txt: "Leitor desligado" };

  const paginaAtual = NAV_ITENS.find((n) => n.id === abaAtiva);
  const itensVisiveis = NAV_ITENS.filter((item) => !item.somenteAdmin || usuario.ehAdmin);

  return (
    <div className="flex min-h-screen">
      {/* ---------------- Menu lateral ---------------- */}
      <aside className="sticky top-0 flex h-screen w-[84px] shrink-0 flex-col border-r border-line bg-sidebar lg:w-[320px]">
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-line px-[20px] lg:px-6">
          <BrandMark size={44} />
          <BrandWordmark compact className="hidden lg:block" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Telas do sistema">
          <ul className="flex flex-col gap-1.5">
            {itensVisiveis.map((item) => {
              const ativa = abaAtiva === item.id;
              const permitido = temAcessoAba(usuario, item.id);
              const Icon = permitido ? item.icon : Lock;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionarAba(item.id)}
                    title={
                      permitido
                        ? `${item.label} — ${item.dica} (tecla ${item.atalho})`
                        : `${item.label} — acesso restrito ao perfil atual`
                    }
                    aria-current={ativa ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-[58px] w-full items-center justify-center gap-3.5 rounded-2xl px-3 text-left transition-all lg:justify-start lg:px-4",
                      ativa
                        ? "border-2 border-brand-hover bg-linear-to-r from-brand-soft via-surface-2 to-surface-2 text-fg shadow-sm"
                        : "border-2 border-transparent text-fg-muted hover:border-line-strong hover:bg-surface hover:text-fg",
                      !permitido && "opacity-60"
                    )}
                  >
                    {ativa && (
                      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-brand-hover" />
                    )}
                    <Icon
                      size={24}
                      className={cn(ativa ? "text-brand-text" : "text-fg-subtle group-hover:text-fg-muted")}
                    />
                    <span className="hidden min-w-0 flex-1 lg:block">
                      <span className="block truncate text-base font-semibold leading-tight">{item.label}</span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate text-sm font-normal leading-tight",
                          ativa ? "text-fg-muted" : "text-fg-subtle"
                        )}
                      >
                        {permitido ? item.dica : "Sem acesso no seu perfil"}
                      </span>
                    </span>
                    {permitido && <span className="kbd hidden lg:inline-flex">{item.atalho}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Cartão do operador + Troca por PIN + Sair */}
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => onSelecionarAba("perfil")}
            title="Meu perfil: editar meus dados, senha e PIN"
            aria-current={abaAtiva === "perfil" ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition-colors",
              abaAtiva === "perfil"
                ? "border-brand-hover bg-brand-soft/60"
                : "border-line bg-surface/90 hover:border-line-strong hover:bg-surface-2"
            )}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brand-line bg-brand-soft text-sm font-bold text-brand-text">
              {iniciais(usuario.nome)}
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="truncate text-base font-semibold text-fg">{usuario.nome}</div>
              <div className="mt-0.5 truncate text-sm text-fg-subtle">
                {usuario.papeis.map((p) => ROTULO_PAPEL[p] ?? p).join(" · ")} · Meu perfil
              </div>
            </div>
            <UserRoundPen size={20} className="hidden shrink-0 text-fg-subtle lg:block" />
          </button>

          <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
            <button
              type="button"
              onClick={onAbrirLockScreen}
              title="Trocar operador por PIN (F12)"
              className="btn btn-secondary w-full px-3"
            >
              <Lock size={18} />
              <span className="hidden lg:inline">Trocar</span>
              <span className="kbd hidden xl:inline-flex">F12</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Encerrar sessão e voltar ao Login"
              className="btn btn-ghost w-full px-3 hover:text-neg-text"
            >
              <LogOut size={18} />
              <span className="hidden lg:inline">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- Conteúdo ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {paginaAtual && <paginaAtual.icon size={26} className="hidden shrink-0 text-brand-text sm:block" />}
            <div className="min-w-0">
              <div className="truncate text-xl font-bold text-fg">
                {paginaAtual?.label ?? (abaAtiva === "perfil" ? "Meu perfil" : "")}
              </div>
              {paginaAtual && (
                <div className="hidden truncate text-sm text-fg-subtle sm:block">{paginaAtual.dica}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {mostrarCaixa && (
              <button
                type="button"
                onClick={() => onSelecionarAba("caixa")}
                className={cn(
                  "chip min-h-11 px-4 text-sm transition-opacity hover:opacity-90",
                  caixaAberto ? "chip-ok" : "chip-neg"
                )}
                title="Abrir a tela do Caixa"
              >
                <span className="dot" />
                {caixaAberto ? (
                  <>
                    Caixa aberto<span className="hidden xl:inline"> · {rotuloTurno ?? "-"}</span>
                  </>
                ) : (
                  "Caixa fechado"
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onSimularScan}
              className={cn("chip hidden min-h-11 px-4 text-sm md:inline-flex", leitor.cls)}
              title={`${hardwareModelo}. Clique para testar o leitor com um código de exemplo.`}
            >
              <ScanBarcode size={18} />
              {leitor.txt}
            </button>

            <button
              type="button"
              onClick={onAlternarModoDidatico}
              aria-pressed={modoDidatico}
              title="Mostrar ou ocultar os guias explicativos das telas"
              className={cn("btn btn-sm", modoDidatico ? "btn-secondary border-brand-line!" : "btn-ghost")}
            >
              <CircleHelp size={18} className={modoDidatico ? "text-brand-text" : undefined} />
              <span className="hidden sm:inline">{modoDidatico ? "Ocultar ajuda" : "Mostrar ajuda"}</span>
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
