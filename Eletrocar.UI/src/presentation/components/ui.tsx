/**
 * Kit de componentes visuais compartilhados da Eletrocar.
 * Identidade visual: Chumbo metálico + Vermelho escuro automotivo.
 */
import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* -------------------------------------------------------------------------- */
/* Marca                                                                      */
/* -------------------------------------------------------------------------- */

export const BrandMark: React.FC<{ size?: number; className?: string }> = ({
  size = 42,
  className,
}) => (
  <div
    className={cn(
      "relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-brand-line bg-linear-to-br from-brand-hover via-brand to-brand-deep text-brand-fg shadow-[0_10px_26px_-8px_rgb(158_27_36/0.8)]",
      className
    )}
    style={{ width: size, height: size }}
    aria-hidden
  >
    <span
      className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/15 to-transparent"
    />
    <svg
      viewBox="0 0 24 24"
      width={size * 0.56}
      height={size * 0.56}
      fill="none"
      className="relative drop-shadow-sm"
    >
      <path
        d="M13.5 2.5L5.5 13.5H11.5L10 21.5L18.5 10.5H12.5L13.5 2.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export const BrandWordmark: React.FC<{ className?: string; compact?: boolean }> = ({
  className,
  compact,
}) => (
  <div className={cn("leading-none", className)}>
    <div
      className={cn(
        "font-display font-extrabold uppercase tracking-wider text-fg",
        compact ? "text-xl" : "text-2xl"
      )}
    >
      Eletro<span className="text-brand-text">car</span>
    </div>
    <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-fg-subtle">
      Auto Elétrica
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Layout de página                                                           */
/* -------------------------------------------------------------------------- */

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}> = ({ title, description, eyebrow, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <div className="eyebrow mb-1 text-brand-text">{eyebrow}</div>}
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-fg sm:text-[2.1rem]">
        {title}
      </h1>
      {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </div>
);

export const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-8 sm:py-8", className)}>
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Componentes Didáticos                                                      */
/* -------------------------------------------------------------------------- */

export const DidacticBanner: React.FC<{
  visivel?: boolean;
  titulo: string;
  resumo: string;
  passos?: string[];
  regraNegocio?: string;
  defaultAberto?: boolean;
}> = ({ visivel = true, titulo, resumo, passos = [], regraNegocio, defaultAberto = true }) => {
  const [aberto, setAberto] = useState(defaultAberto);

  if (!visivel) return null;

  return (
    <div className="didactic-box mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand-line bg-brand-soft text-brand-text">
            <BookOpen size={15} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-text">
                Guia Didático
              </span>
              <span className="text-xs text-fg-subtle">·</span>
              <span className="truncate text-sm font-semibold text-fg">{titulo}</span>
            </div>
            {!aberto && <p className="truncate text-xs text-fg-muted">{resumo}</p>}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-fg-muted">
          {aberto ? "Recolher" : "Ver passo a passo"}
          {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-line/80 px-4 pb-4 pt-3 sm:px-5">
          <p className="text-sm leading-relaxed text-fg-muted">{resumo}</p>

          {passos.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {passos.map((passo, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-line bg-canvas/65 px-3 py-2.5 text-xs text-fg-muted"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[0.68rem] font-bold text-brand-fg">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{passo}</span>
                </div>
              ))}
            </div>
          )}

          {regraNegocio && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-surface-2/70 px-3 py-2 text-xs text-fg-muted">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-text" />
              <span>
                <strong className="text-fg">Regra da oficina:</strong> {regraNegocio}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const StepFlow: React.FC<{
  passos: Array<{ numero: number; titulo: string; detalhe: string; ativo?: boolean; concluido?: boolean }>;
  className?: string;
}> = ({ passos, className }) => (
  <div className={cn("grid gap-2 sm:grid-cols-3", className)}>
    {passos.map((p) => (
      <div
        key={p.numero}
        className={cn(
          "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
          p.ativo
            ? "border-brand-line bg-brand-soft"
            : p.concluido
            ? "border-ok/30 bg-ok-soft"
            : "border-line bg-surface/80"
        )}
      >
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold",
            p.ativo
              ? "bg-brand text-brand-fg"
              : p.concluido
              ? "bg-ok/20 text-ok-text"
              : "bg-surface-2 text-fg-muted"
          )}
        >
          {p.concluido ? "✓" : p.numero}
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-fg">{p.titulo}</div>
          <div className="truncate text-[0.72rem] text-fg-muted">{p.detalhe}</div>
        </div>
      </div>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */

export const Alerts: React.FC<{
  sucesso?: string | null;
  erro?: string | null;
  aviso?: string | null;
  onFecharErro?: () => void;
}> = ({ sucesso, erro, aviso, onFecharErro }) => {
  if (!sucesso && !erro && !aviso) return null;
  return (
    <div className="mb-5 flex flex-col gap-2">
      {sucesso && (
        <div className="alert alert-ok" role="status">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}
      {aviso && (
        <div className="alert alert-warn" role="status">
          <Info size={18} className="shrink-0" />
          <span>{aviso}</span>
        </div>
      )}
      {erro && (
        <div className="alert alert-neg" role="alert">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{erro}</span>
          {onFecharErro && (
            <button
              type="button"
              onClick={onFecharErro}
              className="rounded-md p-1 opacity-70 hover:opacity-100"
              aria-label="Fechar alerta"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-fg-subtle shadow-inner">
      <Icon size={26} />
    </div>
    <p className="text-base font-semibold text-fg">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Indicadores                                                                */
/* -------------------------------------------------------------------------- */

type StatTone = "default" | "ok" | "neg" | "brand";

const toneText: Record<StatTone, string> = {
  default: "text-fg",
  ok: "text-ok-text",
  neg: "text-neg-text",
  brand: "text-fg",
};

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ElementType;
  tone?: StatTone;
}> = ({ label, value, hint, icon: Icon, tone = "default" }) => (
  <div
    className={cn(
      "card p-5",
      tone === "brand" &&
        "brand-stripe border-brand-line bg-linear-to-b from-brand-soft via-surface to-surface"
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <span className="eyebrow">{label}</span>
      {Icon && (
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border",
            tone === "brand"
              ? "border-brand-line bg-brand text-brand-fg shadow-md shadow-brand/30"
              : "border-line-strong bg-surface-2 text-fg-muted"
          )}
        >
          <Icon size={16} />
        </span>
      )}
    </div>
    <div className={cn("money mt-3 text-[1.75rem] font-semibold leading-none", toneText[tone])}>
      {value}
    </div>
    {hint && <div className="mt-2.5 text-xs text-fg-muted">{hint}</div>}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

export const Modal: React.FC<{
  aberto: boolean;
  onFechar: () => void;
  titulo?: React.ReactNode;
  descricao?: React.ReactNode;
  icon?: React.ElementType;
  largura?: number;
  children: React.ReactNode;
}> = ({ aberto, onFechar, titulo, descricao, icon: Icon, largura = 480, children }) => {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="modal brand-stripe" style={{ maxWidth: largura }} role="dialog" aria-modal="true">
        {titulo && (
          <div className="flex items-start gap-3 border-b border-line px-6 py-5">
            {Icon && (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text">
                <Icon size={18} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-fg">{titulo}</h2>
              {descricao && <p className="mt-0.5 text-sm text-fg-muted">{descricao}</p>}
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="btn btn-ghost btn-icon -mr-2 -mt-1"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};
