import { useCallback, useEffect, useState } from "react";
import type {
  DadosDREPeriodo,
  DetalhamentoDRE,
  FiltroResultadoDRE,
  ResumoMensalDREAnual,
} from "../../application/ports/repositories/IRelatorioDRERepository";
import { container } from "../../infra/di/container";

export function useFinanceiroDRE() {
  const [ano, setAno] = useState<number>(() => {
    const anoAtual = new Date().getFullYear();
    return Math.min(Math.max(anoAtual, 2024), 2026);
  });
  const [mes, setMes] = useState<number | "TODOS">(() => new Date().getMonth() + 1);
  const [filtroResultado, setFiltroResultado] = useState<FiltroResultadoDRE>("TODOS");
  const [drePeriodo, setDrePeriodo] = useState<DadosDREPeriodo | null>(null);
  const [resumoMensal, setResumoMensal] = useState<ResumoMensalDREAnual | null>(null);
  const [detalhamento, setDetalhamento] = useState<DetalhamentoDRE | null>(null);
  const [erroDetalhamento, setErroDetalhamento] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [dadosPeriodo, dadosMensal, dadosDetalhe] = await Promise.all([
        container.dreRepository.obterDREPeriodo({ ano, mes }),
        container.dreRepository.obterResumoMensalAnual({ ano, resultado: filtroResultado }),
        // O detalhamento é complementar: se falhar, a DRE continua visível.
        container.dreRepository.obterDetalhamento({ ano, mes }).then(
          (dados) => ({ dados, erro: null as string | null }),
          (err: unknown) => ({
            dados: null,
            erro: err instanceof Error ? err.message : "Não foi possível carregar os lançamentos.",
          })
        ),
      ]);
      setDrePeriodo(dadosPeriodo);
      setResumoMensal(dadosMensal);
      setDetalhamento(dadosDetalhe.dados);
      setErroDetalhamento(dadosDetalhe.erro);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível carregar os dados da DRE.");
    } finally {
      setCarregando(false);
    }
  }, [ano, mes, filtroResultado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const selecionarMesAno = useCallback((novoMes: number | "TODOS", novoAno?: number) => {
    if (typeof novoAno === "number") {
      setAno(novoAno);
    }
    setMes(novoMes);
  }, []);

  const irParaMesAtual = useCallback(() => {
    const hoje = new Date();
    setAno(Math.min(Math.max(hoje.getFullYear(), 2024), 2026));
    setMes(hoje.getMonth() + 1);
  }, []);

  return {
    ano,
    setAno,
    mes,
    setMes,
    filtroResultado,
    setFiltroResultado,
    drePeriodo,
    resumoMensal,
    detalhamento,
    erroDetalhamento,
    carregando,
    erro,
    recarregar: carregar,
    selecionarMesAno,
    irParaMesAtual,
  };
}
