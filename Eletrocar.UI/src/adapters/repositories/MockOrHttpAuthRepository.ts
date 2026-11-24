/**
 * Repositório de Autenticação e Sessão (Adapter)
 * Integra com a API REST FastAPI (/api/v1/auth/*) quando disponível,
 * mantendo fallback offline fiel aos dados de demonstração (seed_completo.sql).
 * Inicia desconectado por padrão para exigir login explícito do operador.
 */
import {
  IAuthRepository,
  OperadorRapidoInfo,
} from "../../application/ports/repositories/IAuthRepository";
import {
  AtualizarUsuarioDTO,
  CriarUsuarioDTO,
  IUsuarioAdminRepository,
} from "../../application/ports/repositories/IUsuarioAdminRepository";
import type { AtualizarMeuPerfilDTO, IPerfilRepository } from "../../application/ports/repositories/IPerfilRepository";
import { OrigemAutenticacao, Usuario } from "../../domain/entities/Usuario";
import { Papel } from "../../domain/value-objects/Enums";
import {
  CredenciaisInvalidasError,
  DomainError,
} from "../../domain/exceptions/DomainExceptions";

interface RegistroDemo {
  usuario: Usuario;
  aliasesEmail: string[];
  senha: string;
  pin: string;
  descricaoAcesso: string;
}

interface SessaoPersistida {
  accessToken?: string;
  origemAuth: OrigemAutenticacao;
  usuario: {
    id: string;
    nome: string;
    username: string;
    email: string;
    papeis: Papel[];
    temPin?: boolean;
    telegramUserId?: string;
    telaInicial?: string;
    modulos?: string[];
  };
}

interface ApiUsuarioDTO {
  id: string;
  nome: string;
  email: string;
  papeis: string[];
  ativo: boolean;
  username?: string | null;
  telegram_user_id?: string | null;
  tem_pin?: boolean;
  tela_inicial?: string;
  modulos?: string[];
}

interface ApiSessaoTokensDTO {
  access_token: string;
  usuario: ApiUsuarioDTO;
}

const STORAGE_KEY = "eletrocar.sessao.v2";
/**
 * Tempo máximo de espera pela API. Em produção o login confere a senha (bcrypt) e o plano
 * gratuito do Render pode levar até ~1 min para "acordar": 2,5 s cortava logins válidos.
 */
const API_TIMEOUT_MS = 60_000;

const MENSAGEM_SERVIDOR_LENTO =
  "O servidor demorou para responder (ele pode estar “acordando”). Aguarde alguns segundos e tente de novo.";

/**
 * O modo de demonstração (usuários de exemplo, dados em memória) só pode assumir quando a API
 * não responde no ambiente de desenvolvimento. Publicado, uma falha da API vira mensagem de erro:
 * cair na demonstração recusaria a senha real como "inválida".
 */
export function permiteFallbackDemo(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

function falhaDeServidor(err: unknown, status?: number): DomainError {
  if ((err as { name?: string } | null)?.name === "AbortError") {
    return new DomainError(MENSAGEM_SERVIDOR_LENTO, "IntegracaoExterna");
  }
  return new DomainError(
    status
      ? `O servidor está indisponível no momento (HTTP ${status}). Tente de novo em instantes.`
      : "Não foi possível falar com o servidor. Verifique a internet e tente de novo.",
    "IntegracaoExterna"
  );
}
const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const REGEX_USERNAME = /^[a-z0-9._-]{3,50}$/;
const REGEX_PIN = /^\d{4,6}$/;

function descreverAcessoPorPapeis(papeis: Papel[]): string {
  if (papeis.includes(Papel.ADMIN)) {
    return "Acesso total: Visão Geral, Balcão PDV, OS, Estoque, Caixa, DRE e Usuários.";
  }
  if (papeis.includes(Papel.BALCONISTA) && papeis.includes(Papel.ELETRICISTA)) {
    return "Perfil híbrido: opera Balcão PDV, Caixa e também Ordens de Serviço.";
  }
  if (papeis.includes(Papel.BALCONISTA)) {
    return "Balcão PDV, Caixa Diário, consulta de Estoque e abertura de OS.";
  }
  return "Fila de Ordens de Serviço (Oficina), Checklist Elétrico e Estoque.";
}

export class MockOrHttpAuthRepository implements IAuthRepository, IUsuarioAdminRepository, IPerfilRepository {
  private readonly usuariosRegistrados: RegistroDemo[] = [
    {
      usuario: new Usuario({
        id: "a0000000-0000-4000-8000-000000000001",
        nome: "Administrador Eletrocar (Dono)",
        username: "admin",
        email: "admin@eletrocar.com.br",
        papeis: [Papel.ADMIN, Papel.BALCONISTA, Papel.ELETRICISTA],
        pin: "1234",
      }),
      aliasesEmail: ["admin@eletrocar.com.br"],
      senha: "admin123",
      pin: "1234",
      descricaoAcesso: "Acesso total: Visão Geral, Balcão PDV, OS, Estoque, Caixa e DRE.",
    },
    {
      usuario: new Usuario({
        id: "a0000000-0000-4000-8000-000000000004",
        nome: "Carlos Atendente Balcão",
        username: "carlos",
        email: "carlos.balcao@eletrocar.com.br",
        papeis: [Papel.BALCONISTA],
        pin: "1122",
      }),
      aliasesEmail: ["carlos@eletrocar.com.br", "carlos.balcao@eletrocar.com.br"],
      senha: "carlos123",
      pin: "1122",
      descricaoAcesso: "Balcão PDV, Caixa Diário, consulta de Estoque e abertura de OS.",
    },
    {
      usuario: new Usuario({
        id: "a0000000-0000-4000-8000-000000000002",
        nome: "Márcio Eletricista",
        username: "marcio",
        email: "marcio@eletrocar.com.br",
        papeis: [Papel.ELETRICISTA],
        pin: "4321",
      }),
      aliasesEmail: ["marcio@eletrocar.com.br"],
      senha: "marcio123",
      pin: "4321",
      descricaoAcesso: "Fila de Ordens de Serviço (Oficina), Checklist Elétrico e Estoque.",
    },
    {
      usuario: new Usuario({
        id: "a0000000-0000-4000-8000-000000000005",
        nome: "Juliana Vendas e Caixa",
        username: "juliana",
        email: "juliana@eletrocar.com.br",
        papeis: [Papel.BALCONISTA, Papel.ELETRICISTA],
        pin: "3344",
      }),
      aliasesEmail: ["juliana@eletrocar.com.br"],
      senha: "juliana123",
      pin: "3344",
      descricaoAcesso: "Perfil híbrido: opera Balcão PDV, Caixa e também Ordens de Serviço.",
    },
  ];

  private usuarioAtual: Usuario | null = null;
  private accessToken: string | null = null;

  constructor(private readonly apiBase = "/api/v1") {
    this.restaurarSessaoStorage();
  }

  public async login(
    usernameOuEmail: string,
    senha: string,
    lembrarSessao = false
  ): Promise<Usuario> {
    const identificador = usernameOuEmail.trim();
    if (!identificador || !senha) {
      throw new CredenciaisInvalidasError();
    }

    // 1. Tenta autenticar contra a API FastAPI real (PostgreSQL + JWT)
    if (this.podeChamarRede()) {
      try {
        const res = await this.fetchComTimeout(`${this.apiBase}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ identificador, senha }),
        });

        if (res.ok) {
          const data = (await res.json()) as ApiSessaoTokensDTO;
          const usuario = this.mapearApiUsuario(data.usuario, "API");
          this.definirSessao(usuario, data.access_token, lembrarSessao);
          return usuario;
        }

        if (res.status === 401 || res.status === 403 || res.status === 429) {
          const errBody = (await res.json().catch(() => null)) as { erro?: string; detail?: string } | null;
          throw new DomainError(
            errBody?.erro || errBody?.detail || "Usuário/e-mail ou senha inválidos.",
            res.status === 429 ? "LimiteTentativasExcedido" : "CredenciaisInvalidas"
          );
        }
        // Outra resposta (5xx, proxy da Vercel/Render): publicado, é erro; em dev, segue para a demonstração
        if (!permiteFallbackDemo()) throw falhaDeServidor(null, res.status);
      } catch (err) {
        // Se foi erro explícito de regra/credencial da API, propaga sem mascarar
        if (err instanceof DomainError) {
          throw err;
        }
        // Tempo esgotado ou rede indisponível: publicado, avisa; em dev, segue para o fallback local
        if (!permiteFallbackDemo()) throw falhaDeServidor(err);
      }
    }

    // 2. Fallback offline para demonstração / testes unitários
    const limpo = identificador.toLowerCase();
    const encontrado = this.usuariosRegistrados.find(
      (u) =>
        (u.usuario.username.toLowerCase() === limpo ||
          u.usuario.email.toLowerCase() === limpo ||
          u.aliasesEmail.some((alias) => alias.toLowerCase() === limpo)) &&
        u.senha === senha
    );

    if (!encontrado || !encontrado.usuario.ativo) {
      throw new CredenciaisInvalidasError();
    }

    const usuarioDemo = new Usuario({
      id: encontrado.usuario.id,
      nome: encontrado.usuario.nome,
      username: encontrado.usuario.username,
      email: encontrado.usuario.email,
      papeis: encontrado.usuario.papeis,
      pin: encontrado.pin,
      temPin: Boolean(encontrado.pin),
      telegramUserId: encontrado.usuario.telegramUserId,
      ativo: encontrado.usuario.ativo,
      origemAuth: "DEMO_LOCAL",
    });
    this.definirSessao(usuarioDemo, null, lembrarSessao);
    return usuarioDemo;
  }

  public async verificarPin(pin: string, usuarioId?: string): Promise<Usuario> {
    const pinLimpo = pin.trim();
    if (!REGEX_PIN.test(pinLimpo)) {
      throw new CredenciaisInvalidasError();
    }

    const candidatoLocal = this.usuariosRegistrados.find(
      (u) =>
        u.usuario.ativo &&
        (usuarioId ? u.usuario.id === usuarioId && u.pin === pinLimpo : u.pin === pinLimpo)
    );

    // Se há sessão API ativa e conseguimos identificar o UUID do operador alvo, valida no backend
    const alvoId = usuarioId || candidatoLocal?.usuario.id;
    if (this.podeChamarRede() && this.accessToken && alvoId) {
      try {
        const res = await this.fetchComTimeout(`${this.apiBase}/auth/pin-switch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          credentials: "include",
          body: JSON.stringify({ usuario_id: alvoId, pin: pinLimpo }),
        });

        if (res.ok) {
          const data = (await res.json()) as ApiSessaoTokensDTO;
          const usuario = this.mapearApiUsuario(data.usuario, "API");
          this.definirSessao(usuario, data.access_token, this.estaPersistidoLocal());
          return usuario;
        }

        if (res.status === 401 || res.status === 403 || res.status === 429) {
          const msg = await this.extrairMensagemErro(res, "PIN de operador inválido.");
          throw new DomainError(msg, "CredenciaisInvalidas");
        }
        if (!permiteFallbackDemo()) throw falhaDeServidor(null, res.status);
      } catch (err) {
        if (err instanceof DomainError) {
          throw err;
        }
        if (!permiteFallbackDemo()) throw falhaDeServidor(err);
      }
    }

    if (!candidatoLocal) {
      throw new CredenciaisInvalidasError();
    }

    const usuarioDemo = new Usuario({
      id: candidatoLocal.usuario.id,
      nome: candidatoLocal.usuario.nome,
      username: candidatoLocal.usuario.username,
      email: candidatoLocal.usuario.email,
      papeis: candidatoLocal.usuario.papeis,
      pin: candidatoLocal.pin,
      temPin: Boolean(candidatoLocal.pin),
      telegramUserId: candidatoLocal.usuario.telegramUserId,
      ativo: candidatoLocal.usuario.ativo,
      origemAuth: "DEMO_LOCAL",
    });
    this.definirSessao(usuarioDemo, null, this.estaPersistidoLocal());
    return usuarioDemo;
  }

  public async obterUsuarioAtual(): Promise<Usuario | null> {
    if (!this.usuarioAtual) {
      this.restaurarSessaoStorage();
    }
    return this.usuarioAtual;
  }

  public obterAccessToken(): string | null {
    if (!this.usuarioAtual) {
      this.restaurarSessaoStorage();
    }
    return this.accessToken;
  }

  public isModoApi(): boolean {
    if (!this.usuarioAtual) {
      this.restaurarSessaoStorage();
    }
    return (
      this.usuarioAtual?.origemAuth === "API" &&
      Boolean(this.accessToken) &&
      this.podeChamarRede()
    );
  }

  public async listarOperadoresRapidos(): Promise<OperadorRapidoInfo[]> {
    return this.usuariosRegistrados
      .filter((item) => item.usuario.ativo)
      .map((item) => ({
        id: item.usuario.id,
        nome: item.usuario.nome,
        username: item.usuario.username,
        email: item.usuario.email,
        papeis: item.usuario.papeis,
        pinDemo: item.pin,
        senhaDemo: item.senha,
        descricaoAcesso: item.descricaoAcesso,
      }));
  }

  /* ------------------------------------------------------------------------ */
  /* Gestão Administrativa de Usuários (IUsuarioAdminRepository)              */
  /* ------------------------------------------------------------------------ */

  public async listarTodos(): Promise<Usuario[]> {
    if (this.deveUsarApiAdmin()) {
      const lista = await this.apiAdminRequest<ApiUsuarioDTO[]>("/usuarios", { method: "GET" });
      return lista
        .map((dto) => this.mapearApiUsuario(dto, "API"))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }

    return [...this.usuariosRegistrados]
      .sort((a, b) => a.usuario.nome.localeCompare(b.usuario.nome, "pt-BR"))
      .map((r) => this.clonarUsuarioDemo(r));
  }

  public async criar(dados: CriarUsuarioDTO): Promise<Usuario> {
    const nome = (dados.nome || "").trim();
    const email = (dados.email || "").trim().toLowerCase();
    const username = (dados.username || "").trim().toLowerCase() || undefined;
    const telegramUserId = (dados.telegramUserId || "").trim() || undefined;
    const pin = (dados.pin || "").trim() || undefined;

    this.validarCamposBasicos(nome, email, username, dados.papeis);
    if (!dados.senha || dados.senha.length < 8) {
      throw new DomainError("A senha deve ter ao menos 8 caracteres.", "RegraNegocio");
    }
    if (pin && !REGEX_PIN.test(pin)) {
      throw new DomainError("O PIN de operador deve conter entre 4 e 6 dígitos numéricos.", "RegraNegocio");
    }

    if (this.deveUsarApiAdmin()) {
      const criadoDto = await this.apiAdminRequest<ApiUsuarioDTO>("/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nome,
          email,
          senha: dados.senha,
          papeis: dados.papeis,
          username: username || null,
          pin: pin || null,
          telegram_user_id: telegramUserId || null,
        }),
      });
      return this.mapearApiUsuario(criadoDto, "API");
    }

    this.validarUnicidadeLocal(null, email, username, telegramUserId);
    const id = this.gerarId();
    const usuarioFinal = new Usuario({
      id,
      nome,
      email,
      username: username || email.split("@")[0],
      papeis: [...dados.papeis],
      pin,
      temPin: Boolean(pin),
      telegramUserId,
      ativo: true,
      origemAuth: "DEMO_LOCAL",
    });
    this.usuariosRegistrados.push({
      usuario: usuarioFinal,
      aliasesEmail: [],
      senha: dados.senha,
      pin: pin || "",
      descricaoAcesso: descreverAcessoPorPapeis(usuarioFinal.papeis),
    });
    return this.clonarUsuarioDemo(this.usuariosRegistrados[this.usuariosRegistrados.length - 1]);
  }

  public async atualizar(usuarioId: string, dados: AtualizarUsuarioDTO): Promise<Usuario> {
    if (this.deveUsarApiAdmin()) {
      const payload: Record<string, string | null | undefined> = {};
      if (dados.nome !== undefined) payload.nome = dados.nome.trim();
      if (dados.email !== undefined) payload.email = dados.email.trim().toLowerCase();
      if (dados.username !== undefined) {
        payload.username = dados.username === null ? "" : dados.username.trim().toLowerCase();
      }
      if (dados.telegramUserId !== undefined) {
        payload.telegram_user_id = dados.telegramUserId === null ? "" : dados.telegramUserId.trim();
      }

      const dto = await this.apiAdminRequest<ApiUsuarioDTO>(`/usuarios/${usuarioId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const atualizado = this.mapearApiUsuario(dto, "API");
      this.sincronizarPropriaSessaoSeAplicavel(atualizado);
      return atualizado;
    }

    const reg = this.obterRegistroLocal(usuarioId);
    const nome = dados.nome !== undefined ? dados.nome.trim() : reg.usuario.nome;
    const email = dados.email !== undefined ? dados.email.trim().toLowerCase() : reg.usuario.email;
    const username =
      dados.username === undefined
        ? reg.usuario.username
        : (dados.username || "").trim().toLowerCase() || email.split("@")[0];
    const telegramUserId =
      dados.telegramUserId === undefined
        ? reg.usuario.telegramUserId
        : (dados.telegramUserId || "").trim() || undefined;

    this.validarCamposBasicos(nome, email, username, reg.usuario.papeis);
    this.validarUnicidadeLocal(usuarioId, email, username, telegramUserId);

    reg.usuario = new Usuario({
      id: reg.usuario.id,
      nome,
      email,
      username,
      papeis: reg.usuario.papeis,
      pin: reg.pin || undefined,
      temPin: Boolean(reg.pin),
      telegramUserId,
      ativo: reg.usuario.ativo,
      origemAuth: "DEMO_LOCAL",
    });
    const clone = this.clonarUsuarioDemo(reg);
    this.sincronizarPropriaSessaoSeAplicavel(clone);
    return clone;
  }

  public async definirPapeis(usuarioId: string, papeis: Papel[]): Promise<Usuario> {
    if (!papeis || papeis.length === 0) {
      throw new DomainError("O usuário deve possuir ao menos um papel de acesso.", "RegraNegocio");
    }

    if (this.deveUsarApiAdmin()) {
      const dto = await this.apiAdminRequest<ApiUsuarioDTO>(`/usuarios/${usuarioId}/papeis`, {
        method: "PUT",
        body: JSON.stringify({ papeis }),
      });
      const atualizado = this.mapearApiUsuario(dto, "API");
      this.sincronizarPropriaSessaoSeAplicavel(atualizado);
      return atualizado;
    }

    const reg = this.obterRegistroLocal(usuarioId);
    if (
      this.usuarioAtual?.id === usuarioId &&
      reg.usuario.ehAdmin &&
      !papeis.includes(Papel.ADMIN)
    ) {
      throw new DomainError("O administrador não pode remover o próprio papel de ADMIN.", "RegraNegocio");
    }

    reg.usuario = new Usuario({
      id: reg.usuario.id,
      nome: reg.usuario.nome,
      email: reg.usuario.email,
      username: reg.usuario.username,
      papeis: Array.from(new Set(papeis)),
      pin: reg.pin || undefined,
      temPin: Boolean(reg.pin),
      telegramUserId: reg.usuario.telegramUserId,
      ativo: reg.usuario.ativo,
      origemAuth: "DEMO_LOCAL",
    });
    reg.descricaoAcesso = descreverAcessoPorPapeis(reg.usuario.papeis);
    const clone = this.clonarUsuarioDemo(reg);
    this.sincronizarPropriaSessaoSeAplicavel(clone);
    return clone;
  }

  public async alterarStatus(usuarioId: string, ativo: boolean): Promise<Usuario> {
    if (this.usuarioAtual?.id === usuarioId && !ativo) {
      throw new DomainError("O usuário não pode desativar a própria conta.", "RegraNegocio");
    }

    if (this.deveUsarApiAdmin()) {
      const dto = await this.apiAdminRequest<ApiUsuarioDTO>(`/usuarios/${usuarioId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ativo }),
      });
      return this.mapearApiUsuario(dto, "API");
    }

    const reg = this.obterRegistroLocal(usuarioId);
    reg.usuario = new Usuario({
      id: reg.usuario.id,
      nome: reg.usuario.nome,
      email: reg.usuario.email,
      username: reg.usuario.username,
      papeis: reg.usuario.papeis,
      pin: reg.pin || undefined,
      temPin: Boolean(reg.pin),
      telegramUserId: reg.usuario.telegramUserId,
      ativo,
      origemAuth: "DEMO_LOCAL",
    });
    return this.clonarUsuarioDemo(reg);
  }

  public async redefinirSenha(usuarioId: string, novaSenha: string): Promise<void> {
    if (!novaSenha || novaSenha.length < 8) {
      throw new DomainError("A senha deve ter ao menos 8 caracteres.", "RegraNegocio");
    }

    if (this.deveUsarApiAdmin()) {
      await this.apiAdminRequest<void>(`/usuarios/${usuarioId}/senha`, {
        method: "POST",
        body: JSON.stringify({ nova_senha: novaSenha }),
      });
      return;
    }

    const reg = this.obterRegistroLocal(usuarioId);
    reg.senha = novaSenha;
  }

  public async definirPin(usuarioId: string, pin: string): Promise<void> {
    const pinLimpo = (pin || "").trim();
    if (!REGEX_PIN.test(pinLimpo)) {
      throw new DomainError("O PIN de operador deve conter entre 4 e 6 dígitos numéricos.", "RegraNegocio");
    }

    if (this.deveUsarApiAdmin()) {
      await this.apiAdminRequest<void>(`/usuarios/${usuarioId}/pin`, {
        method: "POST",
        body: JSON.stringify({ pin: pinLimpo }),
      });
      return;
    }

    const reg = this.obterRegistroLocal(usuarioId);
    reg.pin = pinLimpo;
    reg.usuario = new Usuario({
      id: reg.usuario.id,
      nome: reg.usuario.nome,
      email: reg.usuario.email,
      username: reg.usuario.username,
      papeis: reg.usuario.papeis,
      pin: pinLimpo,
      temPin: true,
      telegramUserId: reg.usuario.telegramUserId,
      ativo: reg.usuario.ativo,
      origemAuth: "DEMO_LOCAL",
    });
  }

  public async remover(usuarioId: string): Promise<void> {
    if (this.usuarioAtual?.id === usuarioId) {
      throw new DomainError("O usuário não pode remover a própria conta.", "RegraNegocio");
    }

    if (this.deveUsarApiAdmin()) {
      await this.apiAdminRequest<void>(`/usuarios/${usuarioId}`, { method: "DELETE" });
      return;
    }

    const idx = this.usuariosRegistrados.findIndex((u) => u.usuario.id === usuarioId);
    if (idx === -1) {
      throw new DomainError("Usuário não encontrado.", "EntidadeNaoEncontrada");
    }
    this.usuariosRegistrados.splice(idx, 1);
  }

  // ---- Meu perfil (o próprio usuário logado) -------------------------------------------------

  private exigirSessao(): Usuario {
    if (!this.usuarioAtual) this.restaurarSessaoStorage();
    if (!this.usuarioAtual) {
      throw new DomainError("Entre no sistema para alterar o seu perfil.", "CredenciaisInvalidas");
    }
    return this.usuarioAtual;
  }

  public async atualizarMeuPerfil(dados: AtualizarMeuPerfilDTO): Promise<Usuario> {
    const atual = this.exigirSessao();
    if (this.deveUsarApiAdmin()) {
      const payload: Record<string, string> = {};
      if (dados.nome !== undefined) payload.nome = dados.nome.trim();
      if (dados.email !== undefined) payload.email = dados.email.trim().toLowerCase();
      if (dados.username !== undefined) payload.username = dados.username.trim().toLowerCase();
      const dto = await this.apiAdminRequest<ApiUsuarioDTO>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const atualizado = this.mapearApiUsuario(dto, "API");
      this.sincronizarPropriaSessaoSeAplicavel(atualizado);
      return atualizado;
    }
    // Demonstração: mesma regra local da edição de usuários (validação e unicidade)
    return this.atualizar(atual.id, {
      nome: dados.nome,
      email: dados.email,
      username: dados.username,
    });
  }

  public async trocarMinhaSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    const atual = this.exigirSessao();
    if (!senhaAtual) throw new DomainError("Informe a senha atual.", "RegraNegocio");
    if (!novaSenha || novaSenha.length < 8) {
      throw new DomainError("A nova senha deve ter ao menos 8 caracteres.", "RegraNegocio");
    }
    if (novaSenha === senhaAtual) {
      throw new DomainError("A nova senha deve ser diferente da senha atual.", "RegraNegocio");
    }
    if (this.deveUsarApiAdmin()) {
      await this.apiAdminRequest<void>("/auth/me/senha", {
        method: "POST",
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
      });
      return;
    }
    const reg = this.obterRegistroLocal(atual.id);
    if (reg.senha !== senhaAtual) throw new DomainError("Senha atual incorreta.", "CredenciaisInvalidas");
    reg.senha = novaSenha;
  }

  public async definirMeuPin(senhaAtual: string, pin: string): Promise<void> {
    const atual = this.exigirSessao();
    const pinLimpo = (pin || "").trim();
    if (!senhaAtual) throw new DomainError("Informe a senha atual.", "RegraNegocio");
    if (!REGEX_PIN.test(pinLimpo)) {
      throw new DomainError("O PIN deve conter entre 4 e 6 dígitos numéricos.", "RegraNegocio");
    }
    if (this.deveUsarApiAdmin()) {
      await this.apiAdminRequest<void>("/auth/me/pin", {
        method: "POST",
        body: JSON.stringify({ senha_atual: senhaAtual, pin: pinLimpo }),
      });
      this.sincronizarPropriaSessaoSeAplicavel(
        new Usuario({
          id: atual.id,
          nome: atual.nome,
          email: atual.email,
          username: atual.username,
          papeis: atual.papeis,
          temPin: true,
          telegramUserId: atual.telegramUserId,
          ativo: atual.ativo,
          origemAuth: atual.origemAuth,
        })
      );
      return;
    }
    const reg = this.obterRegistroLocal(atual.id);
    if (reg.senha !== senhaAtual) throw new DomainError("Senha atual incorreta.", "CredenciaisInvalidas");
    await this.definirPin(atual.id, pinLimpo);
    this.sincronizarPropriaSessaoSeAplicavel(this.clonarUsuarioDemo(reg));
  }

  public async logout(): Promise<void> {
    if (this.podeChamarRede() && this.accessToken) {
      try {
        await this.fetchComTimeout(`${this.apiBase}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Ignora falha de rede ao encerrar sessão local
      }
    }
    this.usuarioAtual = null;
    this.accessToken = null;
    this.limparSessaoStorage();
  }

  private deveUsarApiAdmin(): boolean {
    return (
      this.podeChamarRede() &&
      Boolean(this.accessToken) &&
      this.usuarioAtual?.origemAuth === "API"
    );
  }

  private async apiAdminRequest<T>(path: string, init: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchComTimeout(`${this.apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          ...(init.headers || {}),
        },
        credentials: "include",
      });
    } catch {
      throw new DomainError(
        "Falha de comunicação com o servidor da API ao gerenciar usuários.",
        "IntegracaoExterna"
      );
    }

    if (!res.ok) {
      const padrao =
        res.status === 401
          ? "Sessão expirada ou sem autenticação na API. Entre novamente."
          : res.status === 403
          ? "Acesso restrito ao perfil Administrador."
          : "Não foi possível concluir a operação no cadastro de usuários.";
      const msg = await this.extrairMensagemErro(res, padrao);
      throw new DomainError(msg, "RegraNegocio");
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  private async extrairMensagemErro(res: Response, fallback: string): Promise<string> {
    const body = (await res.json().catch(() => null)) as
      | { erro?: string; detail?: string | Array<{ msg?: string }> }
      | null;
    if (!body) return fallback;
    if (typeof body.erro === "string" && body.erro.trim()) return body.erro;
    if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
    if (Array.isArray(body.detail) && body.detail.length > 0 && body.detail[0]?.msg) {
      return body.detail[0].msg;
    }
    return fallback;
  }

  private validarCamposBasicos(
    nome: string,
    email: string,
    username: string | undefined,
    papeis: Papel[]
  ): void {
    if (!nome) {
      throw new DomainError("Nome do usuário é obrigatório.", "RegraNegocio");
    }
    if (!REGEX_EMAIL.test(email)) {
      throw new DomainError("E-mail do usuário inválido.", "RegraNegocio");
    }
    if (username && !REGEX_USERNAME.test(username)) {
      throw new DomainError(
        "Usuário de login deve ter de 3 a 50 caracteres (letras, números, ponto, hífen ou sublinhado).",
        "RegraNegocio"
      );
    }
    if (!papeis || papeis.length === 0) {
      throw new DomainError("O usuário deve possuir ao menos um papel de acesso.", "RegraNegocio");
    }
  }

  private validarUnicidadeLocal(
    ignorarId: string | null,
    email: string,
    username: string | undefined,
    telegramUserId: string | undefined
  ): void {
    const emailExiste = this.usuariosRegistrados.some(
      (r) => r.usuario.id !== ignorarId && r.usuario.email.toLowerCase() === email
    );
    if (emailExiste) {
      throw new DomainError(`Já existe um usuário com o e-mail '${email}'.`, "RegraNegocio");
    }
    if (username) {
      const userExiste = this.usuariosRegistrados.some(
        (r) => r.usuario.id !== ignorarId && r.usuario.username.toLowerCase() === username
      );
      if (userExiste) {
        throw new DomainError(`O usuário de login '${username}' já está em uso.`, "RegraNegocio");
      }
    }
    if (telegramUserId) {
      const tgExiste = this.usuariosRegistrados.some(
        (r) => r.usuario.id !== ignorarId && r.usuario.telegramUserId === telegramUserId
      );
      if (tgExiste) {
        throw new DomainError("Este Telegram já está vinculado a outro colaborador.", "RegraNegocio");
      }
    }
  }

  private obterRegistroLocal(usuarioId: string): RegistroDemo {
    const reg = this.usuariosRegistrados.find((u) => u.usuario.id === usuarioId);
    if (!reg) {
      throw new DomainError("Usuário não encontrado.", "EntidadeNaoEncontrada");
    }
    return reg;
  }

  private clonarUsuarioDemo(reg: RegistroDemo): Usuario {
    return new Usuario({
      id: reg.usuario.id,
      nome: reg.usuario.nome,
      username: reg.usuario.username,
      email: reg.usuario.email,
      papeis: [...reg.usuario.papeis],
      pin: reg.pin || undefined,
      temPin: Boolean(reg.pin),
      telegramUserId: reg.usuario.telegramUserId,
      ativo: reg.usuario.ativo,
      origemAuth: "DEMO_LOCAL",
    });
  }

  private sincronizarPropriaSessaoSeAplicavel(atualizado: Usuario): void {
    if (this.usuarioAtual?.id === atualizado.id) {
      this.definirSessao(atualizado, this.accessToken, this.estaPersistidoLocal());
    }
  }

  private gerarId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `u-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  private mapearApiUsuario(dto: ApiUsuarioDTO, origem: OrigemAutenticacao): Usuario {
    const papeis = (dto.papeis || [])
      .map((p) => Papel[p as keyof typeof Papel])
      .filter(Boolean);
    return new Usuario({
      id: dto.id,
      nome: dto.nome,
      username: dto.username || dto.email.split("@")[0],
      email: dto.email,
      papeis: papeis.length > 0 ? papeis : [Papel.BALCONISTA],
      temPin: Boolean(dto.tem_pin),
      telegramUserId: dto.telegram_user_id ?? undefined,
      ativo: dto.ativo,
      telaInicial: dto.tela_inicial,
      modulos: dto.modulos,
      origemAuth: origem,
    });
  }

  private podeChamarRede(): boolean {
    if (typeof window === "undefined" || typeof fetch !== "function") return false;
    // Em JSDOM / Vitest sem origem http(s) real ou com userAgent jsdom, usa modo local determinístico
    if (typeof navigator !== "undefined" && navigator.userAgent?.toLowerCase().includes("jsdom")) {
      return false;
    }
    return window.location.protocol.startsWith("http");
  }

  private async fetchComTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private definirSessao(usuario: Usuario, token: string | null, lembrarSessao: boolean): void {
    this.usuarioAtual = usuario;
    this.accessToken = token;
    if (typeof window === "undefined") return;

    const payload: SessaoPersistida = {
      accessToken: token ?? undefined,
      origemAuth: usuario.origemAuth,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        username: usuario.username,
        email: usuario.email,
        papeis: usuario.papeis,
        temPin: usuario.temPin,
        telegramUserId: usuario.telegramUserId,
        telaInicial: usuario.telaInicial,
        modulos: usuario.modulos,
      },
    };
    const serializado = JSON.stringify(payload);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, serializado);
      if (lembrarSessao) {
        window.localStorage.setItem(STORAGE_KEY, serializado);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage indisponível (aba privada restrita)
    }
  }

  private restaurarSessaoStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw =
        window.sessionStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SessaoPersistida;
      if (!parsed?.usuario?.id || !parsed.usuario.nome) return;
      this.accessToken = parsed.accessToken ?? null;
      this.usuarioAtual = new Usuario({
        id: parsed.usuario.id,
        nome: parsed.usuario.nome,
        username: parsed.usuario.username,
        email: parsed.usuario.email,
        papeis: parsed.usuario.papeis,
        temPin: parsed.usuario.temPin,
        telegramUserId: parsed.usuario.telegramUserId,
        telaInicial: parsed.usuario.telaInicial,
        modulos: parsed.usuario.modulos,
        origemAuth: parsed.origemAuth ?? "DEMO_LOCAL",
      });
    } catch {
      this.limparSessaoStorage();
    }
  }

  private estaPersistidoLocal(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return Boolean(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  }

  private limparSessaoStorage(): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignora erro de storage
    }
  }
}
