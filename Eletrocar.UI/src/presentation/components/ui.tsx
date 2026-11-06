/**
 * Kit de componentes visuais compartilhados da Eletrocar.
 * Mantém a identidade (vermelho + grafite) consistente entre as telas.
 */
import React, { useEffect } from "react";
import { AlertCircle, CheckCircle2, X, Zap } from "lucide-react";
import { cn } from "../../lib/utils";

/* -------------------------------------------------------------------------- */
/* Marca                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Símbolo provisório da marca. Quando a logo oficial estiver pronta,
 * substitua o conteúdo deste componente por <img src="/logo.svg" ... />.
 */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className,
}) => (
  <div
    className={cn(
      "relative grid shrink-0 place-items-center rounded-xl bg-brand text-white shadow-[0_8px_24px_-8px_rgb(225_29_42/0.7)]",
      className
    )}
    style={{ width: size, height: size }}
    aria-hidden
  >
    <Zap size={size * 0.52} strokeWidth={2.5} fill="currentColor" />
  </div>
);

export const BrandWordmark: React.FC<{ className?: string; compact?: boolean }> = ({
  className,
  compact,
}) => (
  <div className={cn("leading-none", className)}>
    <div
      className={cn(
        "font-display font-extrabold uppercase tracking-wide text-fg",
        compact ? "text-xl" : "text-2xl"
      )}
    >
      Eletro<span className="text-brand">car</span>
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
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-fg">{title}</h1>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn("mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-8 sm:py-8", className)}>{children}</div>;

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */

export const Alerts: React.FC<{
  sucesso?: string | null;
  erro?: string | null;
  onFecharErro?: () => void;
}> = ({ sucesso, erro, onFecharErro }) => {
  if (!sucesso && !erro) return null;
  return (
    <div className="mb-5 flex flex-col gap-2">
      {sucesso && (
        <div className="alert alert-ok" role="status">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{sucesso}</span>
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
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface-2 text-fg-subtle">
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
      tone === "brand" && "brand-stripe border-brand-line bg-linear-to-b from-brand-soft to-surface"
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <span className="eyebrow">{label}</span>
      {Icon && (
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg",
            tone === "brand" ? "bg-brand text-white" : "bg-surface-2 text-fg-muted"
          )}
        >
          <Icon size={16} />
        </span>
      )}
    </div>
    <div className={cn("money mt-3 text-[1.7rem] font-semibold leading-none", toneText[tone])}>
      {value}
    </div>
    {hint && <div className="mt-2 text-xs text-fg-muted">{hint}</div>}
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
      <div className="modal" style={{ maxWidth: largura }} role="dialog" aria-modal="true">
        {titulo && (
          <div className="flex items-start gap-3 border-b border-line px-6 py-5">
            {Icon && (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text">
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
