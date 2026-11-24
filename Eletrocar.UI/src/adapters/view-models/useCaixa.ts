/**
 * ViewModel: useCaixa
 * Controla a visualização e operações do caixa diário, sangrias e conciliação.
 */
import { useState, useEffect, useCallback } from "react";
import { Caixa } from "../../domain/entities/Caixa";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { container } from "../../infra/di/container";
import type { ValoresContados } from "../../application/ports/repositories/ICaixaRepository";

export function useCaixa(operadorNome: string) {
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [carregando, setCarregando] = useState(true);
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
    carregarCaixa();
  }, [carregarCaixa]);

  const abrirTurno = async (saldoInicialNum: number) => {
    try {
      setMensagemErro(null);
      const novo = await container.operarCaixaUC.abrirCaixa(
        "usr-atual",
        operadorNome,
        new Dinheiro(saldoInicialNum, false)
      );
      setCaixa(novo);
      setModalAberturaAberto(false);
      setMensagemSucesso(`Turno de caixa ${novo.rotuloTurno} aberto com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao abrir caixa.");
    }
  };

  const fecharTurno = async (valoresContados?: ValoresContados) => {
    if (!caixa) return;
    try {
      setMensagemErro(null);
      await container.operarCaixaUC.fecharCaixa(caixa.id, valoresContados);
      setMensagemSucesso(`Turno ${caixa.rotuloTurno} fechado com sucesso.`);
      setTimeout(() => setMensagemSucesso(null), 3000);
      carregarCaixa();
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao fechar caixa.");
    }
  };

  const realizarSangria = async (valor: number, motivo: string) => {
    if (!caixa) return;
    try {
      setMensagemErro(null);
      await container.operarCaixaUC.realizarSangria(
        caixa.id,
        new Dinheiro(valor, false),
        motivo,
        operadorNome
      );
      setModalSangriaAberto(false);
      setMensagemSucesso(`Sangria de R$ ${valor.toFixed(2)} registrada.`);
      setTimeout(() => setMensagemSucesso(null), 3000);
      carregarCaixa();
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao registrar sangria.");
    }
  };

  const realizarSuprimento = async (valor: number, motivo: string) => {
    if (!caixa) return;
    try {
      setMensagemErro(null);
      await container.operarCaixaUC.realizarSuprimento(
        caixa.id,
        new Dinheiro(valor, false),
        motivo,
        operadorNome
      );
      setModalSuprimentoAberto(false);
      setMensagemSucesso(`Suprimento de R$ ${valor.toFixed(2)} registrado.`);
      setTimeout(() => setMensagemSucesso(null), 3000);
      carregarCaixa();
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao registrar suprimento.");
    }
  };

  return {
    caixa,
    carregando,
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
