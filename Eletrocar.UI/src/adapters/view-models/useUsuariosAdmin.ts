/**
 * ViewModel: useUsuariosAdmin
 * Gerencia listagem, criação, edição completa (dados, papéis, senha, PIN, status)
 * e remoção de usuários pelo Administrador.
 */
import { useCallback, useEffect, useState } from "react";
import { Usuario } from "../../domain/entities/Usuario";
import { Papel } from "../../domain/value-objects/Enums";
import { CriarUsuarioDTO } from "../../application/ports/repositories/IUsuarioAdminRepository";
import { container } from "../../infra/di/container";

export interface EdicaoUsuarioFormDTO {
  nome: string;
  email: string;
  username: string;
  telegramUserId: string;
  papeis: Papel[];
  ativo: boolean;
  novaSenha: string;
  novoPin: string;
}

function mesmaListaPapeis(a: Papel[], b: Papel[]): boolean {
  if (a.length !== b.length) return false;
  const sA = [...a].sort();
  const sB = [...b].sort();
  return sA.every((p, idx) => p === sB[idx]);
}

export function useUsuariosAdmin(onUsuariosAlterados?: () => Promise<void> | void) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregarUsuarios = useCallback(async () => {
    try {
      setCarregando(true);
      const lista = await container.gerenciarUsuariosUC.listarTodos();
      setUsuarios(lista);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarUsuarios();
  }, [carregarUsuarios]);

  const notificarAtualizacao = async () => {
    await carregarUsuarios();
    await onUsuariosAlterados?.();
  };

  const criarUsuario = async (dados: CriarUsuarioDTO): Promise<boolean> => {
    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);
      const criado = await container.gerenciarUsuariosUC.criar(dados);
      await notificarAtualizacao();
      setSucesso(`Usuário "${criado.nome}" cadastrado com sucesso.`);
      return true;
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não foi possível cadastrar o usuário.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicaoUsuario = async (
    original: Usuario,
    form: EdicaoUsuarioFormDTO
  ): Promise<boolean> => {
    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);

      await container.gerenciarUsuariosUC.atualizar(original.id, {
        nome: form.nome,
        email: form.email,
        username: form.username.trim() || null,
        telegramUserId: form.telegramUserId.trim() || null,
      });

      if (!mesmaListaPapeis(original.papeis, form.papeis)) {
        await container.gerenciarUsuariosUC.definirPapeis(original.id, form.papeis);
      }

      if (original.ativo !== form.ativo) {
        await container.gerenciarUsuariosUC.alterarStatus(original.id, form.ativo);
      }

      if (form.novaSenha.trim()) {
        await container.gerenciarUsuariosUC.redefinirSenha(original.id, form.novaSenha);
      }

      if (form.novoPin.trim()) {
        await container.gerenciarUsuariosUC.definirPin(original.id, form.novoPin.trim());
      }

      await notificarAtualizacao();
      setSucesso(`Cadastro de "${form.nome.trim()}" atualizado.`);
      return true;
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não foi possível atualizar o usuário.");
      await carregarUsuarios();
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const alternarStatusUsuario = async (usuario: Usuario): Promise<boolean> => {
    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);
      const novoAtivo = !usuario.ativo;
      await container.gerenciarUsuariosUC.alterarStatus(usuario.id, novoAtivo);
      await notificarAtualizacao();
      setSucesso(
        `Usuário "${usuario.nome}" foi ${novoAtivo ? "ativado" : "desativado"} com sucesso.`
      );
      return true;
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não foi possível alterar o status.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const removerUsuario = async (usuario: Usuario): Promise<boolean> => {
    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);
      await container.gerenciarUsuariosUC.remover(usuario.id);
      await notificarAtualizacao();
      setSucesso(`Usuário "${usuario.nome}" removido.`);
      return true;
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não foi possível remover o usuário.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  return {
    usuarios,
    carregando,
    salvando,
    erro,
    setErro,
    sucesso,
    setSucesso,
    carregarUsuarios,
    criarUsuario,
    salvarEdicaoUsuario,
    alternarStatusUsuario,
    removerUsuario,
  };
}

