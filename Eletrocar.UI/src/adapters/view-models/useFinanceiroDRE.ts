import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CompetenciaDRE,
  DadosDREPeriodo,
  DetalhamentoDRE,
  FiltroResultadoDRE,
  ResumoMensalDREAnual,
  SerieDiariaDRE,
} from "../../application/ports/repositories/IRelatorioDRERepository";
import {
  ANOS_DISPONIVEIS_DRE,
  chaveCompetencia,
  decomporDataIso,
  normalizarCompetencias,
  normalizarDiasIso,
} from "../repositories/MockOrHttpDRERepository";
import { container } from "../../infra/di/container";

function competenciaAtualPadrao(): CompetenciaDRE {
  const hoje = new Date();
  const anoAtual = Math.min(Math.max(hoje.getFullYear(), 2024), 2026);
  return { ano: anoAtual, mes: hoje.getMonth() + 1 };
}

function mesesDoAno(ano: number): CompetenciaDRE[] {
  return Array.from({ length: 12 }, (_, idx) => ({ ano, mes: idx + 1 }));
}

export function useFinanceiroDRE() {
  const [competenciasSelecionadas, setCompetenciasSelecionadas] = useState<CompetenciaDRE[]>(() => [
    competenciaAtualPadrao(),
  ]);
  /** Quando preenchido, filtra a DRE e os gráficos exatamente pelos dias selecionados (avulsos, espaçados ou período arrastado). */
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);
  const [competenciaDiaria, setCompetenciaDiaria] = useState<CompetenciaDRE>(() =>
    competenciaAtualPadrao()
  );
  const [filtroResultado, setFiltroResultado] = useState<FiltroResultadoDRE>("TODOS");
  const [drePeriodo, setDrePeriodo] = useState<DadosDREPeriodo | null>(null);
  const [resumoMensal, setResumoMensal] = useState<ResumoMensalDREAnual | null>(null);
  const [detalhamento, setDetalhamento] = useState<DetalhamentoDRE | null>(null);
  const [serieDiaria, setSerieDiaria] = useState<SerieDiariaDRE | null>(null);
  const [erroDetalhamento, setErroDetalhamento] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const anosSelecionados = useMemo(() => {
    const anosComp = competenciasSelecionadas.map((c) => c.ano);
    const anosDias = diasSelecionados.map((iso) => decomporDataIso(iso).ano);
    const anos = Array.from(new Set([...anosComp, ...anosDias])).sort((a, b) => a - b);
    return anos.length > 0 ? anos : [competenciaAtualPadrao().ano];
  }, [competenciasSelecionadas, diasSelecionados]);

  const ano = anosSelecionados[anosSelecionados.length - 1];
  const mes: number | "TODOS" = useMemo(() => {
    if (diasSelecionados.length > 0) {
      return decomporDataIso(diasSelecionados[diasSelecionados.length - 1]).mes;
    }
    if (competenciasSelecionadas.length === 1) {
      return competenciasSelecionadas[0].mes;
    }
    return "TODOS";
  }, [competenciasSelecionadas, diasSelecionados]);

  const competenciaDiariaAtiva = useMemo(() => {
    if (diasSelecionados.length > 0) {
      const ultimo = decomporDataIso(diasSelecionados[diasSelecionados.length - 1]);
      return { ano: ultimo.ano, mes: ultimo.mes };
    }
    const chaveAtual = chaveCompetencia(competenciaDiaria);
    const existe = competenciasSelecionadas.some((c) => chaveCompetencia(c) === chaveAtual);
    return existe
      ? competenciaDiaria
      : (competenciasSelecionadas[competenciasSelecionadas.length - 1] ?? competenciaAtualPadrao());
  }, [competenciaDiaria, competenciasSelecionadas, diasSelecionados]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const temDiasEspecificos = diasSelecionados.length > 0;
      const [dadosPeriodo, dadosMensal, dadosDetalhe] = await Promise.all([
        temDiasEspecificos
          ? container.dreRepository.obterDREDias(diasSelecionados)
          : container.dreRepository.obterDRECompetencias(competenciasSelecionadas),
        container.dreRepository.obterResumoMensalAnos(anosSelecionados, filtroResultado),
        (temDiasEspecificos
          ? container.dreRepository.obterDetalhamentoDias(diasSelecionados)
          : container.dreRepository.obterDetalhamentoCompetencias(competenciasSelecionadas)
        ).then(
          (dados) => ({ dados, erro: null as string | null }),
          (err: unknown) => ({
            dados: null,
            erro: err instanceof Error ? err.message : "Não foi possível carregar os lançamentos.",
          })
        ),
      ]);

      const dadosDiarios = await container.dreRepository.obterSerieDiaria({
        ano: competenciaDiariaAtiva.ano,
        mes: competenciaDiariaAtiva.mes,
        detalhamento: dadosDetalhe.dados,
        diasFiltrados: temDiasEspecificos ? diasSelecionados : undefined,
      });

      setDrePeriodo(dadosPeriodo);
      setResumoMensal(dadosMensal);
      setDetalhamento(dadosDetalhe.dados);
      setErroDetalhamento(dadosDetalhe.erro);
      setSerieDiaria(dadosDiarios);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível carregar os dados da DRE.");
    } finally {
      setCarregando(false);
    }
  }, [
    competenciasSelecionadas,
    diasSelecionados,
    anosSelecionados,
    filtroResultado,
    competenciaDiariaAtiva,
  ]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Clique simples em um dia: alterna o dia (permite selecionar múltiplos dias com espaçamento). */
  const alternarDia = useCallback((iso: string) => {
    const info = decomporDataIso(iso);
    setDiasSelecionados((prev) => {
      if (prev.length === 0) {
        return [iso];
      }
      if (prev.includes(iso)) {
        const restantes = prev.filter((d) => d !== iso);
        return restantes;
      }
      return normalizarDiasIso([...prev, iso]);
    });
    setCompetenciasSelecionadas((prev) => {
      const chave = chaveCompetencia({ ano: info.ano, mes: info.mes });
      if (prev.some((c) => chaveCompetencia(c) === chave)) return prev;
      return normalizarCompetencias([...prev, { ano: info.ano, mes: info.mes }]);
    });
    setCompetenciaDiaria({ ano: info.ano, mes: info.mes });
  }, []);

  /** Pressionar e arrastar no calendário: seleciona um período contínuo de dias. */
  const definirIntervaloDias = useCallback((diasIso: string[]) => {
    const norm = normalizarDiasIso(diasIso);
    if (norm.length === 0) return;
    setDiasSelecionados(norm);
    const competenciasDoIntervalo = normalizarCompetencias(
      norm.map((iso) => {
        const d = decomporDataIso(iso);
        return { ano: d.ano, mes: d.mes };
      })
    );
    setCompetenciasSelecionadas(competenciasDoIntervalo);
    const ultimo = decomporDataIso(norm[norm.length - 1]);
    setCompetenciaDiaria({ ano: ultimo.ano, mes: ultimo.mes });
  }, []);

  const limparSelecaoDias = useCallback(() => {
    setDiasSelecionados([]);
  }, []);

  const alternarMes = useCallback((novoAno: number, novoMes: number) => {
    setDiasSelecionados([]);
    setCompetenciasSelecionadas((prev) => {
      const chave = chaveCompetencia({ ano: novoAno, mes: novoMes });
      const jaExiste = prev.some((c) => chaveCompetencia(c) === chave);
      if (jaExiste) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => chaveCompetencia(c) !== chave);
      }
      return normalizarCompetencias([...prev, { ano: novoAno, mes: novoMes }]);
    });
    setCompetenciaDiaria({ ano: novoAno, mes: novoMes });
  }, []);

  const alternarAno = useCallback((anoAlvo: number) => {
    setDiasSelecionados([]);
    setCompetenciasSelecionadas((prev) => {
      const doAno = prev.filter((c) => c.ano === anoAlvo);
      const outrosAnos = prev.filter((c) => c.ano !== anoAlvo);
      if (doAno.length === 12) {
        if (outrosAnos.length > 0) {
          return normalizarCompetencias(outrosAnos);
        }
        return [{ ano: anoAlvo, mes: competenciaAtualPadrao().mes }];
      }
      return normalizarCompetencias([...outrosAnos, ...mesesDoAno(anoAlvo)]);
    });
  }, []);

  const selecionarMesAno = useCallback(
    (novoMes: number | "TODOS", novoAno?: number) => {
      setDiasSelecionados([]);
      const anoRef = typeof novoAno === "number" ? novoAno : ano;
      if (novoMes === "TODOS") {
        setCompetenciasSelecionadas(mesesDoAno(anoRef));
        setCompetenciaDiaria({ ano: anoRef, mes: 12 });
      } else {
        setCompetenciasSelecionadas([{ ano: anoRef, mes: novoMes }]);
        setCompetenciaDiaria({ ano: anoRef, mes: novoMes });
      }
    },
    [ano]
  );

  const selecionarAnoInteiro = useCallback((anoAlvo: number) => {
    setDiasSelecionados([]);
    setCompetenciasSelecionadas(mesesDoAno(anoAlvo));
    setCompetenciaDiaria({ ano: anoAlvo, mes: 12 });
  }, []);

  const selecionarTodosAnos = useCallback(() => {
    setDiasSelecionados([]);
    const todas = ANOS_DISPONIVEIS_DRE.flatMap((a) => mesesDoAno(a));
    setCompetenciasSelecionadas(todas);
    setCompetenciaDiaria(competenciaAtualPadrao());
  }, []);

  const selecionarUltimosMeses = useCallback((quantidade: number) => {
    setDiasSelecionados([]);
    const base = competenciaAtualPadrao();
    const lista: CompetenciaDRE[] = [];
    let a = base.ano;
    let m = base.mes;
    for (let i = 0; i < quantidade; i += 1) {
      if (a >= ANOS_DISPONIVEIS_DRE[0]) {
        lista.push({ ano: a, mes: m });
      }
      m -= 1;
      if (m < 1) {
        m = 12;
        a -= 1;
      }
    }
    const norm = normalizarCompetencias(lista);
    if (norm.length > 0) {
      setCompetenciasSelecionadas(norm);
      setCompetenciaDiaria(norm[norm.length - 1]);
    }
  }, []);

  const irParaMesAtual = useCallback(() => {
    setDiasSelecionados([]);
    const padrao = competenciaAtualPadrao();
    setCompetenciasSelecionadas([padrao]);
    setCompetenciaDiaria(padrao);
  }, []);

  return {
    ano,
    mes,
    anosSelecionados,
    competenciasSelecionadas,
    diasSelecionados,
    competenciaDiaria: competenciaDiariaAtiva,
    setCompetenciaDiaria,
    alternarDia,
    definirIntervaloDias,
    limparSelecaoDias,
    alternarMes,
    alternarAno,
    selecionarAnoInteiro,
    selecionarTodosAnos,
    selecionarUltimosMeses,
    filtroResultado,
    setFiltroResultado,
    drePeriodo,
    resumoMensal,
    detalhamento,
    serieDiaria,
    erroDetalhamento,
    carregando,
    erro,
    recarregar: carregar,
    selecionarMesAno,
    irParaMesAtual,
  };
}
