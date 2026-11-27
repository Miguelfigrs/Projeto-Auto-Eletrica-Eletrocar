/**
 * View: MeuPerfilView
 * O próprio usuário logado (qualquer papel) altera nome, e-mail, usuário de login,
 * a senha e o PIN de troca rápida (F12). Senha e PIN exigem a senha atual.
 * Papéis, status e Telegram continuam sendo definidos pelo administrador (Usuários F8).
 */
import React, { useEffect, useState } from "react";
import { Check, KeyRound, Lock, Save, ShieldCheck, UserRound } from "lucide-react";
import { Usuario } from "../../domain/entities/Usuario";
import { container } from "../../infra/di/container";
import { Alerts, Page, PageHeader } from "../components/ui";

const ROTULO_PAPEL: Record<string, string> = {
  ADMIN: "Administrador",
  BALCONISTA: "Balconista",
  ELETRICISTA: "Eletricista",
};

type Feedback = { sucesso: string | null; erro: string | null };
const SEM_FEEDBACK: Feedback = { sucesso: null, erro: null };

function mensagemDe(err: unknown, padrao: string): string {
  return err instanceof Error && err.message ? err.message : padrao;
}

const Secao: React.FC<{
  icon: React.ElementType;
  titulo: string;
  descricao: string;
  feedback: Feedback;
  onFecharErro: () => void;
  children: React.ReactNode;
}> = ({ icon: Icon, titulo, descricao, feedback, onFecharErro, children }) => (
  <section className="card p-5 sm:p-6">
    <div className="mb-5 flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand-text">
        <Icon size={18} />
      </span>
      <div>
        <h2 className="text-base font-semibold text-fg">{titulo}</h2>
        <p className="mt-0.5 text-sm text-fg-muted">{descricao}</p>
      </div>
    </div>
    {(feedback.sucesso || feedback.erro) && (
      <div className="mb-4">
        <Alerts sucesso={feedback.sucesso} erro={feedback.erro} onFecharErro={onFecharErro} />
      </div>
    )}
    {children}
  </section>
);

interface MeuPerfilViewProps {
  usuario: Usuario;
  /** Chamado após salvar, para o menu e o cabeçalho mostrarem os dados novos. */
  onPerfilAtualizado: () => void | Promise<void>;
}

export const MeuPerfilView: React.FC<MeuPerfilViewProps> = ({ usuario, onPerfilAtualizado }) => {
  // Dados pessoais
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [username, setUsername] = useState(usuario.username);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [fbDados, setFbDados] = useState<Feedback>(SEM_FEEDBACK);

  // Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [fbSenha, setFbSenha] = useState<Feedback>(SEM_FEEDBACK);

  // PIN
  const [senhaPin, setSenhaPin] = useState("");
  const [pin, setPin] = useState("");
  const [salvandoPin, setSalvandoPin] = useState(false);
  const [fbPin, setFbPin] = useState<Feedback>(SEM_FEEDBACK);

  // Outro operador entrou (F12) com a tela aberta: recarrega os campos
  useEffect(() => {
    setNome(usuario.nome);
    setEmail(usuario.email);
    setUsername(usuario.username);
  }, [usuario.id, usuario.nome, usuario.email, usuario.username]);

  const alterouDados =
    nome.trim() !== usuario.nome || email.trim().toLowerCase() !== usuario.email || username.trim().toLowerCase() !== usuario.username;

  const salvarDados = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbDados(SEM_FEEDBACK);
    if (!nome.trim() || !email.trim() || !username.trim()) {
      setFbDados({ sucesso: null, erro: "Preencha nome, e-mail e usuário." });
      return;
    }
    setSalvandoDados(true);
    try {
      const dados: { nome?: string; email?: string; username?: string } = {};
      if (nome.trim() !== usuario.nome) dados.nome = nome.trim();
      if (email.trim().toLowerCase() !== usuario.email) dados.email = email.trim();
      if (username.trim().toLowerCase() !== usuario.username) dados.username = username.trim();
      await container.perfilRepository.atualizarMeuPerfil(dados);
      await onPerfilAtualizado();
      setFbDados({ sucesso: "Dados atualizados.", erro: null });
    } catch (err) {
      setFbDados({ sucesso: null, erro: mensagemDe(err, "Não foi possível salvar os dados.") });
    } finally {
      setSalvandoDados(false);
    }
  };

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbSenha(SEM_FEEDBACK);
    if (novaSenha !== confirmacao) {
      setFbSenha({ sucesso: null, erro: "A confirmação não confere com a nova senha." });
      return;
    }
    setSalvandoSenha(true);
    try {
      await container.perfilRepository.trocarMinhaSenha(senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
      setFbSenha({ sucesso: "Senha alterada. Use a nova senha no próximo login.", erro: null });
    } catch (err) {
      setFbSenha({ sucesso: null, erro: mensagemDe(err, "Não foi possível alterar a senha.") });
    } finally {
      setSalvandoSenha(false);
    }
  };

  const salvarPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbPin(SEM_FEEDBACK);
    setSalvandoPin(true);
    try {
      await container.perfilRepository.definirMeuPin(senhaPin, pin);
      await onPerfilAtualizado();
      setSenhaPin("");
      setPin("");
      setFbPin({ sucesso: "PIN salvo. Use-o na troca rápida de operador (F12).", erro: null });
    } catch (err) {
      setFbPin({ sucesso: null, erro: mensagemDe(err, "Não foi possível salvar o PIN.") });
    } finally {
      setSalvandoPin(false);
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Sua conta"
        title="Meu perfil"
        description="Atualize seus dados de acesso, sua senha e o PIN de troca rápida de operador."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Secao
          icon={UserRound}
          titulo="Dados pessoais"
          descricao="Nome exibido no sistema, e-mail e usuário usados no login."
          feedback={fbDados}
          onFecharErro={() => setFbDados(SEM_FEEDBACK)}
        >
          <form onSubmit={salvarDados} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="perfil-nome">Nome</label>
              <input id="perfil-nome" className="field" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="perfil-email">E-mail</label>
                <input id="perfil-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label className="label" htmlFor="perfil-usuario">Usuário de login</label>
                <input id="perfil-usuario" className="field font-mono" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </div>
            </div>
            <div>
              <span className="label">Perfis de acesso</span>
              <div className="flex flex-wrap items-center gap-2">
                {usuario.papeis.map((p) => (
                  <span key={p} className="chip">
                    <ShieldCheck size={12} /> {ROTULO_PAPEL[p] ?? p}
                  </span>
                ))}
                <span className="text-xs text-fg-subtle">Definidos pelo administrador (Usuários F8).</span>
              </div>
            </div>
            <div className="flex justify-end border-t border-line pt-4">
              <button type="submit" className="btn btn-primary" disabled={salvandoDados || !alterouDados}>
                <Save size={16} /> {salvandoDados ? "Salvando..." : "Salvar dados"}
              </button>
            </div>
          </form>
        </Secao>

        <div className="flex flex-col gap-6">
          <Secao
            icon={KeyRound}
            titulo="Trocar senha"
            descricao="Mínimo de 8 caracteres. Por segurança, confirme a senha atual."
            feedback={fbSenha}
            onFecharErro={() => setFbSenha(SEM_FEEDBACK)}
          >
            <form onSubmit={trocarSenha} className="flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="perfil-senha-atual">Senha atual</label>
                <input id="perfil-senha-atual" type="password" className="field" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="perfil-nova-senha">Nova senha</label>
                  <input id="perfil-nova-senha" type="password" className="field" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" minLength={8} required />
                </div>
                <div>
                  <label className="label" htmlFor="perfil-confirmacao">Confirmar nova senha</label>
                  <input id="perfil-confirmacao" type="password" className="field" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" minLength={8} required />
                </div>
              </div>
              <div className="flex justify-end border-t border-line pt-4">
                <button type="submit" className="btn btn-primary" disabled={salvandoSenha}>
                  <Lock size={16} /> {salvandoSenha ? "Alterando..." : "Alterar senha"}
                </button>
              </div>
            </form>
          </Secao>

          <Secao
            icon={Check}
            titulo="PIN de troca rápida (F12)"
            descricao={
              usuario.temPin
                ? "Você já tem um PIN. Defina um novo para substituí-lo."
                : "Você ainda não tem PIN. Com ele, troca de operador no balcão sem digitar a senha."
            }
            feedback={fbPin}
            onFecharErro={() => setFbPin(SEM_FEEDBACK)}
          >
            <form onSubmit={salvarPin} className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <div>
                <label className="label" htmlFor="perfil-pin-senha">Senha atual</label>
                <input id="perfil-pin-senha" type="password" className="field" value={senhaPin} onChange={(e) => setSenhaPin(e.target.value)} autoComplete="current-password" required />
              </div>
              <div>
                <label className="label" htmlFor="perfil-pin">Novo PIN</label>
                <input
                  id="perfil-pin"
                  className="field font-mono tracking-[0.3em]"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="4 a 6 dígitos"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={salvandoPin}>
                {salvandoPin ? "Salvando..." : "Salvar PIN"}
              </button>
            </form>
          </Secao>
        </div>
      </div>
    </Page>
  );
};
