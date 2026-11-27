/**
 * ViewModel: useAuth
 * Gerencia a sessão do operador, permissões RBAC, login/logout e troca rápida por PIN.
 */
import { useState, useEffect } from "react";
import { Usuario } from "../../domain/entities/Usuario";
import { OperadorRapidoInfo } from "../../application/ports/repositories/IAuthRepository";
import { container } from "../../infra/di/container";

export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [operadoresRapidos, setOperadoresRapidos] = useState<OperadorRapidoInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [autenticando, setAutenticando] = useState(false);
  const [lockScreenAberto, setLockScreenAberto] = useState(false);
  const [erroAuth, setErroAuth] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      container.authRepository.obterUsuarioAtual(),
      container.authRepository.listarOperadoresRapidos(),
    ]).then(([u, lista]) => {
      setUsuario(u);
      setOperadoresRapidos(lista);
      setCarregando(false);
    });
  }, []);

  const recarregarSessaoEOperadores = async () => {
    const [u, lista] = await Promise.all([
      container.authRepository.obterUsuarioAtual(),
      container.authRepository.listarOperadoresRapidos(),
    ]);
    setUsuario(u);
    setOperadoresRapidos(lista);
  };

  const login = async (usernameOuEmail: string, senha: string, lembrarSessao = false) => {
    try {
      setAutenticando(true);
      setErroAuth(null);
      const u = await container.autenticarUC.executar(usernameOuEmail, senha, lembrarSessao);
      setUsuario(u);
      // Com a sessão aberta, a lista da troca rápida passa a ser a do servidor
      setOperadoresRapidos(await container.authRepository.listarOperadoresRapidos());
      return u;
    } catch (err: unknown) {
      setErroAuth(err instanceof Error ? err.message : "Erro na autenticação.");
      return null;
    } finally {
      setAutenticando(false);
    }
  };

  const trocarOperadorPorPin = async (pin: string, usuarioId?: string) => {
    try {
      setAutenticando(true);
      setErroAuth(null);
      const u = await container.trocarOperadorPorPinUC.executar(pin, usuarioId);
      setUsuario(u);
      setLockScreenAberto(false);
      return true;
    } catch (err: unknown) {
      setErroAuth(err instanceof Error ? err.message : "PIN inválido.");
      return false;
    } finally {
      setAutenticando(false);
    }
  };

  const logout = async () => {
    await container.authRepository.logout();
    setErroAuth(null);
    setLockScreenAberto(false);
    setUsuario(null);
  };

  return {
    usuario,
    operadoresRapidos,
    carregando,
    autenticando,
    lockScreenAberto,
    setLockScreenAberto,
    erroAuth,
    setErroAuth,
    login,
    trocarOperadorPorPin,
    logout,
    recarregarSessaoEOperadores,
  };
}
