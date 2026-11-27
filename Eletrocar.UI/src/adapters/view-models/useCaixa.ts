/**
 * ViewModel: useCaixa
 * Controla a visualização e operações do caixa diário, sangrias e conciliação.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Caixa } from "../../domain/entities/Caixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { container } from "../../infra/di/container";
import type { ValoresContados } from "../../application/ports/repositories/ICaixaRepository";
import { formatarReais } from "../../lib/numeroBR";

export interface OpcoesUseCaixa {
  /** Chamado depois de abrir/fechar o turno ou registrar sangria/suprimento (ex.: atualizar o topo). */
  aoAlterar?: () => void;
  /** false = não consulta o servidor ao montar; quem usa decide quando chamar carregarCaixa. */
  carregarAoIniciar?: boolean;
}

export function useCaixa(operadorNome: string, opcoes: OpcoesUseCaixa = {}) {
  const { carregarAoIniciar = true } = opcoes;
  const aoAlterarRef = useRef(opcoes.aoAlterar);
  aoAlterarRef.current = opcoes.aoAlterar;

  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [carregando, setCarregando] = useState(carregarAoIniciar);
  // Ação em andamento: os botões ficam travados e mostram "Abrindo...", "Registrando"...
  // (no servidor de produção cada ação leva alguns segundos; sem isso a pessoa clica duas vezes)
  const [processando, setProcessando] = useState(false);
  const [modalSangriaAberto, setModalSangriaAberto] = useState(false);
  const [modalSuprimentoAberto, setModalSuprimentoAberto] = useState(false);
  const [modalAberturaAberto, setModalAberturaAberto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const carregarCaixa = useCallback(async () => {
    setCarregando(true);
    try {
      setCaixa(await container.caixaRepository.obterCaixaAberto());
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Não foi possível consultar o caixa.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (carregarAoIniciar) void carregarCaixa();
  }, [carregarAoIniciar, carregarCaixa]);

  const avisarSucesso = (texto: string) => {
    setMensagemSucesso(texto);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  /** Executa uma ação do caixa uma vez só por vez; devolve true se o servidor aceitou. */
  const executar = async (acao: () => Promise<void>, mensagemFalha: string): Promise<boolean> => {
    if (processando) return false;
    setProcessando(true);
    setMensagemErro(null);
    try {
      await acao();
      aoAlterarRef.current?.();
      return true;
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : mensagemFalha);
      return false;
    } finally {
      setProcessando(false);
    }
  };

  const abrirTurno = (saldoInicialNum: number) =>
    executar(async () => {
      const novo = await container.operarCaixaUC.abrirCaixa(
        "usr-atual",
        operadorNome,
        new Dinheiro(saldoInicialNum, false)
      );
      setCaixa(novo);
      setModalAberturaAberto(false);
      avisarSucesso(`Turno de caixa ${novo.rotuloTurno} aberto com sucesso!`);
    }, "Erro ao abrir caixa.");

  const fecharTurno = (valoresContados?: ValoresContados) =>
    executar(async () => {
      if (!caixa) return;
      await container.operarCaixaUC.fecharCaixa(caixa.id, valoresContados);
      avisarSucesso(`Turno ${caixa.rotuloTurno} fechado com sucesso.`);
      await carregarCaixa();
    }, "Erro ao fechar caixa.");

  /** true = gravada; false = recusada (o modal continua aberto, com o que foi digitado). */
  const realizarSangria = (valor: number, motivo: string) =>
    executar(async () => {
      if (!caixa) throw new Error("Nenhum turno de caixa aberto.");
      await container.operarCaixaUC.realizarSangria(caixa.id, new Dinheiro(valor, false), motivo, operadorNome);
      setModalSangriaAberto(false);
      avisarSucesso(`Sangria de ${formatarReais(valor)} registrada.`);
      await carregarCaixa();
    }, "Erro ao registrar sangria.");

  const realizarSuprimento = (valor: number, motivo: string) =>
    executar(async () => {
      if (!caixa) throw new Error("Nenhum turno de caixa aberto.");
      await container.operarCaixaUC.realizarSuprimento(caixa.id, new Dinheiro(valor, false), motivo, operadorNome);
      setModalSuprimentoAberto(false);
      avisarSucesso(`Suprimento de ${formatarReais(valor)} registrado.`);
      await carregarCaixa();
    }, "Erro ao registrar suprimento.");

  return {
    caixa,
    carregando,
    processando,
    abrirTurno,
    fecharTurno,
    realizarSangria,
    realizarSuprimento,
    modalSangriaAberto,
    setModalSangriaAberto,
    modalSuprimentoAberto,
    setModalSuprimentoAberto,
    modalAberturaAberto,
    setModalAberturaAberto,
    mensagemSucesso,
    mensagemErro,
    setMensagemErro,
    carregarCaixa,
  };
}
