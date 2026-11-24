/**
 * View: UsuariosView
 * Módulo administrativo (somente ADMIN) para cadastrar, editar dados e papéis RBAC,
 * redefinir senha/PIN, ativar/desativar e remover colaboradores.
 */
import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Power,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { Usuario } from "../../domain/entities/Usuario";
import { Papel } from "../../domain/value-objects/Enums";
import { CriarUsuarioDTO } from "../../application/ports/repositories/IUsuarioAdminRepository";
import {
  EdicaoUsuarioFormDTO,
  useUsuariosAdmin,
} from "../../adapters/view-models/useUsuariosAdmin";
import {
  Alerts,
  DidacticBanner,
  EmptyState,
  Modal,
  Page,
  PageHeader,
  StatCard,
} from "../components/ui";
import { cn } from "../../lib/utils";

interface UsuariosViewProps {
  usuarioAtual: Usuario;
  modoDidatico?: boolean;
  onUsuariosAlterados?: () => Promise<void> | void;
}

type FiltroStatus = "TODOS" | "ATIVOS" | "INATIVOS";
type FiltroPapel = "TODOS" | Papel;

const PAPEIS_INFO: Array<{
  papel: Papel;
  titulo: string;
  chipLabel: string;
  chipCls: string;
  descricao: string;
}> = [
  {
    papel: Papel.ADMIN,
    titulo: "Administrador / Dono",
    chipLabel: "Admin",
    chipCls: "chip-brand",
    descricao: "Acesso total: Visão Geral, PDV, OS, Estoque, Caixa, DRE Gerencial e Usuários.",
  },
  {
    papel: Papel.BALCONISTA,
    titulo: "Balconista & Caixa",
    chipLabel: "Balconista",
    chipCls: "chip-ok",
    descricao: "Opera Balcão PDV (desconto até 5%), Caixa/Turnos, Estoque e abertura de OS.",
  },
  {
    papel: Papel.ELETRICISTA,
    titulo: "Eletricista / Oficina",
    chipLabel: "Eletricista",
    chipCls: "chip-warn",
    descricao: "Atua na fila de Ordens de Serviço, diagnósticos elétricos e consulta de peças.",
  },
];

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

interface UsuarioFormModalProps {
  usuarioEditando: Usuario | null;
  ehPropriaConta: boolean;
  salvando: boolean;
  erroExterno: string | null;
  onFechar: () => void;
  onCriar: (dados: CriarUsuarioDTO) => Promise<boolean>;
  onSalvarEdicao: (original: Usuario, form: EdicaoUsuarioFormDTO) => Promise<boolean>;
}

const UsuarioFormModal: React.FC<UsuarioFormModalProps> = ({
  usuarioEditando,
  ehPropriaConta,
  salvando,
  erroExterno,
  onFechar,
  onCriar,
  onSalvarEdicao,
}) => {
  const editando = usuarioEditando !== null;

  const [nome, setNome] = useState(usuarioEditando?.nome ?? "");
  const [email, setEmail] = useState(usuarioEditando?.email ?? "");
  const [username, setUsername] = useState(usuarioEditando?.username ?? "");
  const [telegramUserId, setTelegramUserId] = useState(usuarioEditando?.telegramUserId ?? "");
  const [papeis, setPapeis] = useState<Papel[]>(
    usuarioEditando?.papeis ? [...usuarioEditando.papeis] : [Papel.BALCONISTA]
  );
  const [ativo, setAtivo] = useState(usuarioEditando?.ativo ?? true);
  const [senha, setSenha] = useState("");
  const [pin, setPin] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const togglePapel = (papel: Papel) => {
    setErroLocal(null);
    setPapeis((atual) => {
      if (atual.includes(papel)) {
        return atual.filter((p) => p !== papel);
      }
      return [...atual, papel];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLocal(null);

    if (!nome.trim()) {
      setErroLocal("Informe o nome completo do colaborador.");
      return;
    }
    if (!email.trim()) {
      setErroLocal("Informe o e-mail de acesso.");
      return;
    }
    if (papeis.length === 0) {
      setErroLocal("Selecione ao menos um papel de acesso (RBAC).");
      return;
    }
    if (!editando && senha.length < 8) {
      setErroLocal("A senha inicial deve possuir no mínimo 8 caracteres.");
      return;
    }
    if (editando && senha.trim() && senha.length < 8) {
      setErroLocal("Para redefinir a senha, informe ao menos 8 caracteres.");
      return;
    }
    if (pin.trim() && !/^\d{4,6}$/.test(pin.trim())) {
      setErroLocal("O PIN rápido deve conter entre 4 e 6 dígitos numéricos.");
      return;
    }

    const ok = editando
      ? await onSalvarEdicao(usuarioEditando, {
          nome,
          email,
          username,
          telegramUserId,
          papeis,
          ativo,
          novaSenha: senha,
          novoPin: pin,
        })
      : await onCriar({
          nome,
          email,
          username: username.trim() || undefined,
          telegramUserId: telegramUserId.trim() || undefined,
          papeis,
          senha,
          pin: pin.trim() || undefined,
        });

    if (ok) {
      onFechar();
    }
  };

  const mensagemErro = erroLocal || erroExterno;

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={editando ? `Editar usuário · ${usuarioEditando.nome}` : "Novo usuário"}
      descricao={
        editando
          ? "Atualize dados cadastrais, perfis RBAC ou redefina senha e PIN rápido."
          : "Cadastre um colaborador com os papéis RBAC adequados para balcão, oficina ou gestão."
      }
      icon={editando ? Pencil : UserPlus}
      largura={640}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mensagemErro && (
          <div className="alert alert-neg" role="alert">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{mensagemErro}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="usr-nome" className="label">
              Nome completo *
            </label>
            <input
              id="usr-nome"
              type="text"
              required
              placeholder="Ex: Fernanda Santos"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="usr-email" className="label">
              E-mail *
            </label>
            <input
              id="usr-email"
              type="email"
              required
              placeholder="fernanda@eletrocar.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="usr-username" className="label">
              Usuário de login
            </label>
            <input
              id="usr-username"
              type="text"
              placeholder="Ex: fernanda (opcional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="field font-mono text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="usr-telegram" className="label">
              Telegram ID (opcional)
            </label>
            <input
              id="usr-telegram"
              type="text"
              placeholder="ID numérico do Telegram para abrir OS por áudio"
              value={telegramUserId}
              onChange={(e) => setTelegramUserId(e.target.value)}
              className="field font-mono text-sm"
            />
          </div>
        </div>

        {/* Seleção multi-papel RBAC */}
        <div>
          <div className="label">Papéis de acesso (RBAC) *</div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {PAPEIS_INFO.map((item) => {
              const marcado = papeis.includes(item.papel);
              const bloquearProprioAdmin =
                ehPropriaConta && item.papel === Papel.ADMIN && marcado;
              return (
                <label
                  key={item.papel}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 transition-colors select-none",
                    marcado
                      ? "border-brand-line bg-brand-soft"
                      : "border-line bg-canvas/70 hover:border-line-strong",
                    bloquearProprioAdmin && "cursor-not-allowed opacity-85"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fg">{item.chipLabel}</span>
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={bloquearProprioAdmin}
                      onChange={() => togglePapel(item.papel)}
                      className="h-4 w-4 rounded border-line-strong bg-canvas accent-brand"
                      aria-label={item.titulo}
                    />
                  </div>
                  <p className="text-[0.7rem] leading-snug text-fg-muted">{item.descricao}</p>
                </label>
              );
            })}
          </div>
          {ehPropriaConta && (
            <p className="mt-1.5 text-[0.72rem] text-fg-subtle">
              Por segurança, você não pode remover seu próprio papel de Administrador.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="usr-senha" className="label">
              {editando ? "Nova senha (opcional)" : "Senha inicial *"}
            </label>
            <div className="relative">
              <input
                id="usr-senha"
                type={mostrarSenha ? "text" : "password"}
                required={!editando}
                minLength={editando && !senha ? undefined : 8}
                placeholder={editando ? "Deixe em branco para manter" : "Mínimo 8 caracteres"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="field pr-11"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="btn btn-ghost btn-icon absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                aria-label={mostrarSenha ? "Ocultar dígitos" : "Exibir dígitos"}
              >
                {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="usr-pin" className="label">
              {editando ? "Novo PIN F12 (opcional)" : "PIN rápido F12 (opcional)"}
            </label>
            <input
              id="usr-pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={
                editando && usuarioEditando?.temPin
                  ? "Já possui PIN · digite p/ trocar"
                  : "4 a 6 dígitos (ex: 5566)"
              }
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="field font-mono"
            />
          </div>
        </div>

        {editando && (
          <label
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/70 px-4 py-3 text-sm",
              ehPropriaConta ? "cursor-not-allowed opacity-75" : "cursor-pointer"
            )}
          >
            <div>
              <div className="font-medium text-fg">Conta ativa no sistema</div>
              <div className="text-xs text-fg-subtle">
                {ehPropriaConta
                  ? "Você não pode desativar a conta atualmente logada."
                  : "Contas inativas são bloqueadas no login e na troca rápida por PIN."}
              </div>
            </div>
            <input
              type="checkbox"
              checked={ativo}
              disabled={ehPropriaConta}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 rounded border-line-strong bg-canvas accent-brand"
            />
          </label>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onFechar} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn btn-primary">
            {salvando
              ? "Salvando..."
              : editando
              ? "Salvar alterações"
              : "Cadastrar usuário"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarioAtual,
  modoDidatico = true,
  onUsuariosAlterados,
}) => {
  const {
    usuarios,
    carregando,
    salvando,
    erro,
    setErro,
    sucesso,
    setSucesso,
    criarUsuario,
    salvarEdicaoUsuario,
    alternarStatusUsuario,
    removerUsuario,
  } = useUsuariosAdmin(onUsuariosAlterados);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("TODOS");
  const [filtroPapel, setFiltroPapel] = useState<FiltroPapel>("TODOS");

  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [usuarioParaRemover, setUsuarioParaRemover] = useState<Usuario | null>(null);

  const abrirModalNovo = () => {
    setErro(null);
    setSucesso(null);
    setUsuarioEditando(null);
    setModalFormAberto(true);
  };

  const abrirModalEdicao = (usuario: Usuario) => {
    setErro(null);
    setSucesso(null);
    setUsuarioEditando(usuario);
    setModalFormAberto(true);
  };

  const abrirConfirmacaoRemover = (usuario: Usuario) => {
    setErro(null);
    setSucesso(null);
    setUsuarioParaRemover(usuario);
  };

  const confirmarRemocao = async () => {
    if (!usuarioParaRemover) return;
    const ok = await removerUsuario(usuarioParaRemover);
    if (ok) {
      setUsuarioParaRemover(null);
    }
  };

  const desativarEmVezDeRemover = async () => {
    if (!usuarioParaRemover) return;
    const ok = await alternarStatusUsuario(usuarioParaRemover);
    if (ok) {
      setUsuarioParaRemover(null);
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      const matchBusca =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.username.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo);

      const matchStatus =
        filtroStatus === "TODOS" ||
        (filtroStatus === "ATIVOS" && u.ativo) ||
        (filtroStatus === "INATIVOS" && !u.ativo);

      const matchPapel = filtroPapel === "TODOS" || u.papeis.includes(filtroPapel);

      return matchBusca && matchStatus && matchPapel;
    });
  }, [usuarios, busca, filtroStatus, filtroPapel]);

  const totalAtivos = usuarios.filter((u) => u.ativo).length;
  const totalAdmins = usuarios.filter((u) => u.ehAdmin).length;
  const totalComPin = usuarios.filter((u) => u.temPin).length;

  const modalQualquerAberto = modalFormAberto || usuarioParaRemover !== null;

  return (
    <Page>
      <PageHeader
        eyebrow="Administração & RBAC · F8"
        title="Usuários & acessos"
        description="Adicione colaboradores, ajuste papéis RBAC multi-perfil, gerencie senha/PIN e remova contas."
        actions={
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
              />
              <input
                type="text"
                placeholder="Buscar por nome, usuário ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="field pl-10"
              />
            </div>
            <button type="button" onClick={abrirModalNovo} className="btn btn-primary">
              <UserPlus size={17} /> Novo usuário
            </button>
          </div>
        }
      />

      <DidacticBanner
        visivel={modoDidatico}
        titulo="Como funciona o controle de usuários e papéis RBAC"
        resumo="Um colaborador pode acumular mais de um papel (ex: Balconista + Eletricista) e possuir um PIN exclusivo para alternar o operador no PDV sem digitar senha longa."
        passos={[
          "Adicionar: defina nome, e-mail, senha (mín. 8 dígitos), papéis RBAC e PIN rápido F12 opcional.",
          "Editar: atualize dados cadastrais, altere papéis, ative/desative o acesso ou redefina senha e PIN.",
          "Remover: exclua cadastros sem movimentação. Se o usuário já emitiu vendas, OS ou caixas, desative a conta para preservar a auditoria.",
        ]}
        regraNegocio="Esta aba e todas as rotas /api/v1/usuarios/* exigem perfil ADMIN. O administrador logado é impedido de excluir, desativar ou remover o próprio acesso ADMIN."
      />

      {!modalQualquerAberto && (
        <Alerts sucesso={sucesso} erro={erro} onFecharErro={() => setErro(null)} />
      )}

      {/* Indicadores */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total cadastrados" value={usuarios.length} icon={Users} />
        <StatCard
          label="Contas ativas"
          value={totalAtivos}
          icon={UserCheck}
          tone="ok"
          hint={`${usuarios.length - totalAtivos} inativa(s)`}
        />
        <StatCard
          label="Administradores"
          value={totalAdmins}
          icon={ShieldCheck}
          tone="brand"
          hint="Acesso total + DRE"
        />
        <StatCard
          label="PIN rápido ativo"
          value={totalComPin}
          icon={KeyRound}
          hint="Troca rápida por F12"
        />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "TODOS", label: "Todos" },
              { id: "ATIVOS", label: "Ativos" },
              { id: "INATIVOS", label: "Inativos" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              data-active={filtroStatus === f.id}
              onClick={() => setFiltroStatus(f.id)}
              className="pill"
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-active={filtroPapel === "TODOS"}
            onClick={() => setFiltroPapel("TODOS")}
            className="pill"
          >
            Todos os papéis
          </button>
          {PAPEIS_INFO.map((p) => (
            <button
              key={p.papel}
              type="button"
              data-active={filtroPapel === p.papel}
              onClick={() => setFiltroPapel(p.papel)}
              className="pill"
            >
              {p.chipLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de usuários */}
      {carregando ? (
        <div className="card p-10 text-center text-sm text-fg-muted">
          Carregando colaboradores...
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Nenhum usuário encontrado"
            description="Ajuste a busca ou os filtros, ou cadastre um novo colaborador."
            action={
              <button type="button" onClick={abrirModalNovo} className="btn btn-primary btn-sm">
                <UserPlus size={15} /> Cadastrar usuário
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="card-title">
              <Shield size={17} className="text-brand-text" />
              Equipe cadastrada
              <span className="chip h-6 px-2">{usuariosFiltrados.length}</span>
            </h3>
            <span className="text-xs text-fg-subtle">
              Fonte: {usuarioAtual.origemAuth === "API" ? "API FastAPI + PostgreSQL" : "Modo Demo Local"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Acesso &amp; E-mail</th>
                  <th>Papéis RBAC</th>
                  <th>PIN F12 &amp; Status</th>
                  <th className="text-right!">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const ehVoce = u.id === usuarioAtual.id;
                  return (
                    <tr key={u.id} className={cn(!u.ativo && "opacity-65")}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-bold",
                              u.ehAdmin
                                ? "border-brand-line bg-brand-soft text-brand-text"
                                : "border-line-strong bg-surface-2 text-fg"
                            )}
                          >
                            {iniciais(u.nome)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-fg">{u.nome}</span>
                              {ehVoce && (
                                <span className="chip chip-brand h-5 px-2 text-[0.65rem]">
                                  Você
                                </span>
                              )}
                            </div>
                            {u.telegramUserId && (
                              <div className="mt-0.5 flex items-center gap-1 font-mono text-[0.7rem] text-fg-subtle">
                                <Send size={11} /> TG: {u.telegramUserId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="font-mono text-xs font-semibold text-fg">
                          @{u.username}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
                          <Mail size={12} className="text-fg-subtle" /> {u.email}
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {PAPEIS_INFO.filter((info) => u.papeis.includes(info.papel)).map((info) => (
                            <span
                              key={info.papel}
                              className={cn("chip h-6 px-2 text-[0.7rem]", info.chipCls)}
                            >
                              {info.chipLabel}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "chip h-6 px-2 text-[0.7rem]",
                              u.ativo ? "chip-ok" : "chip-neg"
                            )}
                          >
                            {u.ativo ? <CheckCircle2 size={11} /> : <UserX size={11} />}
                            {u.ativo ? "Ativo" : "Inativo"}
                          </span>
                          <span className="chip h-6 px-2 font-mono text-[0.68rem]">
                            <KeyRound size={11} />
                            {u.temPin ? "PIN ativo" : "Sem PIN"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            aria-label={`Editar ${u.nome}`}
                            onClick={() => abrirModalEdicao(u)}
                            className="btn btn-secondary btn-sm"
                          >
                            <Pencil size={13} /> Editar
                          </button>
                          <button
                            type="button"
                            disabled={ehVoce || salvando}
                            aria-label={u.ativo ? `Desativar ${u.nome}` : `Ativar ${u.nome}`}
                            title={
                              ehVoce
                                ? "Você não pode desativar sua própria conta"
                                : u.ativo
                                ? "Desativar acesso"
                                : "Reativar acesso"
                            }
                            onClick={() => void alternarStatusUsuario(u)}
                            className="btn btn-ghost btn-sm"
                          >
                            <Power
                              size={13}
                              className={u.ativo ? "text-warn-text" : "text-ok-text"}
                            />
                            {u.ativo ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            type="button"
                            disabled={ehVoce || salvando}
                            aria-label={`Remover ${u.nome}`}
                            title={
                              ehVoce
                                ? "Você não pode remover sua própria conta"
                                : "Remover usuário"
                            }
                            onClick={() => abrirConfirmacaoRemover(u)}
                            className="btn btn-danger btn-sm"
                          >
                            <Trash2 size={13} /> Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar */}
      {modalFormAberto && (
        <UsuarioFormModal
          key={usuarioEditando?.id ?? "novo"}
          usuarioEditando={usuarioEditando}
          ehPropriaConta={usuarioEditando?.id === usuarioAtual.id}
          salvando={salvando}
          erroExterno={erro}
          onFechar={() => {
            setModalFormAberto(false);
            setErro(null);
          }}
          onCriar={criarUsuario}
          onSalvarEdicao={salvarEdicaoUsuario}
        />
      )}

      {/* Modal Confirmar Remoção */}
      <Modal
        aberto={usuarioParaRemover !== null}
        onFechar={() => {
          setUsuarioParaRemover(null);
          setErro(null);
        }}
        titulo="Remover usuário"
        descricao="Confirme a exclusão definitiva deste colaborador."
        icon={Trash2}
        largura={480}
      >
        {usuarioParaRemover && (
          <div className="flex flex-col gap-4">
            {erro && (
              <div className="alert alert-neg" role="alert">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <div className="rounded-xl border border-line bg-canvas/80 p-4">
              <div className="text-sm font-semibold text-fg">{usuarioParaRemover.nome}</div>
              <div className="mt-0.5 text-xs text-fg-muted">
                @{usuarioParaRemover.username} · {usuarioParaRemover.email}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {usuarioParaRemover.papeis.map((p) => (
                  <span key={p} className="chip h-5 px-2 text-[0.68rem]">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-fg-muted">
              A exclusão remove credenciais e papéis deste acesso. Caso prefira manter o histórico
              preservado e apenas impedir o login, use{" "}
              <strong className="text-fg">Desativar conta</strong>.
            </p>

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
              <div>
                {usuarioParaRemover.ativo && (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => void desativarEmVezDeRemover()}
                    className="btn btn-secondary btn-sm w-full sm:w-auto"
                  >
                    <Lock size={13} /> Desativar em vez de excluir
                  </button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setUsuarioParaRemover(null);
                    setErro(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void confirmarRemocao()}
                  className="btn btn-danger"
                >
                  <Trash2 size={14} /> {salvando ? "Removendo..." : "Confirmar remoção"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
};

