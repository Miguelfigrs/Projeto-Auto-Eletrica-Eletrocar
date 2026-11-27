/**
 * View: LoginView
 * Tela de autenticação moderna e didática da Auto Elétrica Eletrocar.
 * Explica os fluxos da oficina, perfis de acesso (RBAC) e permite login
 * tradicional por usuário/e-mail e senha.
 */
import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  PieChart,
  ScanBarcode,
  ShieldCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import { BrandMark, BrandWordmark } from "./ui";

interface LoginViewProps {
  autenticando: boolean;
  erroAuth: string | null;
  onLogin: (usernameOuEmail: string, senha: string, lembrarSessao: boolean) => Promise<unknown>;
}

const MODULOS_DIDATICOS = [
  {
    icon: ShieldCheck,
    titulo: "Cada um vê o que precisa",
    texto: "Balcão, oficina e dono têm telas próprias. Troque de operador com o PIN (tecla F12).",
  },
  {
    icon: ScanBarcode,
    titulo: "Venda rápida no balcão",
    texto: "Passe o leitor na peça: o sistema soma, calcula o troco e baixa o estoque sozinho.",
  },
  {
    icon: Wrench,
    titulo: "Carros na oficina",
    texto: "Acompanhe cada carro da chegada até a entrega, etapa por etapa.",
  },
  {
    icon: PieChart,
    titulo: "Caixa e lucro do mês",
    texto: "Feche o caixa conferindo dinheiro, PIX e cartões e veja quanto sobrou de lucro.",
  },
];

export const LoginView: React.FC<LoginViewProps> = ({
  autenticando,
  erroAuth,
  onLogin,
}) => {
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarSessao, setLembrarSessao] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim() || !senha) return;
    onLogin(identificador, senha, lembrarSessao);
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
          <span className="chip chip-brand">Versão 2.0</span>
        </div>

        <div className="relative my-auto max-w-xl py-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-1 w-12 rounded-full bg-brand-hover" />
            <span className="eyebrow text-brand-text">Sistema da oficina</span>
          </div>
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide text-fg xl:text-[3.4rem]">
            Oficina, balcão e caixa{" "}
            <span className="text-brand-text">conectados passo a passo.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-fg-muted">
            Tudo em um só lugar: vendas no balcão, carros na oficina, o caixa do dia e o lucro do mês.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {MODULOS_DIDATICOS.map(({ icon: Icon, titulo, texto }) => (
              <div
                key={titulo}
                className="rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text">
                    <Icon size={20} />
                  </span>
                  <h2 className="text-base font-semibold text-fg">{titulo}</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{texto}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-5 text-sm text-fg-subtle">
          <span className="flex items-center gap-2">
            <Wallet size={18} className="text-brand-text" />
            Os dados ficam guardados no servidor da oficina.
          </span>
          <span>Atalhos: teclas F1 a F12</span>
        </div>
      </div>

      {/* ---------------- Formulário de Login (Direita) ---------------- */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:sticky lg:top-0 lg:h-screen lg:py-6">
        <div className="w-full max-w-[520px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <BrandMark size={42} />
              <BrandWordmark />
            </div>
            <span className="chip chip-brand">Versão 2.0</span>
          </div>

          <div className="card brand-stripe p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow text-brand-text">Bem-vindo</div>
                <h2 className="mt-1 text-3xl font-semibold text-fg">Entrar no sistema</h2>
                <p className="mt-1.5 text-base text-fg-muted">
                  Digite seu usuário e sua senha.
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface-2 text-fg-muted">
                <Lock size={22} />
              </span>
            </div>

            {erroAuth && (
              <div className="alert alert-neg mt-5" role="alert">
                <AlertCircle size={22} className="shrink-0" />
                <span>{erroAuth}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
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
                  className="field h-14 text-lg"
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
                    className="field h-14 pr-32 text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="btn btn-ghost btn-sm absolute right-1.5 top-1/2 -translate-y-1/2 border-transparent!"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    {mostrarSenha ? "Esconder" : "Mostrar"}
                  </button>
                </div>
              </div>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg-muted select-none">
                <input
                  type="checkbox"
                  checked={lembrarSessao}
                  onChange={(e) => setLembrarSessao(e.target.checked)}
                  className="h-6 w-6 shrink-0 rounded border-line-strong bg-canvas accent-brand"
                />
                Continuar conectado neste computador
              </label>

              <button
                type="submit"
                disabled={autenticando}
                className="btn btn-primary btn-lg mt-1 w-full"
              >
                {autenticando ? "Conferindo..." : "Entrar no sistema"}
                <ArrowRight size={22} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

