/**
 * Seletor moderno de calendário em 3 níveis (Dias ↔ Meses ↔ Anos):
 * - Clique em um dia para selecioná-lo; clique em outros dias para seleção com espaçamento.
 * - Pressione, segure e arraste sobre os dias para selecionar um período contínuo.
 * - Role o scroll do mouse para alternar: Dias → Meses → Anos (e sentido inverso para voltar).
 * - Permite selecionar múltiplos dias, múltiplos meses e múltiplos anos.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mouse,
  RotateCcw,
  X,
} from "lucide-react";
import type {
  CompetenciaDRE,
  ResumoMensalDREItem,
} from "../../application/ports/repositories/IRelatorioDRERepository";
import {
  ANOS_DISPONIVEIS_DRE,
  MESES_ABREV_PT_BR,
  MESES_PT_BR,
  chaveCompetencia,
  criarDataIso,
  decomporDataIso,
  formatarRotuloCompetencias,
  formatarRotuloDias,
  gerarIntervaloDiasIso,
} from "../../adapters/repositories/MockOrHttpDRERepository";
import { cn } from "../../lib/utils";

type VisaoCalendario = "DIAS" | "MESES" | "ANOS";
const NIVEIS_CALENDARIO: VisaoCalendario[] = ["DIAS", "MESES", "ANOS"];
const LETRAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

interface SeletorPeriodoCalendarioProps {
  competenciasSelecionadas: CompetenciaDRE[];
  diasSelecionados: string[];
  resumoMesesDisponiveis?: ResumoMensalDREItem[];
  onAlternarDia: (iso: string) => void;
  onDefinirIntervaloDias: (diasIso: string[]) => void;
  onLimparSelecaoDias: () => void;
  onAlternarMes: (ano: number, mes: number) => void;
  onAlternarAno: (ano: number) => void;
  onSelecionarAnoInteiro: (ano: number) => void;
  onSelecionarUltimosMeses: (quantidade: number) => void;
  onSelecionarTodosAnos: () => void;
  onIrParaMesAtual: () => void;
}

export const SeletorPeriodoCalendario: React.FC<SeletorPeriodoCalendarioProps> = ({
  competenciasSelecionadas,
  diasSelecionados,
  resumoMesesDisponiveis = [],
  onAlternarDia,
  onDefinirIntervaloDias,
  onLimparSelecaoDias,
  onAlternarMes,
  onAlternarAno,
  onSelecionarAnoInteiro,
  onSelecionarUltimosMeses,
  onSelecionarTodosAnos,
  onIrParaMesAtual,
}) => {
  const [aberto, setAberto] = useState(false);
  const [visao, setVisao] = useState<VisaoCalendario>("DIAS");

  const competenciaInicial =
    competenciasSelecionadas[competenciasSelecionadas.length - 1] ?? {
      ano: ANOS_DISPONIVEIS_DRE[ANOS_DISPONIVEIS_DRE.length - 1],
      mes: 11,
    };

  const [anoNavegacao, setAnoNavegacao] = useState<number>(competenciaInicial.ano);
  const [mesNavegacao, setMesNavegacao] = useState<number>(competenciaInicial.mes);

  // Estado de arraste (pressionar, segurar e arrastar para selecionar período)
  const [arrasteInicio, setArrasteInicio] = useState<string | null>(null);
  const [arrasteAtual, setArrasteAtual] = useState<string | null>(null);
  const arrasteRef = useRef<{
    inicio: string;
    atual: string;
    arrastou: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const ultimoWheelRef = useRef<number>(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Em telas baixas o calendário abria cortado embaixo (e a roda do mouse troca Dias/Meses/Anos
  // em vez de rolar): ao abrir, a página rola até ele ficar inteiro à vista.
  useEffect(() => {
    if (aberto) popoverRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [aberto]);

  const chavesSelecionadas = useMemo(
    () => new Set(competenciasSelecionadas.map((c) => chaveCompetencia(c))),
    [competenciasSelecionadas]
  );

  const diasSelecionadosSet = useMemo(() => new Set(diasSelecionados), [diasSelecionados]);

  const previewArrasteSet = useMemo(() => {
    if (!arrasteInicio || !arrasteAtual) return new Set<string>();
    return new Set(gerarIntervaloDiasIso(arrasteInicio, arrasteAtual));
  }, [arrasteInicio, arrasteAtual]);

  const statusPorChave = useMemo(() => {
    const mapa = new Map<string, "lucro" | "prejuizo" | "neutro">();
    for (const item of resumoMesesDisponiveis) {
      const chave = chaveCompetencia({ ano: item.ano, mes: item.mes });
      mapa.set(chave, item.ehLucro ? "lucro" : item.ehPrejuizo ? "prejuizo" : "neutro");
    }
    return mapa;
  }, [resumoMesesDisponiveis]);

  const contagemPorAno = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const c of competenciasSelecionadas) {
      mapa.set(c.ano, (mapa.get(c.ano) ?? 0) + 1);
    }
    return mapa;
  }, [competenciasSelecionadas]);

  // Fecha popover ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!aberto) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [aberto]);

  const finalizarArraste = () => {
    const estado = arrasteRef.current;
    if (!estado) return;
    arrasteRef.current = null;
    setArrasteInicio(null);
    setArrasteAtual(null);

    if (estado.arrastou) {
      onDefinirIntervaloDias(gerarIntervaloDiasIso(estado.inicio, estado.atual));
    } else {
      onAlternarDia(estado.inicio);
    }
  };

  const finalizarArrasteRef = useRef(finalizarArraste);
  useEffect(() => {
    finalizarArrasteRef.current = finalizarArraste;
  });

  // Finaliza arraste globalmente mesmo se o mouse for solto fora do botão do dia
  useEffect(() => {
    if (!aberto) return;
    const onWindowMouseUp = () => finalizarArrasteRef.current();
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [aberto]);

  // Scroll em 3 níveis: DIAS -> MESES -> ANOS (e inverso ao rolar para cima)
  const handleWheelAlternarVisao = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 4) return;
    e.preventDefault();
    const agora = Date.now();
    if (agora - ultimoWheelRef.current < 200) return;
    ultimoWheelRef.current = agora;

    setVisao((atual) => {
      const idx = NIVEIS_CALENDARIO.indexOf(atual);
      if (e.deltaY > 0) {
        return NIVEIS_CALENDARIO[Math.min(idx + 1, NIVEIS_CALENDARIO.length - 1)];
      }
      return NIVEIS_CALENDARIO[Math.max(idx - 1, 0)];
    });
  };

  const iniciarArrasteDia = (iso: string) => {
    arrasteRef.current = { inicio: iso, atual: iso, arrastou: false };
    setArrasteInicio(iso);
    setArrasteAtual(iso);
  };

  const atualizarArrasteDia = (iso: string) => {
    if (!arrasteRef.current) return;
    if (iso !== arrasteRef.current.inicio) {
      arrasteRef.current.arrastou = true;
    }
    arrasteRef.current.atual = iso;
    setArrasteAtual(iso);
  };

  const minAno = ANOS_DISPONIVEIS_DRE[0];
  const maxAno = ANOS_DISPONIVEIS_DRE[ANOS_DISPONIVEIS_DRE.length - 1];

  const podeVoltar =
    visao === "DIAS"
      ? anoNavegacao > minAno || mesNavegacao > 1
      : visao === "MESES"
      ? anoNavegacao > minAno
      : false;

  const podeAvancar =
    visao === "DIAS"
      ? anoNavegacao < maxAno || mesNavegacao < 12
      : visao === "MESES"
      ? anoNavegacao < maxAno
      : false;

  const navegarAnterior = () => {
    if (!podeVoltar) return;
    if (visao === "DIAS") {
      if (mesNavegacao > 1) {
        setMesNavegacao((m) => m - 1);
      } else {
        setAnoNavegacao((a) => a - 1);
        setMesNavegacao(12);
      }
    } else if (visao === "MESES") {
      setAnoNavegacao((a) => Math.max(minAno, a - 1));
    }
  };

  const navegarProximo = () => {
    if (!podeAvancar) return;
    if (visao === "DIAS") {
      if (mesNavegacao < 12) {
        setMesNavegacao((m) => m + 1);
      } else {
        setAnoNavegacao((a) => a + 1);
        setMesNavegacao(1);
      }
    } else if (visao === "MESES") {
      setAnoNavegacao((a) => Math.min(maxAno, a + 1));
    }
  };

  // Células do calendário mensal (dias do mês + espaços iniciais da semana)
  const gradeDias = useMemo(() => {
    const primeiroDiaSemana = new Date(anoNavegacao, mesNavegacao - 1, 1).getDay();
    const ultimoDia = new Date(anoNavegacao, mesNavegacao, 0).getDate();
    const celulas: Array<{ dia: number; iso: string } | null> = [];
    for (let i = 0; i < primeiroDiaSemana; i += 1) {
      celulas.push(null);
    }
    for (let d = 1; d <= ultimoDia; d += 1) {
      celulas.push({ dia: d, iso: criarDataIso(anoNavegacao, mesNavegacao, d) });
    }
    return celulas;
  }, [anoNavegacao, mesNavegacao]);

  const mesNavegacaoEstaNoPeriodo = chavesSelecionadas.has(
    chaveCompetencia({ ano: anoNavegacao, mes: mesNavegacao })
  );

  const rotuloResumo =
    diasSelecionados.length > 0
      ? formatarRotuloDias(diasSelecionados)
      : formatarRotuloCompetencias(competenciasSelecionadas);

  const contadorBadge =
    diasSelecionados.length > 0
      ? `${diasSelecionados.length} ${diasSelecionados.length === 1 ? "dia" : "dias"}`
      : `${competenciasSelecionadas.length} ${competenciasSelecionadas.length === 1 ? "mês" : "meses"}`;

  // Chips compactos das seleções ativas
  const chipsAtivos = useMemo(() => {
    if (diasSelecionados.length > 0) {
      return diasSelecionados.map((iso) => {
        const d = decomporDataIso(iso);
        return {
          id: iso,
          texto: `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`,
          onRemover: () => onAlternarDia(iso),
        };
      });
    }

    const chips: Array<{ id: string; texto: string; onRemover?: () => void }> = [];
    for (const anoItem of ANOS_DISPONIVEIS_DRE) {
      const doAno = competenciasSelecionadas.filter((c) => c.ano === anoItem);
      if (doAno.length === 12) {
        chips.push({
          id: `ano-${anoItem}`,
          texto: `${anoItem} (ano inteiro)`,
          onRemover:
            competenciasSelecionadas.length > 12 ? () => onAlternarAno(anoItem) : undefined,
        });
      } else {
        for (const c of doAno) {
          chips.push({
            id: chaveCompetencia(c),
            texto: `${MESES_ABREV_PT_BR[c.mes - 1]}/${c.ano}`,
            onRemover:
              competenciasSelecionadas.length > 1
                ? () => onAlternarMes(c.ano, c.mes)
                : undefined,
          });
        }
      }
    }
    return chips;
  }, [diasSelecionados, competenciasSelecionadas, onAlternarDia, onAlternarAno, onAlternarMes]);

  const abrirCalendario = () => {
    if (!aberto) {
      const ref =
        diasSelecionados.length > 0
          ? decomporDataIso(diasSelecionados[diasSelecionados.length - 1])
          : competenciasSelecionadas[competenciasSelecionadas.length - 1];
      if (ref) {
        setAnoNavegacao(ref.ano);
        setMesNavegacao(ref.mes);
      }
    }
    setAberto((v) => !v);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      {/* Botão gatilho estilo pílula moderna (inspirado na referência) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={aberto}
          aria-haspopup="dialog"
          aria-label="Abrir calendário de competências"
          onClick={abrirCalendario}
          className={cn(
            "inline-flex h-11 items-center gap-2.5 rounded-full border px-4 text-sm font-semibold transition-all",
            aberto
              ? "border-brand-line bg-brand-soft/80 text-fg ring-2 ring-brand/30"
              : "border-brand-line/70 bg-canvas/90 text-fg hover:border-brand-line hover:bg-surface-2"
          )}
        >
          <Calendar size={16} className="shrink-0 text-brand-text" />
          <span className="truncate">{rotuloResumo}</span>
          <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold text-fg-muted">
            {contadorBadge}
          </span>
          <ChevronDown
            size={15}
            className={cn(
              "shrink-0 text-fg-muted transition-transform",
              aberto && "rotate-180 text-brand-text"
            )}
          />
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onIrParaMesAtual}
            className="btn btn-ghost btn-sm"
            title="Voltar para o mês atual completo"
          >
            <RotateCcw size={13} />
            Mês atual
          </button>
          <button
            type="button"
            onClick={() => onSelecionarUltimosMeses(3)}
            className="btn btn-ghost btn-sm"
            title="Comparar os últimos 3 meses"
          >
            3 meses
          </button>
          <button
            type="button"
            onClick={() => onSelecionarAnoInteiro(anoNavegacao)}
            className="btn btn-ghost btn-sm"
            title={`Selecionar todos os 12 meses de ${anoNavegacao}`}
          >
            Ano {anoNavegacao}
          </button>
          {diasSelecionados.length > 0 && (
            <button
              type="button"
              onClick={onLimparSelecaoDias}
              className="btn btn-outline btn-sm"
              title="Voltar para o mês completo"
            >
              Mês inteiro
            </button>
          )}
        </div>
      </div>

      {/* Chips de dias ou períodos múltiplos selecionados */}
      {chipsAtivos.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Períodos ativos">
          {chipsAtivos.slice(0, 8).map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-line/50 bg-brand-soft/60 px-2 py-0.5 text-xs font-medium text-fg"
            >
              {chip.texto}
              {chip.onRemover && (
                <button
                  type="button"
                  onClick={chip.onRemover}
                  aria-label={`Remover ${chip.texto}`}
                  className="rounded p-0.5 text-fg-muted hover:bg-white/10 hover:text-fg"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
          {chipsAtivos.length > 8 && (
            <span className="text-xs text-fg-muted">+{chipsAtivos.length - 8} selecionados</span>
          )}
        </div>
      )}

      {/* Popover do Calendário em 3 níveis (Dias -> Meses -> Anos via Scroll) */}
      {aberto && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Calendário de seleção de dias, meses e anos"
          onWheel={handleWheelAlternarVisao}
          className="absolute left-0 top-full z-40 mt-2 w-full min-w-[320px] max-w-[390px] overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/75 sm:w-[370px]"
        >
          {/* Cabeçalho minimalista estilo calendário flutuante */}
          <div className="border-b border-line/80 bg-surface-2/85 px-4 pb-3 pt-3.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!podeVoltar}
                onClick={navegarAnterior}
                aria-label={visao === "DIAS" ? "Mês anterior" : "Ano anterior"}
                className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-canvas/80 text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setVisao((v) => (v === "DIAS" ? "MESES" : v === "MESES" ? "ANOS" : "DIAS"))
                }
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-base font-bold tracking-tight text-fg transition-colors hover:bg-white/5"
                title="Clique ou role o scroll para alternar Dias → Meses → Anos"
              >
                {visao === "DIAS" && (
                  <>
                    <span>
                      {MESES_PT_BR[mesNavegacao - 1]} {anoNavegacao}
                    </span>
                    <ChevronDown size={15} className="text-fg-muted" />
                  </>
                )}
                {visao === "MESES" && (
                  <>
                    <span>{anoNavegacao}</span>
                    <ChevronDown size={15} className="text-fg-muted" />
                  </>
                )}
                {visao === "ANOS" && (
                  <span>
                    {minAno} – {maxAno}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={!podeAvancar}
                onClick={navegarProximo}
                aria-label={visao === "DIAS" ? "Próximo mês" : "Próximo ano"}
                className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-canvas/80 text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Indicador clicável dos 3 níveis (Dias · Meses · Anos) */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Nível do calendário"
                className="inline-flex rounded-lg border border-line bg-canvas p-0.5"
              >
                {(
                  [
                    { id: "DIAS", label: "Dias" },
                    { id: "MESES", label: "Meses" },
                    { id: "ANOS", label: "Anos" },
                  ] as const
                ).map((nivel) => (
                  <button
                    key={nivel.id}
                    type="button"
                    aria-pressed={visao === nivel.id}
                    onClick={() => setVisao(nivel.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                      visao === nivel.id
                        ? "bg-brand text-brand-fg shadow-xs"
                        : "text-fg-muted hover:text-fg"
                    )}
                  >
                    {nivel.label}
                  </button>
                ))}
              </div>

              <span className="flex items-center gap-1 text-xs text-fg-subtle">
                <Mouse size={11} className="text-brand-text" />
                Scroll: Dias → Mês → Ano
              </span>
            </div>
          </div>

          {/* Corpo conforme nível atual */}
          <div className="p-4">
            {visao === "DIAS" && (
              <div className="select-none">
                {/* Cabeçalho dias da semana: D S T Q Q S S */}
                <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase text-fg-subtle">
                  {LETRAS_SEMANA.map((letra, idx) => (
                    <span key={`${letra}-${idx}`} className="py-1">
                      {letra}
                    </span>
                  ))}
                </div>

                {/* Grade dos dias do mês */}
                <div className="grid grid-cols-7 gap-1.5">
                  {gradeDias.map((celula, idx) => {
                    if (!celula) {
                      return <div key={`vazio-${idx}`} className="h-10" aria-hidden />;
                    }

                    const emPreview = previewArrasteSet.has(celula.iso);
                    const diaMarcado = diasSelecionadosSet.has(celula.iso);
                    const mesTodoAtivo =
                      diasSelecionados.length === 0 && mesNavegacaoEstaNoPeriodo;

                    return (
                      <button
                        key={celula.iso}
                        type="button"
                        aria-label={`Dia ${celula.dia} de ${MESES_PT_BR[mesNavegacao - 1]} de ${anoNavegacao}`}
                        aria-pressed={diaMarcado || mesTodoAtivo}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          iniciarArrasteDia(celula.iso);
                        }}
                        onMouseEnter={() => atualizarArrasteDia(celula.iso)}
                        onMouseUp={() => finalizarArraste()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onAlternarDia(celula.iso);
                          }
                        }}
                        className={cn(
                          "grid h-10 place-items-center rounded-xl text-sm font-semibold transition-all cursor-pointer",
                          emPreview
                            ? "border border-brand-hover bg-brand text-brand-fg ring-2 ring-brand-hover/50 shadow-sm"
                            : diaMarcado
                            ? "border border-brand-line bg-brand text-brand-fg shadow-sm shadow-brand/30"
                            : mesTodoAtivo
                            ? "border border-brand-line/35 bg-brand-soft/85 text-fg hover:border-brand-line hover:bg-brand/60"
                            : "border border-transparent bg-canvas/55 text-fg-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg"
                        )}
                      >
                        {celula.dia}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-center text-xs leading-relaxed text-fg-muted">
                  Clique em um dia (ou vários com espaçamento). Para um período, segure e arraste
                  até o último dia.
                </p>
              </div>
            )}

            {visao === "MESES" && (
              <div>
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="text-fg-muted">
                    Meses de <strong className="text-fg">{anoNavegacao}</strong> (
                    {contagemPorAno.get(anoNavegacao) ?? 0}/12 selecionados)
                  </span>
                  <button
                    type="button"
                    onClick={() => onAlternarAno(anoNavegacao)}
                    className="font-semibold text-brand-text hover:underline"
                  >
                    {(contagemPorAno.get(anoNavegacao) ?? 0) === 12
                      ? `Desmarcar ${anoNavegacao}`
                      : `Marcar todo ${anoNavegacao}`}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MESES_PT_BR.map((nomeMes, idx) => {
                    const numeroMes = idx + 1;
                    const chave = chaveCompetencia({ ano: anoNavegacao, mes: numeroMes });
                    const selecionado =
                      diasSelecionados.length === 0 && chavesSelecionadas.has(chave);
                    const status = statusPorChave.get(chave);

                    return (
                      <div
                        key={chave}
                        className={cn(
                          "flex flex-col rounded-xl border p-2 transition-all",
                          selecionado
                            ? "border-brand-line bg-brand text-brand-fg shadow-sm"
                            : "border-line bg-canvas/75 text-fg hover:border-line-strong"
                        )}
                      >
                        <button
                          type="button"
                          aria-pressed={selecionado}
                          aria-label={`${nomeMes} de ${anoNavegacao}`}
                          onClick={() => {
                            setMesNavegacao(numeroMes);
                            onAlternarMes(anoNavegacao, numeroMes);
                          }}
                          className="flex w-full flex-col items-start text-left"
                        >
                          <div className="flex w-full items-center justify-between gap-1">
                            <span className="text-xs font-bold uppercase tracking-wide">
                              {MESES_ABREV_PT_BR[idx]}
                            </span>
                            {selecionado ? (
                              <Check size={13} className="shrink-0" />
                            ) : status ? (
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  status === "lucro" && "bg-ok",
                                  status === "prejuizo" && "bg-neg",
                                  status === "neutro" && "bg-fg-subtle/50"
                                )}
                              />
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "mt-0.5 truncate text-xs",
                              selecionado ? "text-brand-fg/85" : "text-fg-subtle"
                            )}
                          >
                            {nomeMes}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMesNavegacao(numeroMes);
                            setVisao("DIAS");
                          }}
                          className={cn(
                            "mt-1.5 rounded-md py-0.5 text-xs font-semibold transition-colors",
                            selecionado
                              ? "bg-black/20 text-brand-fg hover:bg-black/30"
                              : "bg-surface-2 text-fg-muted hover:text-fg"
                          )}
                        >
                          Ver dias
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-center text-xs text-fg-muted">
                  Clique em vários meses para comparar. Role para baixo para Anos ou para cima para
                  Dias.
                </p>
              </div>
            )}

            {visao === "ANOS" && (
              <div>
                <p className="mb-3 text-xs text-fg-muted">
                  Clique para marcar <strong className="text-fg">um ou mais anos</strong> completos,
                  ou abra os meses de um ano.
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {ANOS_DISPONIVEIS_DRE.map((anoItem) => {
                    const qtdMeses = contagemPorAno.get(anoItem) ?? 0;
                    const anoCompleto = diasSelecionados.length === 0 && qtdMeses === 12;
                    const parcial = qtdMeses > 0 && !anoCompleto;

                    return (
                      <div
                        key={anoItem}
                        className={cn(
                          "flex flex-col justify-between rounded-xl border p-3 transition-all",
                          anoCompleto
                            ? "border-brand-line bg-brand text-brand-fg shadow-sm"
                            : parcial
                            ? "border-brand-line/60 bg-brand-soft text-fg"
                            : "border-line bg-canvas/80 text-fg hover:border-line-strong"
                        )}
                      >
                        <button
                          type="button"
                          aria-pressed={anoCompleto}
                          aria-label={`Selecionar ano ${anoItem}`}
                          onClick={() => onAlternarAno(anoItem)}
                          className="text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-display text-2xl font-bold tracking-wide">
                              {anoItem}
                            </span>
                            {anoCompleto && <Check size={15} />}
                          </div>
                          <div
                            className={cn(
                              "mt-1 text-xs font-medium",
                              anoCompleto ? "text-brand-fg/85" : "text-fg-muted"
                            )}
                          >
                            {anoCompleto
                              ? "12/12 meses"
                              : parcial
                              ? `${qtdMeses}/12 meses`
                              : "Nenhum mês"}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAnoNavegacao(anoItem);
                            setVisao("MESES");
                          }}
                          className={cn(
                            "mt-3 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors",
                            anoCompleto
                              ? "border-white/20 bg-black/20 text-brand-fg hover:bg-black/30"
                              : "border-line bg-surface-2 text-fg-muted hover:text-fg"
                          )}
                        >
                          Ver meses
                        </button>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-center text-xs text-fg-muted">
                  Role o scroll para cima para voltar aos Meses e Dias.
                </p>
              </div>
            )}
          </div>

          {/* Rodapé compacto */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/80 bg-surface-2/70 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onSelecionarTodosAnos}
                className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                Todos os anos
              </button>
              <button
                type="button"
                onClick={onIrParaMesAtual}
                className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                Limpar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="btn btn-primary btn-sm h-7 px-3 text-xs"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
