/**
 * Componente: LockScreenModal
 * Troca rápida de operador por PIN (F12), sem fechar o turno de caixa.
 * Dois passos simples: 1) tocar no próprio nome; 2) digitar o PIN (4 a 6 dígitos) e tocar em Entrar.
 * Os PINs nunca aparecem na tela; só a demonstração offline mostra os PINs de teste.
 */
import React, { useState, useEffect, useCallback } from "react";
import { Check, Delete, Lock, LogOut, UserCheck, X } from "lucide-react";
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

const PIN_MIN = 4;
const PIN_MAX = 6;

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
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setPin("");
      setAviso(null);
      setOperadorAlvoId(undefined);
    }
  }, [aberto]);

  const precisaEscolherNome = operadoresRapidos.length > 0;

  const submeter = useCallback(async () => {
    if (enviando) return;
    if (precisaEscolherNome && !operadorAlvoId) {
      setAviso("Primeiro toque no seu nome, depois digite o PIN.");
      return;
    }
    if (pin.length < PIN_MIN) {
      setAviso(`O PIN tem de ${PIN_MIN} a ${PIN_MAX} números.`);
      return;
    }
    setAviso(null);
    setEnviando(true);
    await onAutenticarPorPin(pin, operadorAlvoId);
    setEnviando(false);
    setPin("");
  }, [enviando, onAutenticarPorPin, operadorAlvoId, pin, precisaEscolherNome]);

  const handleDigito = useCallback(
    (digito: string) => {
      if (enviando) return;
      setAviso(null);
      setPin((atual) => (atual.length < PIN_MAX ? atual + digito : atual));
    },
    [enviando]
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
      } else if (e.key === "Enter") {
        e.preventDefault();
        void submeter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, handleDigito, onFechar, submeter]);

  if (!aberto) return null;

  const teclaBase =
    "h-14 rounded-2xl border border-line-strong bg-surface-2 text-2xl font-semibold text-fg transition-colors hover:bg-surface-3 active:scale-95 disabled:opacity-50";
  const operadorEscolhido = operadoresRapidos.find((op) => op.id === operadorAlvoId);

  return (
    <div className="modal-overlay">
      <div
        className={cn(
          "modal brand-stripe relative px-6 pb-6 pt-6 sm:px-8",
          precisaEscolherNome ? "max-w-[880px]" : "max-w-[460px]"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Trocar operador"
      >
        <button
          type="button"
          onClick={onFechar}
          className="btn btn-ghost btn-icon absolute right-3 top-3"
          aria-label="Fechar"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-3 pr-14">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-brand-line bg-brand-soft text-brand-text">
            <Lock size={24} />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-fg">Trocar operador</h2>
            <p className="text-base leading-snug text-fg-muted">
              O caixa continua aberto.{" "}
              {precisaEscolherNome ? "Toque no seu nome e digite o seu PIN." : "Digite o seu PIN."}
            </p>
          </div>
        </div>

        <div className={cn("mt-5 grid gap-6", precisaEscolherNome && "md:grid-cols-2")}>
          {precisaEscolherNome && (
            <div>
              <div className="label">1. Quem vai usar o sistema?</div>
              <div className="grid max-h-[340px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                {operadoresRapidos.map((op) => {
                  const escolhido = operadorAlvoId === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        setOperadorAlvoId(op.id);
                        setAviso(null);
                      }}
                      aria-pressed={escolhido}
                      className={cn(
                        "flex min-h-14 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-base font-semibold transition-colors",
                        escolhido
                          ? "border-brand-hover bg-brand-soft text-fg"
                          : "border-line-strong bg-surface-2 text-fg-muted hover:text-fg"
                      )}
                      title={op.pinDemo ? `PIN de teste: ${op.pinDemo}` : op.nome}
                    >
                      {escolhido ? (
                        <Check size={20} className="shrink-0 text-brand-text" />
                      ) : (
                        <UserCheck size={20} className="shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate">{op.nome.split(" ")[0]}</span>
                        {op.pinDemo && (
                          <span className="block font-mono text-sm font-normal text-fg-subtle">
                            PIN de teste {op.pinDemo}
                          </span>
                        )}
                        {op.id === usuarioAtualId && !op.pinDemo && (
                          <span className="block text-sm font-normal text-fg-subtle">usando agora</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="label text-left">
              {precisaEscolherNome ? "2. " : ""}Digite o PIN
              {operadorEscolhido ? ` de ${operadorEscolhido.nome.split(" ")[0]}` : ""}
            </div>
            <div className="my-3 flex justify-center gap-3" aria-label={`${pin.length} números digitados`}>
              {Array.from({ length: Math.max(PIN_MIN, pin.length) }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-all",
                    pin.length > idx ? "scale-110 border-brand-hover bg-brand-hover" : "border-line-strong"
                  )}
                />
              ))}
            </div>

            {(aviso || erro) && (
              <div className="alert alert-neg mb-3 justify-center text-base" role="alert">
                {aviso ?? erro}
              </div>
            )}

            <div className="mx-auto grid max-w-[320px] grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <button key={n} type="button" onClick={() => handleDigito(n)} disabled={enviando} className={teclaBase}>
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin((prev) => prev.slice(0, -1))}
                className={cn(teclaBase, "grid place-items-center bg-transparent text-fg-muted")}
                aria-label="Apagar último número"
              >
                <Delete size={26} />
              </button>
              <button type="button" onClick={() => handleDigito("0")} disabled={enviando} className={teclaBase}>
                0
              </button>
              <button
                type="button"
                onClick={() => setPin("")}
                className={cn(teclaBase, "bg-transparent text-base font-semibold text-fg-muted")}
              >
                Limpar
              </button>
            </div>

            <button
              type="button"
              onClick={() => void submeter()}
              disabled={enviando || pin.length < PIN_MIN}
              className="btn btn-primary btn-lg mx-auto mt-4 w-full max-w-[320px]"
            >
              <Check size={22} /> {enviando ? "Conferindo..." : "Entrar"}
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-line pt-4">
          <button type="button" onClick={onLogout} className="btn btn-ghost text-fg-muted hover:text-neg-text">
            <LogOut size={18} /> Sair do sistema
          </button>
        </div>
      </div>
    </div>
  );
};
