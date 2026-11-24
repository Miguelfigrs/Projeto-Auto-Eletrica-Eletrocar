/**
 * Componente: AppShell
 * Estrutura principal em Chumbo + Vermelho Escuro:
 * menu lateral, navegação por atalhos (F1–F7), toggle de Modo Didático,
 * cartão do operador com troca por PIN (F12) e logout, e telemetria no topo.
 */
import React from "react";
import {
  BookOpen,
  LayoutDashboard,
  Lock,
  LogOut,
  LucideIcon,
  Package,
  PieChart,
  ScanBarcode,
  ShoppingCart,
  Users,
  Wallet,
  Wifi,
  Wrench,
} from "lucide-react";
import { DeviceStatus } from "../../application/ports/gateways/IBarcodeReaderGateway";
import { Usuario } from "../../domain/entities/Usuario";
import { BrandMark, BrandWordmark } from "./ui";
import { cn } from "../../lib/utils";

export interface NavItemConfig {
  id: string;
  label: string;
  atalho: string;
  icon: LucideIcon;
  somenteAdmin?: boolean;
}

export const NAV_ITENS: NavItemConfig[] = [
  { id: "overview", label: "Visão Geral", atalho: "F1", icon: LayoutDashboard },
  { id: "balcao", label: "Balcão & PDV", atalho: "F2", icon: ShoppingCart },
  { id: "os", label: "Ordens de Serviço", atalho: "F3", icon: Wrench },
  { id: "estoque", label: "Peças & Estoque", atalho: "F4", icon: Package },
  { id: "caixa", label: "Caixa & Turnos", atalho: "F6", icon: Wallet },
  { id: "dre", label: "Financeiro & DRE", atalho: "F7", icon: PieChart },
  { id: "usuarios", label: "Usuários", atalho: "F8", icon: Users, somenteAdmin: true },
];

interface AppShellProps {
  usuario: Usuario;
  hardwareStatus: DeviceStatus;
  hardwareModelo: string;
  caixaAberto: boolean;
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
      ? { cls: "chip-ok", txt: "Leitor conectado" }
      : hardwareStatus === "STANDBY"
      ? { cls: "chip-warn", txt: "Leitor em standby" }
      : { cls: "chip-neg", txt: "Leitor desconectado" };

  const paginaAtual = NAV_ITENS.find((n) => n.id === abaAtiva);

  return (
    <div className="flex min-h-screen">
      {/* ---------------- Sidebar Chumbo Profundo ---------------- */}
      <aside className="sticky top-0 flex h-screen w-[76px] shrink-0 flex-col border-r border-line bg-sidebar lg:w-[272px]">
        <div className="flex h-[72px] items-center gap-3 border-b border-line px-[18px] lg:px-5">
          <BrandMark size={40} />
          <BrandWordmark compact className="hidden lg:block" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="eyebrow mb-3 hidden px-3 lg:block">Navegação &amp; Atalhos</div>
          <ul className="flex flex-col gap-1.5">
            {NAV_ITENS.filter((item) => !item.somenteAdmin || usuario.ehAdmin).map((item) => {
              const ativa = abaAtiva === item.id;
              const Icon = item.icon;
              const permitido = temAcessoAba(usuario, item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionarAba(item.id)}
                    title={
                      permitido
                        ? `${item.label} (${item.atalho})`
                        : `${item.label} — acesso restrito ao perfil atual`
                    }
                    aria-current={ativa ? "page" : undefined}
                    className={cn(
                      "group relative flex h-11 w-full items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-all lg:justify-start",
                      ativa
                        ? "border border-brand-line/70 bg-linear-to-r from-brand-soft via-surface-2 to-surface-2 text-fg shadow-sm"
                        : "border border-transparent text-fg-muted hover:bg-surface hover:text-fg",
                      !permitido && "opacity-55"
                    )}
                  >
                    {ativa && (
                      <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-hover" />
                    )}
                    <Icon
                      size={18}
                      className={cn(
                        ativa ? "text-brand-text" : "text-fg-subtle group-hover:text-fg-muted"
                      )}
                    />
                    <span className="hidden flex-1 truncate text-left lg:block">{item.label}</span>
                    {!permitido ? (
                      <Lock size={13} className="hidden text-fg-subtle lg:inline-flex" />
                    ) : (
                      <span className="kbd hidden lg:inline-flex">{item.atalho}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Cartão do Operador + Troca por PIN + Logout */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/90 p-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand-line bg-brand-soft text-xs font-bold text-brand-text">
              {iniciais(usuario.nome)}
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="truncate text-sm font-semibold text-fg">{usuario.nome}</div>
              <div className="mt-0.5 truncate text-[0.68rem] uppercase tracking-wider text-fg-subtle">
                {usuario.papeis.join(" · ")}
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            <button
              type="button"
              onClick={onAbrirLockScreen}
              title="Trocar operador por PIN (F12)"
              className="btn btn-secondary btn-sm w-full"
            >
              <Lock size={13} />
              <span className="hidden lg:inline">PIN</span>
              <span className="kbd hidden lg:inline-flex">F12</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Encerrar sessão e voltar ao Login"
              className="btn btn-ghost btn-sm w-full hover:text-neg-text"
            >
              <LogOut size={13} />
              <span className="hidden lg:inline">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- Conteúdo ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-fg-subtle sm:inline">Eletrocar</span>
            <span className="hidden text-fg-subtle sm:inline">/</span>
            <span className="truncate font-semibold text-fg">{paginaAtual?.label}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onAlternarModoDidatico}
              title="Mostrar ou ocultar os guias explicativos das telas"
              className={cn(
                "chip transition-colors",
                modoDidatico ? "chip-brand" : "hover:border-line-strong hover:text-fg"
              )}
            >
              <BookOpen size={12} />
              <span className="hidden sm:inline">
                {modoDidatico ? "Guia Didático: Ativo" : "Guia Didático: Oculto"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelecionarAba("caixa")}
              className={cn("chip transition-opacity hover:opacity-90", caixaAberto ? "chip-ok" : "chip-neg")}
              title="Clique para abrir Caixa & Turnos"
            >
              <span className="dot" />
              {caixaAberto ? `Caixa aberto · Turno ${rotuloTurno ?? "-"}` : "Caixa fechado"}
            </button>

            <span
              className={cn("chip hidden md:inline-flex", leitor.cls)}
              title={`Hardware: ${hardwareModelo}`}
            >
              <ScanBarcode size={13} />
              {leitor.txt}
            </span>

            <button
              type="button"
              onClick={onSimularScan}
              className="btn btn-secondary btn-sm hidden lg:inline-flex"
              title="Simula a leitura de um código de barras no leitor"
            >
              Testar bip
            </button>

            <span
              className={cn("chip hidden xl:inline-flex", usuario.origemAuth === "API" ? "chip-ok" : "chip-info")}
              title={
                usuario.origemAuth === "API"
                  ? "Autenticado via FastAPI + PostgreSQL"
                  : "Sessão local de demonstração"
              }
            >
              <Wifi size={12} />
              {usuario.origemAuth === "API" ? "API Online" : "Demo Local"}
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
