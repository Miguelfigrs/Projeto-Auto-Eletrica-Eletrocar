/**
 * View: LoginView
 * Tela de autenticação moderna e didática da Auto Elétrica Eletrocar.
 * Explica os fluxos da oficina, perfis de acesso (RBAC) e permite login
 * tradicional ou acesso guiado por perfis de demonstração.
 */
import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  PieChart,
  ScanBarcode,
  ShieldCheck,
  UserCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import { OperadorRapidoInfo } from "../../application/ports/repositories/IAuthRepository";
import { Papel } from "../../domain/value-objects/Enums";
import { BrandMark, BrandWordmark } from "./ui";
import { cn } from "../../lib/utils";

interface LoginViewProps {
  operadoresRapidos: OperadorRapidoInfo[];
  autenticando: boolean;
  erroAuth: string | null;
  onLogin: (usernameOuEmail: string, senha: string, lembrarSessao: boolean) => Promise<unknown>;
}

const PAPEL_BADGE: Record<Papel, string> = {
  [Papel.ADMIN]: "Dono / Admin",
  [Papel.BALCONISTA]: "Balcão & Caixa",
  [Papel.ELETRICISTA]: "Oficina / OS",
};

const MODULOS_DIDATICOS = [
  {
    icon: ShieldCheck,
    titulo: "1. Acesso por Perfil (RBAC)",
    texto: "Cada colaborador visualiza os módulos da sua função, com troca ágil por PIN (F12).",
  },
  {
    icon: ScanBarcode,
    titulo: "2. Balcão PDV Sem Perda de Foco",
    texto: "Leitor USB/Bluetooth captura códigos EAN-13, calcula troco e baixa estoque na hora.",
  },
  {
    icon: Wrench,
    titulo: "3. Ordens de Serviço + Voz IA",
    texto: "Máquina de estados da Triagem à Entrega, com abertura por áudio no Telegram.",
  },
  {
    icon: PieChart,
    titulo: "4. Caixa Cego & DRE em Tempo Real",
    texto: "Conferência de turno por forma de pagamento e apuração automática de margem.",
  },
];

export const LoginView: React.FC<LoginViewProps> = ({
  operadoresRapidos,
  autenticando,
  erroAuth,
  onLogin,
}) => {
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarSessao, setLembrarSessao] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim() || !senha) return;
    onLogin(identificador, senha, lembrarSessao);
  };

  const preencherPerfil = (op: OperadorRapidoInfo) => {
    setPerfilSelecionado(op.id);
    setIdentificador(op.username);
    setSenha(op.senhaDemo);
  };

  return (
    <div className="relative grid min-h-screen bg-canvas lg:grid-cols-[1.08fr_1fr]">
      {/* ---------------- Painel Didático da Marca (Esquerda) ---------------- */}
      <div className="relative hidden overflow-hidden border-r border-line bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        {/* Luz ambiental vermelho escuro + grade chumbo técnica */}
        <div
          className="pointer-events-none absolute -right-36 -top-36 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(158 27 36 / 0.30), transparent 65%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-44 -left-32 h-[440px] w-[440px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(63 72 88 / 0.25), transparent 65%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <BrandMark size={48} />
            <BrandWordmark />
          </div>
          <span className="chip chip-brand">Sistema Integrado · v2.0</span>
        </div>

        <div className="relative my-auto max-w-xl py-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-1 w-12 rounded-full bg-brand-hover" />
            <span className="eyebrow text-brand-text">Arquitetura Clean &amp; DDD</span>
          </div>
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide text-fg xl:text-[3.4rem]">
            Oficina, balcão e caixa{" "}
            <span className="text-brand-text">conectados passo a passo.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-fg-muted">
            Ambiente projetado para ser rápido no balcão e didático na gestão: acompanhe cada etapa
            desde a leitura do código de barras até o fechamento do turno e a DRE.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {MODULOS_DIDATICOS.map(({ icon: Icon, titulo, texto }) => (
              <div
                key={titulo}
                className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand-line bg-brand-soft text-brand-text">
                    <Icon size={16} />
                  </span>
                  <h2 className="text-sm font-semibold text-fg">{titulo}</h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-fg-muted">{texto}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-5 text-xs text-fg-subtle">
          <span className="flex items-center gap-2">
            <Wallet size={14} className="text-brand-text" />
            Integração automática com API FastAPI + PostgreSQL (fallback offline ativo)
          </span>
          <span className="font-mono">Atalhos F1–F12</span>
        </div>
      </div>

      {/* ---------------- Formulário de Login (Direita) ---------------- */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <BrandMark size={42} />
              <BrandWordmark />
            </div>
            <span className="chip chip-brand">v2.0</span>
          </div>

          <div className="card brand-stripe p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow text-brand-text">Autenticação de Operador</div>
                <h2 className="mt-1 text-2xl font-semibold text-fg">Entrar no sistema</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Informe suas credenciais ou escolha um perfil didático abaixo.
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface-2 text-fg-muted">
                <Lock size={18} />
              </span>
            </div>

            {erroAuth && (
              <div className="alert alert-neg mt-5" role="alert">
                <AlertCircle size={18} className="shrink-0" />
                <span>{erroAuth}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="login-usuario">
                  Usuário ou e-mail
                </label>
                <input
                  id="login-usuario"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Ex: admin, carlos ou admin@eletrocar.com.br"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="field h-11"
                />
              </div>

              <div>
                <label className="label" htmlFor="login-senha">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="login-senha"
                    type={mostrarSenha ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha de acesso"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="field h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="btn btn-ghost btn-icon absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-fg-muted select-none">
                <input
                  type="checkbox"
                  checked={lembrarSessao}
                  onChange={(e) => setLembrarSessao(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong bg-canvas accent-brand"
                />
                Manter conectado neste terminal mesmo ao fechar a aba
              </label>

              <button
                type="submit"
                disabled={autenticando}
                className="btn btn-primary btn-lg mt-1 w-full"
              >
                {autenticando ? "Validando acesso..." : "Entrar no sistema"}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          {/* Perfis Didáticos de Acesso */}
          <div className="mt-5 rounded-2xl border border-line bg-surface/85 p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg">
                <UserCheck size={15} className="text-brand-text" />
                Perfis Didáticos de Demonstração
              </div>
              <span className="text-[0.7rem] text-fg-subtle">Clique para preencher ou entrar</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {operadoresRapidos.map((op) => {
                const selecionado = perfilSelecionado === op.id;
                return (
                  <div
                    key={op.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      selecionado
                        ? "border-brand-line bg-brand-soft"
                        : "border-line bg-canvas/70 hover:border-line-strong"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-fg">{op.nome}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {op.papeis.map((p) => (
                            <span
                              key={p}
                              className="rounded-md border border-line-strong bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-semibold text-fg-muted"
                            >
                              {PAPEL_BADGE[p]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="chip h-5 px-1.5 font-mono text-[0.65rem]" title="PIN para troca rápida F12">
                        <KeyRound size={10} /> {op.pinDemo}
                      </span>
                    </div>

                    <p className="mt-2 text-[0.72rem] leading-snug text-fg-muted">
                      {op.descricaoAcesso}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line/70 pt-2">
                      <span className="font-mono text-[0.68rem] text-fg-subtle">
                        {op.username} / {op.senhaDemo}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => preencherPerfil(op)}
                          className="btn btn-ghost btn-sm h-7 px-2 text-[0.72rem]"
                        >
                          Preencher
                        </button>
                        <button
                          type="button"
                          disabled={autenticando}
                          onClick={() => {
                            preencherPerfil(op);
                            onLogin(op.username, op.senhaDemo, lembrarSessao);
                          }}
                          className="btn btn-secondary btn-sm h-7 px-2.5 text-[0.72rem]"
                        >
                          Entrar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

