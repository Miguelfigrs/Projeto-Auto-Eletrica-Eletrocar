/**
 * Componente: AppShell
 * Estrutura principal: menu lateral grafite com a marca, navegação por atalhos (F2–F7),
 * cartão do operador e barra superior com telemetria do leitor e status do caixa.
 */
import React from "react";
import {
  ShoppingCart,
  Wrench,
  Package,
  Wallet,
  PieChart,
  Lock,
  ScanBarcode,
  Wifi,
} from "lucide-react";
import { DeviceStatus } from "../../application/ports/gateways/IBarcodeReaderGateway";
import { Usuario } from "../../domain/entities/Usuario";
import { BrandMark, BrandWordmark } from "./ui";
import { cn } from "../../lib/utils";

const NAV_ITENS = [
  { id: "balcao", label: "Balcão & PDV", atalho: "F2", icon: ShoppingCart },
  { id: "os", label: "Ordens de Serviço", atalho: "F3", icon: Wrench },
  { id: "estoque", label: "Peças & Estoque", atalho: "F4", icon: Package },
  { id: "caixa", label: "Caixa & Turnos", atalho: "F6", icon: Wallet },
  { id: "dre", label: "Financeiro & DRE", atalho: "F7", icon: PieChart },
] as const;

interface AppShellProps {
  usuario: Usuario;
  hardwareStatus: DeviceStatus;
  hardwareModelo: string;
  caixaAberto: boolean;
  turnoNumero?: number;
  abaAtiva: string;
  onSelecionarAba: (aba: string) => void;
  onAbrirLockScreen: () => void;
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

export const AppShell: React.FC<AppShellProps> = ({
  usuario,
  hardwareStatus,
  hardwareModelo,
  caixaAberto,
  turnoNumero,
  abaAtiva,
  onSelecionarAba,
  onAbrirLockScreen,
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
      {/* ---------------- Sidebar ---------------- */}
      <aside className="sticky top-0 flex h-screen w-[76px] shrink-0 flex-col border-r border-line bg-sidebar lg:w-[260px]">
        <div className="flex h-[72px] items-center gap-3 border-b border-line px-[18px] lg:px-5">
          <BrandMark size={40} />
          <BrandWordmark compact className="hidden lg:block" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="eyebrow mb-3 hidden px-3 lg:block">Operação</div>
          <ul className="flex flex-col gap-1">
            {NAV_ITENS.map((item) => {
              const ativa = abaAtiva === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionarAba(item.id)}
                    title={`${item.label} (${item.atalho})`}
                    aria-current={ativa ? "page" : undefined}
                    className={cn(
                      "group relative flex h-11 w-full items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors lg:justify-start",
                      ativa
                        ? "bg-surface-2 text-fg"
                        : "text-fg-muted hover:bg-surface hover:text-fg"
                    )}
                  >
                    {ativa && (
                      <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" />
                    )}
                    <Icon
                      size={19}
                      className={cn(ativa ? "text-brand" : "text-fg-subtle group-hover:text-fg-muted")}
                    />
                    <span className="hidden flex-1 text-left lg:block">{item.label}</span>
                    <span className="kbd hidden lg:inline-flex">{item.atalho}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Operador */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl p-2 lg:bg-surface">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-fg">
              {iniciais(usuario.nome)}
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="truncate text-sm font-semibold text-fg">{usuario.nome}</div>
              <div className="truncate text-[0.7rem] uppercase tracking-wider text-fg-subtle">
                {usuario.papeis.join(" · ")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onAbrirLockScreen}
            title="Trocar operador ou bloquear terminal (F12)"
            className="btn btn-ghost btn-sm mt-2 w-full"
          >
            <Lock size={14} />
            <span className="hidden lg:inline">Bloquear terminal</span>
            <span className="kbd hidden lg:inline-flex">F12</span>
          </button>
        </div>
      </aside>

      {/* ---------------- Conteúdo ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-fg-subtle sm:inline">Eletrocar</span>
            <span className="hidden text-fg-subtle sm:inline">/</span>
            <span className="truncate font-semibold text-fg">{paginaAtual?.label}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("chip", caixaAberto ? "chip-ok" : "chip-neg")}>
              <span className="dot" />
              {caixaAberto ? `Caixa aberto · Turno #${turnoNumero ?? "-"}` : "Caixa fechado"}
            </span>

            <span className={cn("chip hidden md:inline-flex", leitor.cls)} title={`Hardware: ${hardwareModelo}`}>
              <ScanBarcode size={13} />
              {leitor.txt}
            </span>

            <button
              type="button"
              onClick={onSimularScan}
              className="btn btn-secondary btn-sm hidden md:inline-flex"
              title="Simula a leitura de um código de barras"
            >
              Testar bip
            </button>

            <span className="chip hidden xl:inline-flex" title="Aplicativo online">
              <Wifi size={13} className="text-ok-text" /> Online
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
