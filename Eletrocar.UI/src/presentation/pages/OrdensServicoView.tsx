/**
 * View: OrdensServicoView
 * Gestão de Ordens de Serviço, pipeline visual da Máquina de Estados,
 * checklist elétrico interativo e simulação do Telegram Voice Bot (Whisper + Claude IA).
 */
import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Ban,
  Car,
  Check,
  Eye,
  Mic,
  Plus,
  Send,
  Sparkles,
  Wrench,
  HandCoins,
} from "lucide-react";
import { useOrdensServico } from "../../adapters/view-models/useOrdensServico";
import { FormaPagamento, StatusOS, OrigemOS, PrioridadeOS } from "../../domain/value-objects/Enums";
import { OrdemServico, OrdemServicoStateMachine } from "../../domain/entities/OrdemServico";
import { Dinheiro } from "../../domain/value-objects/Dinheiro";
import { container } from "../../infra/di/container";
import { Alerts, ConfirmDialog, DidacticBanner, EmptyState, Modal, Page, PageHeader } from "../components/ui";
import { cn } from "../../lib/utils";
import { lerValorBR } from "../../lib/numeroBR";
import { ROTULO_FORMA_PAGAMENTO } from "../components/DetalhamentoDREPanel";

interface OrdensServicoViewProps {
  modoDidatico?: boolean;
}

const STATUS_INFO: Record<StatusOS, { label: string; cor: string; resumo: string }> = {
  [StatusOS.TRIAGEM]: { label: "Triagem", cor: "#a78bfa", resumo: "Veículo recebido para diagnóstico inicial." },
  [StatusOS.ORCAMENTO_PENDENTE]: { label: "Orçamento", cor: "#fbbf24", resumo: "Aguardando aprovação de preço pelo cliente." },
  [StatusOS.APROVADO]: { label: "Aprovado", cor: "#38bdf8", resumo: "Cliente aprovou; liberado para o eletricista." },
  [StatusOS.EM_EXECUCAO]: { label: "Em execução", cor: "#60a5fa", resumo: "Reparo elétrico em andamento na bancada/baia." },
  [StatusOS.AGUARDANDO_PECA]: { label: "Aguard. peça", cor: "#fb923c", resumo: "Aguardando chegada ou reserva de componente." },
  [StatusOS.TESTES_ELETRICOS]: { label: "Testes elétricos", cor: "#facc15", resumo: "Validação de carga, tensão e partida antes da entrega." },
  [StatusOS.FINALIZADO]: { label: "Finalizado", cor: "#34d399", resumo: "Pronto para faturamento no caixa e retirada." },
  [StatusOS.ENTREGUE]: { label: "Entregue", cor: "#34d399", resumo: "Veículo pago e entregue ao cliente." },
  [StatusOS.CANCELADO]: { label: "Cancelado", cor: "#9aa5b5", resumo: "Atendimento encerrado sem execução." },
};

const CHECKLIST_LABEL: Record<string, string> = {
  bateria: "Bateria",
  alternador: "Alternador",
  motorPartida: "Motor de partida",
  iluminacao: "Iluminação",
  injecao: "Injeção",
  injecaoEletronica: "Injeção eletrônica",
};

const FILTROS: (StatusOS | "TODOS")[] = [
  "TODOS",
  StatusOS.TRIAGEM,
  StatusOS.ORCAMENTO_PENDENTE,
  StatusOS.APROVADO,
  StatusOS.EM_EXECUCAO,
  StatusOS.AGUARDANDO_PECA,
  StatusOS.TESTES_ELETRICOS,
  StatusOS.FINALIZADO,
  StatusOS.ENTREGUE,
];

const PIPELINE_ORDEM: StatusOS[] = [
  StatusOS.TRIAGEM,
  StatusOS.ORCAMENTO_PENDENTE,
  StatusOS.APROVADO,
  StatusOS.EM_EXECUCAO,
  StatusOS.TESTES_ELETRICOS,
  StatusOS.FINALIZADO,
  StatusOS.ENTREGUE,
];

const StatusBadge: React.FC<{ status: StatusOS }> = ({ status }) => {
  const info = STATUS_INFO[status];
  return (
    <span
      className="chip"
      style={{ color: info.cor, borderColor: `${info.cor}45`, background: `${info.cor}16` }}
    >
      <span className="dot" />
      {info.label}
    </span>
  );
};

export const OrdensServicoView: React.FC<OrdensServicoViewProps> = ({ modoDidatico = true }) => {
  const {
    ordens,
    filtroStatus,
    setFiltroStatus,
    osSelecionada,
    setOsSelecionada,
    avancarStatus,
    entregarOS,
    criarOS,
    simularEnvioAudioTelegram,
    modalNovaOSAberto,
    setModalNovaOSAberto,
    modalTelegramAberto,
    setModalTelegramAberto,
    mensagemSucesso,
    mensagemErro,
    setMensagemErro,
    simulandoAudio,
    osEmAndamento,
    criandoOS,
  } = useOrdensServico();
  const [salvandoChecklist, setSalvandoChecklist] = useState(false);
  const [incluindoServico, setIncluindoServico] = useState(false);

  const [todasOrdens, setTodasOrdens] = useState<OrdemServico[]>([]);
  const [novoCliente, setNovoCliente] = useState("");
  const [novoCarro, setNovoCarro] = useState("");
  const [novaPlaca, setNovaPlaca] = useState("");
  const [novaMarca, setNovaMarca] = useState("");
  const [osParaEntrega, setOsParaEntrega] = useState<OrdemServico | null>(null);
  const [osParaCancelar, setOsParaCancelar] = useState<OrdemServico | null>(null);
  const [formaEntrega, setFormaEntrega] = useState<FormaPagamento>(FormaPagamento.PIX);
  const [entregando, setEntregando] = useState(false);
  const [novoSintomas, setNovoSintomas] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<PrioridadeOS>(PrioridadeOS.MEDIA);

  const [novoServicoDesc, setNovoServicoDesc] = useState("");
  const [novoServicoValor, setNovoServicoValor] = useState("");

  useEffect(() => {
    container.osRepository
      .listar()
      .then(setTodasOrdens)
      .catch(() => setTodasOrdens([]));
  }, [ordens]);

  const cenariosVoz = [
    {
      titulo: "Alternador Gol do Carlos",
      eletricista: "Márcio · Baia 01",
      audioTexto: "Gol do seu Carlos, alternador com defeito, bateria não carrega. Trocar regulador de voltagem.",
      cliente: "Carlos Alberto",
      carro: "Gol 1.6 MSI",
    },
    {
      titulo: "Motor de Partida Strada",
      eletricista: "Roberto · Baia 02",
      audioTexto: "Strada do seu Julio, motor de partida tá estalando pesado e sem arranque. Verificar automático.",
      cliente: "Julio Mendes",
      carro: "Fiat Strada 1.4 Fire",
    },
    {
      titulo: "Faróis LED Hilux Frota",
      eletricista: "Márcio · Baia 01",
      audioTexto: "Hilux da transportadora, instalar chicote elétrico dos faróis de milha de LED e relé duplo.",
      cliente: "Transportadora Rápido Vale",
      carro: "Hilux 2.8 D-4D",
    },
  ];

  const handleCriarOSManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliente || !novoCarro) return;
    void criarOS({
      clienteNome: novoCliente,
      carroModelo: novoCarro,
      carroMarca: novaMarca || undefined,
      carroPlaca: novaPlaca || undefined,
      sintomas: novoSintomas || "Revisão geral da parte elétrica",
      prioridade: novaPrioridade,
      origem: OrigemOS.BALCAO,
    }).then((ok) => {
      if (!ok) return;
      setNovoCliente("");
      setNovoCarro("");
      setNovaMarca("");
      setNovaPlaca("");
      setNovoSintomas("");
    });
  };

  const alternarChecklist = async (os: OrdemServico, chave: string) => {
    if (salvandoChecklist) return;
    setSalvandoChecklist(true);
    try {
      setMensagemErro(null);
      const atualizada = await container.osRepository.atualizarChecklist(os.id, {
        ...os.checklistEletrico,
        [chave]: !os.checklistEletrico[chave],
      });
      setOsSelecionada(new OrdemServico({ ...atualizada, checklistEletrico: { ...atualizada.checklistEletrico } }));
      setTodasOrdens(await container.osRepository.listar());
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao atualizar o checklist.");
    } finally {
      setSalvandoChecklist(false);
    }
  };

  const confirmarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osParaEntrega) return;
    setEntregando(true);
    const ok = await entregarOS(osParaEntrega.id, formaEntrega);
    setEntregando(false);
    if (ok) setOsParaEntrega(null);
  };

  const adicionarMaoDeObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osSelecionada || !novoServicoDesc.trim()) return;
    const valorNum = lerValorBR(novoServicoValor);
    if (Number.isNaN(valorNum) || valorNum < 0) {
      setMensagemErro("Valor da mão de obra inválido. Use, por exemplo, 150,00 ou 1.200,00.");
      return;
    }
    if (incluindoServico) return;
    setIncluindoServico(true);
    try {
      setMensagemErro(null);
      const atualizada = await container.osRepository.adicionarServico(osSelecionada.id, {
        descricao: novoServicoDesc.trim(),
        valor: new Dinheiro(valorNum, false),
      });
      setOsSelecionada(atualizada);
      setTodasOrdens(await container.osRepository.listar());
      setNovoServicoDesc("");
      setNovoServicoValor("");
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao adicionar a mão de obra.");
    } finally {
      setIncluindoServico(false);
    }
  };

  return (
    <Page>
      <Alerts sucesso={mensagemSucesso} erro={mensagemErro} onFecharErro={() => setMensagemErro(null)} />

      <PageHeader
        eyebrow="Oficina · tecla F3"
        title="Ordens de serviço"
        description="Acompanhe a fila da oficina e avance cada veículo pelas etapas controladas de manutenção."
        actions={
          <>
            <button onClick={() => setModalTelegramAberto(true)} className="btn btn-secondary">
              <Mic size={17} /> Simular voz Telegram
            </button>
            <button onClick={() => setModalNovaOSAberto(true)} className="btn btn-primary">
              <Plus size={18} /> Nova OS
            </button>
          </>
        }
      />

      <DidacticBanner
        visivel={modoDidatico}
        titulo="Como acompanhar os carros na oficina"
        resumo="Cada carro passa por etapas, sempre na mesma ordem: Triagem, Orçamento, Aprovado, Em execução, Testes, Finalizado e Entregue. Assim nada é esquecido."
        passos={[
          "Toque numa etapa da linha abaixo para ver só os carros que estão nela.",
          "Em 'Detalhes' você marca o checklist (bateria, alternador, partida...) e lança a mão de obra.",
          "Quando o serviço termina, use 'Faturar e entregar' para receber e liberar o carro.",
        ]}
        regraNegocio="O sistema não deixa pular etapas: por exemplo, não dá para entregar um carro sem passar pelos testes."
      />

      {/* Pipeline visual da Máquina de Estados */}
      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow">Fluxo da Oficina (clique na etapa para filtrar)</span>
          <button
            type="button"
            onClick={() => setFiltroStatus("TODOS")}
            className={cn(
              "text-xs font-semibold transition-colors",
              filtroStatus === "TODOS" ? "text-brand-text" : "text-fg-muted hover:text-fg"
            )}
          >
            Mostrar todas ({todasOrdens.length})
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PIPELINE_ORDEM.map((st, idx) => {
            const info = STATUS_INFO[st];
            const qtd = todasOrdens.filter((o) => o.status === st).length;
            const ativo = filtroStatus === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFiltroStatus(ativo ? "TODOS" : st)}
                className={cn(
                  "flex flex-col rounded-xl border p-2.5 text-left transition-all",
                  ativo
                    ? "border-brand-line bg-brand-soft"
                    : "border-line bg-canvas/60 hover:border-line-strong"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-fg-subtle">
                    0{idx + 1}
                  </span>
                  <span
                    className="money rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ background: `${info.cor}22`, color: info.cor }}
                  >
                    {qtd}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-xs font-semibold text-fg">{info.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros rápidos em pílula */}
      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTROS.map((st) => (
          <button
            key={st}
            onClick={() => setFiltroStatus(st)}
            data-active={filtroStatus === st}
            className="pill"
          >
            {st === "TODOS" ? "Todas" : STATUS_INFO[st].label}
          </button>
        ))}
      </div>

      {ordens.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Wrench}
            title="Nenhuma OS nesta etapa"
            description="Troque o filtro ou abra uma nova ordem de serviço."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {ordens.map((os) => {
            const destinosPermitidos = OrdemServicoStateMachine.TRANSICOES_PERMITIDAS[os.status] || [];
            const cor = STATUS_INFO[os.status].cor;
            return (
              <div key={os.id} className="card card-interactive relative flex flex-col overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: cor }} />

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-semibold text-fg">{os.numeroOS}</span>
                        {os.origem === OrigemOS.TELEGRAM_VOICE && (
                          <span className="chip chip-brand h-6 px-2" title="Aberta via comando de voz no Telegram">
                            <Mic size={11} /> Voz IA
                          </span>
                        )}
                        {os.prioridade === PrioridadeOS.ALTA && (
                          <span className="chip chip-neg h-6 px-2">Alta</span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-sm text-fg-muted">{os.clienteNome}</div>
                    </div>
                    <StatusBadge status={os.status} />
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-canvas/80 px-3 py-2.5">
                    <Car size={17} className="shrink-0 text-fg-subtle" />
                    <span className="truncate text-sm font-medium text-fg">{os.carroModelo}</span>
                    <span className="ml-auto shrink-0 rounded-md border border-line-strong bg-surface-2 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-fg">
                      {os.carroPlaca}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-fg-muted">{os.sintomas}</p>

                  <div className="mb-5 mt-4">
                    <div className="eyebrow mb-2">Checklist elétrico</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(os.checklistEletrico).map(([chave, checado]) => (
                        <span key={chave} className={cn("chip h-6 px-2", checado && "chip-ok")}>
                          {checado && <Check size={11} />}
                          {CHECKLIST_LABEL[chave] ?? chave}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
                    <div className="text-xs text-fg-subtle">
                      <div>Peças {os.subtotalPecas.formatar()}</div>
                      <div>Serviços {os.subtotalServicos.formatar()}</div>
                      {os.desconto.valor > 0 && (
                        <div className="text-neg-text">Desconto − {os.desconto.formatar()}</div>
                      )}
                    </div>
                    <div className="money text-xl font-semibold text-fg">{os.total.formatar()}</div>
                  </div>
                </div>

                <div className="border-t border-line bg-surface-2/60 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOsSelecionada(os)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Eye size={13} /> Detalhes
                    </button>

                    {osEmAndamento === os.id ? (
                      <span className="chip chip-warn ml-auto min-h-10 px-4 text-sm" role="status">
                        Salvando, aguarde...
                      </span>
                    ) : destinosPermitidos.map((dest) =>
                      dest === StatusOS.CANCELADO ? (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => setOsParaCancelar(os)}
                          className="btn btn-ghost btn-sm ml-auto hover:text-neg-text!"
                        >
                          <Ban size={13} /> Cancelar
                        </button>
                      ) : dest === StatusOS.ENTREGUE ? (
                        <button
                          key={dest}
                          onClick={() => setOsParaEntrega(os)}
                          className="btn btn-primary btn-sm"
                          title="Receber o pagamento e liberar o veículo"
                        >
                          <HandCoins size={13} /> Faturar e entregar
                        </button>
                      ) : (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => avancarStatus(os.id, dest)}
                          disabled={Boolean(osEmAndamento)}
                          className="btn btn-secondary btn-sm"
                        >
                          {STATUS_INFO[dest].label} <ArrowRight size={13} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detalhes da OS & Checklist Interativo */}
      <Modal
        aberto={Boolean(osSelecionada)}
        onFechar={() => setOsSelecionada(null)}
        titulo={osSelecionada ? `${osSelecionada.numeroOS} · ${osSelecionada.carroModelo}` : ""}
        descricao={osSelecionada ? `${osSelecionada.clienteNome} · Placa ${osSelecionada.carroPlaca}` : ""}
        icon={Wrench}
        largura={640}
      >
        {osSelecionada && (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">Etapa atual</span>
                <StatusBadge status={osSelecionada.status} />
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                {STATUS_INFO[osSelecionada.status].resumo}
              </p>

              {/* Stepper visual da OS */}
              <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
                {PIPELINE_ORDEM.map((st, idx) => {
                  const atualIdx = PIPELINE_ORDEM.indexOf(osSelecionada.status);
                  const passado = atualIdx > idx;
                  const atual = st === osSelecionada.status;
                  return (
                    <div
                      key={st}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-semibold",
                        atual
                          ? "border-brand-line bg-brand-soft text-fg"
                          : passado
                          ? "border-ok/30 bg-ok-soft text-ok-text"
                          : "border-line bg-surface-2/40 text-fg-subtle"
                      )}
                    >
                      {STATUS_INFO[st].label}
                    </div>
                  );
                })}
              </div>
            </div>

            {osSelecionada.hipoteseDiagnostica && (
              <div className="rounded-xl border border-brand-line bg-brand-soft p-3.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-brand-text">
                  <Sparkles size={13} /> Hipótese diagnóstica preliminar
                </div>
                <p className="mt-1 text-fg-muted">{osSelecionada.hipoteseDiagnostica}</p>
              </div>
            )}

            <div>
              <div className="eyebrow mb-2">
                Checklist Elétrico Interativo (clique para marcar/desmarcar)
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(osSelecionada.checklistEletrico).map(([chave, checado]) => (
                  <button
                    key={chave}
                    type="button"
                    onClick={() => alternarChecklist(osSelecionada, chave)}
                    disabled={salvandoChecklist}
                    aria-pressed={Boolean(checado)}
                    className={cn(
                      "chip h-8 px-3 transition-colors",
                      checado ? "chip-ok" : "hover:border-line-strong hover:text-fg"
                    )}
                  >
                    {checado && <Check size={12} />}
                    {CHECKLIST_LABEL[chave] ?? chave}
                  </button>
                ))}
              </div>
            </div>

            {/* Adicionar Mão de Obra */}
            <form
              onSubmit={adicionarMaoDeObra}
              className="rounded-xl border border-line bg-canvas p-4"
            >
              <div className="eyebrow mb-2">Adicionar serviço / mão de obra na OS</div>
              <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                <input
                  type="text"
                  placeholder="Ex: Teste de fuga de corrente"
                  value={novoServicoDesc}
                  onChange={(e) => setNovoServicoDesc(e.target.value)}
                  className="field"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor R$"
                  value={novoServicoValor}
                  onChange={(e) => setNovoServicoValor(e.target.value)}
                  className="field money text-right"
                />
                <button type="submit" className="btn btn-secondary" disabled={incluindoServico}>
                  <Plus size={18} /> {incluindoServico ? "Incluindo..." : "Incluir"}
                </button>
              </div>
            </form>

            {(osSelecionada.itens.length > 0 || osSelecionada.servicos.length > 0) && (
              <div className="mb-4 rounded-xl border border-line bg-canvas/70">
                <div className="eyebrow border-b border-line px-4 py-2.5">O que está nesta OS</div>
                <ul className="divide-y divide-line text-sm">
                  {osSelecionada.itens.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="text-fg">
                        {item.quantidade}× {item.descricao}
                      </span>
                      <span className="money shrink-0 text-fg-muted">
                        {item.precoUnitario.multiplicar(item.quantidade).formatar()}
                      </span>
                    </li>
                  ))}
                  {osSelecionada.servicos.map((servico) => (
                    <li key={servico.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="text-fg">Serviço: {servico.descricao}</span>
                      <span className="money shrink-0 text-fg-muted">{servico.valor.formatar()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line pt-4">
              <div className="text-xs text-fg-muted">
                Peças: <strong className="money text-fg">{osSelecionada.subtotalPecas.formatar()}</strong> ·
                Serviços:{" "}
                <strong className="money text-fg">{osSelecionada.subtotalServicos.formatar()}</strong>
              </div>
              <div className="money text-2xl font-semibold text-fg">
                {osSelecionada.total.formatar()}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Telegram Voice Bot */}
      <Modal
        aberto={modalTelegramAberto}
        onFechar={() => setModalTelegramAberto(false)}
        titulo="Abertura de OS por voz (Telegram + IA)"
        descricao="Fluxo multimodal criado para o eletricista operar sem digitar com as mãos sujas de graxa."
        icon={Mic}
        largura={590}
      >
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-line bg-canvas p-3 text-center text-xs">
          <div>
            <div className="font-semibold text-brand-text">1. Áudio no Pátio</div>
            <div className="mt-0.5 text-fg-muted">Eletricista envia voz no bot</div>
          </div>
          <div>
            <div className="font-semibold text-fg">2. Whisper ASR</div>
            <div className="mt-0.5 text-fg-muted">Transcreve termos automotivos</div>
          </div>
          <div>
            <div className="font-semibold text-ok-text">3. Extração LLM</div>
            <div className="mt-0.5 text-fg-muted">Preenche checklist e abre OS</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {cenariosVoz.map((cenario, i) => (
            <div key={i} className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-fg">{cenario.titulo}</span>
                <span className="text-xs text-fg-subtle">{cenario.eletricista}</span>
              </div>
              <p className="mt-2 text-sm italic text-fg-muted">“{cenario.audioTexto}”</p>
              <button
                onClick={() =>
                  simularEnvioAudioTelegram(cenario.audioTexto, cenario.cliente, cenario.carro)
                }
                disabled={simulandoAudio}
                className="btn btn-primary btn-sm mt-3 w-full"
              >
                <Send size={13} />{" "}
                {simulandoAudio ? "Transcrevendo e extraindo dados..." : "Simular envio de áudio"}
              </button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal Faturar e entregar */}
      <Modal
        aberto={Boolean(osParaEntrega)}
        onFechar={() => setOsParaEntrega(null)}
        titulo={osParaEntrega ? `Faturar e entregar · ${osParaEntrega.numeroOS}` : ""}
        descricao={osParaEntrega ? `${osParaEntrega.clienteNome} · ${osParaEntrega.carroModelo}` : ""}
        icon={HandCoins}
        largura={460}
      >
        {osParaEntrega && (
          <form onSubmit={confirmarEntrega} className="flex flex-col gap-4">
            <div className="rounded-xl border border-brand-line bg-brand-soft/60 p-4 text-center">
              <div className="eyebrow">Total a receber</div>
              <div className="money mt-1 text-3xl font-semibold text-fg">{osParaEntrega.total.formatar()}</div>
            </div>
            <div>
              <span className="label">Forma de pagamento</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.values(FormaPagamento).map((forma) => (
                  <button
                    key={forma}
                    type="button"
                    onClick={() => setFormaEntrega(forma)}
                    aria-pressed={formaEntrega === forma}
                    className={cn(
                      "min-h-12 rounded-xl border text-base font-medium transition-colors",
                      formaEntrega === forma
                        ? "border-brand-hover bg-brand-soft text-fg"
                        : "border-line bg-surface-2 text-fg-muted hover:text-fg"
                    )}
                  >
                    {ROTULO_FORMA_PAGAMENTO[forma] ?? forma}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-fg-subtle">
                À vista entra no caixa aberto; Boleto e Faturado geram conta a receber do cliente.
              </p>
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={entregando}>
              <Check size={18} /> {entregando ? "Faturando..." : "Confirmar pagamento e entrega"}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        aberto={Boolean(osParaCancelar)}
        titulo={osParaCancelar ? `Cancelar a ${osParaCancelar.numeroOS}?` : ""}
        mensagem={
          osParaCancelar
            ? `A OS de ${osParaCancelar.clienteNome} (${osParaCancelar.carroModelo}) será cancelada. Depois de cancelada ela não pode ser reaberta.`
            : ""
        }
        textoConfirmar="Sim, cancelar a OS"
        textoVoltar="Não, manter a OS"
        perigoso
        onConfirmar={() => {
          if (osParaCancelar) void avancarStatus(osParaCancelar.id, StatusOS.CANCELADO);
          setOsParaCancelar(null);
        }}
        onVoltar={() => setOsParaCancelar(null)}
      />

      {/* Modal Nova OS */}
      <Modal
        aberto={modalNovaOSAberto}
        onFechar={() => setModalNovaOSAberto(false)}
        titulo="Nova ordem de serviço"
        descricao="Registre o veículo e o relato do cliente."
        icon={Wrench}
        largura={520}
      >
        <form onSubmit={handleCriarOSManual} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="os-cliente">
              Cliente
            </label>
            <input
              id="os-cliente"
              type="text"
              required
              placeholder="Ex: Carlos Alberto"
              value={novoCliente}
              onChange={(e) => setNovoCliente(e.target.value)}
              className="field"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[110px_1fr_120px]">
            <div>
              <label className="label" htmlFor="os-marca">
                Marca
              </label>
              <input
                id="os-marca"
                type="text"
                placeholder="Ex: VW"
                value={novaMarca}
                onChange={(e) => setNovaMarca(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="os-carro">
                Veículo / modelo
              </label>
              <input
                id="os-carro"
                type="text"
                required
                placeholder="Ex: Gol 1.6 MSI"
                value={novoCarro}
                onChange={(e) => setNovoCarro(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="os-placa">
                Placa
              </label>
              <input
                id="os-placa"
                type="text"
                placeholder="FXT-4E12"
                value={novaPlaca}
                onChange={(e) => setNovaPlaca(e.target.value.toUpperCase())}
                className="field font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <span className="label">Prioridade</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: PrioridadeOS.BAIXA, t: "Baixa" },
                { v: PrioridadeOS.MEDIA, t: "Média" },
                { v: PrioridadeOS.ALTA, t: "Alta" },
              ].map(({ v, t }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNovaPrioridade(v)}
                  className={cn(
                    "min-h-12 rounded-xl border text-base font-medium transition-colors",
                    novaPrioridade === v
                      ? "border-brand-hover bg-brand-soft text-fg"
                      : "border-line bg-surface-2 text-fg-muted hover:text-fg"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="os-sintomas">
              Sintomas e relato do cliente
            </label>
            <textarea
              id="os-sintomas"
              rows={3}
              placeholder="Ex: Carro não dá partida, luz de bateria acesa..."
              value={novoSintomas}
              onChange={(e) => setNovoSintomas(e.target.value)}
              className="field"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg mt-1 w-full" disabled={criandoOS}>
            <Check size={18} /> {criandoOS ? "Abrindo a OS..." : "Abrir OS"}
          </button>
        </form>
      </Modal>
    </Page>
  );
};
