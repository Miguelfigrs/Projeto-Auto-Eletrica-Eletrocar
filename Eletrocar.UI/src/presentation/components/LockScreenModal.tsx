/**
 * Componente: LockScreenModal
 * Tela de bloqueio e troca rápida de operador por PIN de 4 dígitos.
 * Permite alternar o operador no balcão sem fechar o turno ou sair do sistema.
 */
import React, { useState, useEffect, useCallback } from "react";
import { Delete, Lock, LogOut, UserCheck, X } from "lucide-react";
import { OperadorRapidoInfo } from "../../application/ports/repositories/IAuthRepository";
import { cn } from "../../lib/utils";

interface LockScreenModalProps {
  aberto: boolean;
  operadoresRapidos: OperadorRapidoInfo[];
  usuarioAtualId?: string;
  onFechar: () => void;
  onAutenticarPorPin: (pin: string, usuarioId?: string) => Promise<boolean>;
  onLogout: () => void;
  erro: string | null;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  aberto,
  operadoresRapidos,
  usuarioAtualId,
  onFechar,
  onAutenticarPorPin,
  onLogout,
  erro,
}) => {
  const [pin, setPin] = useState("");
  const [operadorAlvoId, setOperadorAlvoId] = useState<string | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);

  const submeterPin = useCallback(
    async (valorPin: string, alvoId?: string) => {
      setEnviando(true);
      await onAutenticarPorPin(valorPin, alvoId);
      setEnviando(false);
      setPin("");
    },
    [onAutenticarPorPin]
  );

  const handleDigito = useCallback(
    (digito: string) => {
      if (enviando) return;
      if (pin.length < 6) {
        const novo = pin + digito;
        setPin(novo);
        if (novo.length === 4) {
          submeterPin(novo, operadorAlvoId);
        }
      }
    },
    [enviando, operadorAlvoId, pin, submeterPin]
  );

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onFechar();
      } else if (/^\d$/.test(e.key)) {
        handleDigito(e.key);
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, handleDigito, onFechar]);

  if (!aberto) return null;

  const teclaBase =
    "h-13 rounded-xl border border-line-strong bg-surface-2 text-xl font-semibold text-fg transition-colors hover:bg-surface-3 active:scale-95 disabled:opacity-50";

  return (
    <div className="modal-overlay">
      <div className="modal brand-stripe relative max-w-[410px] px-7 pb-7 pt-8 text-center">
        <button
          type="button"
          onClick={onFechar}
          className="btn btn-ghost btn-icon absolute right-3 top-3"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="mx-auto mb-3 grid h-13 w-13 place-items-center rounded-2xl border border-brand-line bg-brand-soft text-brand-text">
          <Lock size={22} />
        </div>

        <h2 className="text-xl font-semibold text-fg">Troca rápida de operador</h2>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          Altere quem opera o terminal sem fechar o turno de caixa. Digite o PIN de 4 dígitos no
          teclado ou clique em um operador.
        </p>

        {/* Seleção didática opcional do operador */}
        {operadoresRapidos.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {operadoresRapidos.map((op) => {
              const ativo = operadorAlvoId ? operadorAlvoId === op.id : op.id === usuarioAtualId;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setOperadorAlvoId(op.id)}
                  className={cn(
                    "chip h-7 px-2.5 text-[0.7rem] transition-colors",
                    ativo
                      ? "chip-brand"
                      : "hover:border-line-strong hover:text-fg"
                  )}
                  title={`PIN de teste: ${op.pinDemo}`}
                >
                  <UserCheck size={11} />
                  {op.username} · <span className="font-mono">{op.pinDemo}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="my-5 flex justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all",
                pin.length > idx
                  ? "scale-110 border-brand-hover bg-brand-hover"
                  : "border-line-strong"
              )}
            />
          ))}
        </div>

        {erro && <div className="alert alert-neg mb-4 justify-center text-xs">{erro}</div>}

        <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigito(n)}
              disabled={enviando}
              className={teclaBase}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin("")}
            className={cn(
              teclaBase,
              "bg-transparent text-xs font-semibold uppercase tracking-wider text-fg-muted"
            )}
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => handleDigito("0")}
            disabled={enviando}
            className={teclaBase}
          >
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

        <div className="mt-5 border-t border-line pt-4">
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-ghost btn-sm w-full text-fg-muted hover:text-neg-text"
          >
            <LogOut size={14} /> Encerrar sessão e voltar ao Login
          </button>
        </div>
      </div>
    </div>
  );
};
