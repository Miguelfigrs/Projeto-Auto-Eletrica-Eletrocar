/**
 * View: OrdensServicoView
 * Gestão de Ordens de Serviço, ciclo de vida por Máquina de Estados,
 * checklist elétrico e simulação do Telegram Voice Bot com Whisper & IA.
 */
import React, { useState } from "react";
import { Wrench, Mic, Plus, Car, Check, Send, ArrowRight, Ban } from "lucide-react";
import { useOrdensServico } from "../../adapters/view-models/useOrdensServico";
import { StatusOS, OrigemOS, PrioridadeOS } from "../../domain/value-objects/Enums";
import { OrdemServicoStateMachine } from "../../domain/entities/OrdemServico";
import { Alerts, EmptyState, Modal, Page, PageHeader } from "../components/ui";
import { cn } from "../../lib/utils";

const STATUS_INFO: Record<StatusOS, { label: string; cor: string }> = {
  [StatusOS.TRIAGEM]: { label: "Triagem", cor: "#a78bfa" },
  [StatusOS.ORCAMENTO_PENDENTE]: { label: "Orçamento pendente", cor: "#fbbf24" },
  [StatusOS.APROVADO]: { label: "Aprovado", cor: "#38bdf8" },
  [StatusOS.EM_EXECUCAO]: { label: "Em execução", cor: "#60a5fa" },
  [StatusOS.AGUARDANDO_PECA]: { label: "Aguardando peça", cor: "#fb923c" },
  [StatusOS.TESTES_ELETRICOS]: { label: "Testes elétricos", cor: "#facc15" },
  [StatusOS.FINALIZADO]: { label: "Finalizado", cor: "#4ade80" },
  [StatusOS.ENTREGUE]: { label: "Entregue", cor: "#4ade80" },
  [StatusOS.CANCELADO]: { label: "Cancelado", cor: "#a1a1aa" },
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
  StatusOS.TESTES_ELETRICOS,
  StatusOS.FINALIZADO,
];

const StatusBadge: React.FC<{ status: StatusOS }> = ({ status }) => {
  const info = STATUS_INFO[status];
  return (
    <span
      className="chip"
      style={{ color: info.cor, borderColor: `${info.cor}40`, background: `${info.cor}14` }}
    >
      <span className="dot" />
      {info.label}
    </span>
  );
};

export const OrdensServicoView: React.FC = () => {
  const {
    ordens,
    filtroStatus,
    setFiltroStatus,
    avancarStatus,
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
  } = useOrdensServico();

  // Estados do formulário de nova OS manual
  const [novoCliente, setNovoCliente] = useState("");
  const [novoCarro, setNovoCarro] = useState("");
  const [novaPlaca, setNovaPlaca] = useState("");
  const [novoSintomas, setNovoSintomas] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<PrioridadeOS>(PrioridadeOS.MEDIA);

  // Cenários do Telegram Voice Bot
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
    criarOS({
      clienteNome: novoCliente,
      carroModelo: novoCarro,
      carroPlaca: novaPlaca || "ABC-1234",
      sintomas: novoSintomas || "Revisão geral da parte elétrica",
      prioridade: novaPrioridade,
      origem: OrigemOS.BALCAO,
    });
    setNovoCliente("");
    setNovoCarro("");
    setNovaPlaca("");
    setNovoSintomas("");
  };

  return (
    <Page>
      <Alerts sucesso={mensagemSucesso} erro={mensagemErro} onFecharErro={() => setMensagemErro(null)} />

      <PageHeader
        title="Ordens de serviço"
        description="Acompanhe a fila da oficina e avance cada OS pelas etapas do atendimento."
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

      {/* Filtros por status */}
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
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {ordens.map((os) => {
            const destinosPermitidos = OrdemServicoStateMachine.TRANSICOES_PERMITIDAS[os.status] || [];
            const cor = STATUS_INFO[os.status].cor;
            return (
              <div key={os.id} className="card relative flex flex-col overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: cor }} />

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-semibold text-fg">{os.numeroOS}</span>
                        {os.origem === OrigemOS.TELEGRAM_VOICE && (
                          <span className="chip h-6 px-2" title="Aberta via comando de voz no Telegram">
                            <Mic size={11} /> Voz
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-sm text-fg-muted">{os.clienteNome}</div>
                    </div>
                    <StatusBadge status={os.status} />
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
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
                    </div>
                    <div className="money text-xl font-semibold text-fg">{os.total.formatar()}</div>
                  </div>
                </div>

                <div className="border-t border-line bg-surface-2/50 px-5 py-3">
                  {destinosPermitidos.length === 0 ? (
                    <span className="text-xs text-fg-subtle">OS concluída — sem próximas etapas.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {destinosPermitidos.map((dest) =>
                        dest === StatusOS.CANCELADO ? (
                          <button
                            key={dest}
                            onClick={() => avancarStatus(os.id, dest)}
                            className="btn btn-ghost btn-sm ml-auto hover:text-neg-text!"
                          >
                            <Ban size={13} /> Cancelar
                          </button>
                        ) : (
                          <button
                            key={dest}
                            onClick={() => avancarStatus(os.id, dest)}
                            className="btn btn-secondary btn-sm"
                          >
                            {STATUS_INFO[dest].label} <ArrowRight size={13} />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Telegram Voice Bot */}
      <Modal
        aberto={modalTelegramAberto}
        onFechar={() => setModalTelegramAberto(false)}
        titulo="Abertura de OS por voz"
        descricao="O eletricista grava um áudio no Telegram; o sistema transcreve e abre a OS sozinho."
        icon={Mic}
        largura={560}
      >
        <div className="flex flex-col gap-3">
          {cenariosVoz.map((cenario, i) => (
            <div key={i} className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-fg">{cenario.titulo}</span>
                <span className="text-xs text-fg-subtle">{cenario.eletricista}</span>
              </div>
              <p className="mt-2 text-sm italic text-fg-muted">“{cenario.audioTexto}”</p>
              <button
                onClick={() => simularEnvioAudioTelegram(cenario.audioTexto, cenario.cliente, cenario.carro)}
                disabled={simulandoAudio}
                className="btn btn-secondary btn-sm mt-3 w-full"
              >
                <Send size={13} /> {simulandoAudio ? "Transcrevendo áudio..." : "Enviar áudio"}
              </button>
            </div>
          ))}
        </div>
      </Modal>

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
            <label className="label" htmlFor="os-cliente">Cliente</label>
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

          <div className="grid grid-cols-[1fr_130px] gap-3">
            <div>
              <label className="label" htmlFor="os-carro">Veículo / modelo</label>
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
              <label className="label" htmlFor="os-placa">Placa</label>
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
                    "h-10 rounded-xl border text-sm font-medium transition-colors",
                    novaPrioridade === v
                      ? "border-brand bg-brand-soft text-fg"
                      : "border-line bg-surface-2 text-fg-muted hover:text-fg"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="os-sintomas">Sintomas e relato do cliente</label>
            <textarea
              id="os-sintomas"
              rows={3}
              placeholder="Ex: Carro não dá partida, luz de bateria acesa..."
              value={novoSintomas}
              onChange={(e) => setNovoSintomas(e.target.value)}
              className="field"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg mt-1 w-full">
            <Check size={18} /> Abrir OS
          </button>
        </form>
      </Modal>
    </Page>
  );
};
