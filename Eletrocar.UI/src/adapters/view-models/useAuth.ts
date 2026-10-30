/**
 * ViewModel: useAuth
 * Gerencia a sessão do operador, permissões RBAC e a troca rápida de operador por PIN.
 */
import { useState, useEffect } from "react";
import { Usuario } from "../../domain/entities/Usuario";
import { container } from "../../infra/di/container";

export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [lockScreenAberto, setLockScreenAberto] = useState(false);
  const [erroAuth, setErroAuth] = useState<string | null>(null);

  useEffect(() => {
    container.authRepository.obterUsuarioAtual().then((u) => {
      setUsuario(u);
      setCarregando(false);
    });
  }, []);

  const login = async (usernameOuEmail: string, senha: string) => {
    try {
      setErroAuth(null);
      const u = await container.autenticarUC.executar(usernameOuEmail, senha);
      setUsuario(u);
      return true;
    } catch (err: unknown) {
      setErroAuth(err instanceof Error ? err.message : "Erro na autenticação.");
      return false;
    }
  };

  const trocarOperadorPorPin = async (pin: string) => {
    try {
      setErroAuth(null);
      const u = await container.trocarOperadorPorPinUC.executar(pin);
      setUsuario(u);
      setLockScreenAberto(false);
      return true;
    } catch (err: unknown) {
      setErroAuth(err instanceof Error ? err.message : "PIN inválido.");
      return false;
    }
  };

  const logout = async () => {
    await container.authRepository.logout();
    setUsuario(null);
  };

  return {
    usuario,
    carregando,
    lockScreenAberto,
    setLockScreenAberto,
    erroAuth,
    setErroAuth,
    login,
    trocarOperadorPorPin,
    logout,
  };
}
