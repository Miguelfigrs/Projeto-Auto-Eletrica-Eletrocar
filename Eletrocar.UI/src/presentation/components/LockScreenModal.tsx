/**
 * Componente: LockScreenModal
 * Tela de bloqueio e troca rápida de operador por PIN de 4 dígitos.
 * Permite alternar o operador no balcão sem fechar o turno ou sair do sistema.
 */
import React, { useState } from "react";
import { Delete, Lock, X } from "lucide-react";
import { cn } from "../../lib/utils";

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

  const submeterPin = async (valorPin: string) => {
    setEnviando(true);
    await onAutenticarPorPin(valorPin);
    setEnviando(false);
    setPin("");
  };

  const handleDigito = (digito: string) => {
    if (pin.length < 6) {
      const novo = pin + digito;
      setPin(novo);
      if (novo.length === 4) {
        submeterPin(novo);
      }
    }
  };

  const teclaBase =
    "h-14 rounded-xl border border-line bg-surface-2 text-xl font-semibold text-fg transition-colors hover:bg-surface-3 active:scale-95 disabled:opacity-50";

  return (
    <div className="modal-overlay">
      <div className="modal relative max-w-[360px] px-7 pb-7 pt-9 text-center">
        <button
          type="button"
          onClick={onFechar}
          className="btn btn-ghost btn-icon absolute right-3 top-3"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-text">
          <Lock size={24} />
        </div>

        <h2 className="text-xl font-semibold text-fg">Troca rápida de operador</h2>
        <p className="mt-1 text-sm text-fg-muted">Digite seu PIN de 4 dígitos</p>

        <div className="my-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all",
                pin.length > idx ? "scale-110 border-brand bg-brand" : "border-line-strong"
              )}
            />
          ))}
        </div>

        {erro && <div className="alert alert-neg mb-5 justify-center text-xs">{erro}</div>}

        <div className="mx-auto grid max-w-[252px] grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button key={n} type="button" onClick={() => handleDigito(n)} disabled={enviando} className={teclaBase}>
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin("")}
            className={cn(teclaBase, "bg-transparent text-xs font-semibold uppercase tracking-wider text-fg-muted")}
          >
            Limpar
          </button>
          <button type="button" onClick={() => handleDigito("0")} disabled={enviando} className={teclaBase}>
            0
          </button>
          <button
            type="button"
            onClick={() => setPin((prev) => prev.slice(0, -1))}
            className={cn(teclaBase, "grid place-items-center bg-transparent text-fg-muted")}
            aria-label="Apagar dígito"
          >
            <Delete size={20} />
          </button>
        </div>

        <p className="mt-6 text-xs text-fg-subtle">
          PINs de teste: <strong className="text-fg-muted">1234</strong> (Admin) ·{" "}
          <strong className="text-fg-muted">1122</strong> (Carlos) ·{" "}
          <strong className="text-fg-muted">4321</strong> (Márcio)
        </p>
      </div>
    </div>
  );
};
