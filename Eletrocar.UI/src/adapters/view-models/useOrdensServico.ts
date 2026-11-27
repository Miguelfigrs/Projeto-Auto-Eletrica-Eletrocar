/**
 * ViewModel: useOrdensServico
 * Controla a fila de oficina (Kanban), ciclo de vida da OS e simulação do Telegram Voice Bot.
 */
import { useState, useEffect, useCallback } from "react";
import { OrdemServico, OrdemServicoProps } from "../../domain/entities/OrdemServico";
import {
  FormaPagamento,
  StatusOS,
  OrigemOS,
  PrioridadeOS,
  ROTULO_STATUS_OS,
} from "../../domain/value-objects/Enums";
import { container } from "../../infra/di/container";

export function useOrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<StatusOS | "TODOS">("TODOS");
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [modalNovaOSAberto, setModalNovaOSAberto] = useState(false);
  const [modalTelegramAberto, setModalTelegramAberto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [simulandoAudio, setSimulandoAudio] = useState(false);
  // OS com ação em andamento: os botões dela ficam travados até a lista voltar atualizada
  // (no servidor de produção a mudança de etapa leva alguns segundos).
  const [osEmAndamento, setOsEmAndamento] = useState<string | null>(null);
  const [criandoOS, setCriandoOS] = useState(false);

  const carregarOrdens = useCallback(async () => {
    try {
      const lista = await container.osRepository.listar(
        filtroStatus === "TODOS" ? undefined : filtroStatus
      );
      setOrdens(lista);
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Não foi possível carregar as ordens de serviço.");
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregarOrdens();
  }, [carregarOrdens]);

  const avancarStatus = async (osId: string, novoStatus: StatusOS) => {
    if (osEmAndamento) return;
    setOsEmAndamento(osId);
    try {
      setMensagemErro(null);
      const os = await container.avancarStatusOSUC.executar(osId, novoStatus);
      const numero = os?.numeroOS ?? "A OS";
      setMensagemSucesso(
        novoStatus === StatusOS.CANCELADO
          ? `${numero} foi cancelada.`
          : `${numero} passou para a etapa "${ROTULO_STATUS_OS[novoStatus] ?? novoStatus}".`
      );
      setTimeout(() => setMensagemSucesso(null), 4000);
      await carregarOrdens();
      if (osSelecionada?.id === osId) {
        const atualizada = await container.osRepository.buscarPorId(osId);
        setOsSelecionada(atualizada);
      }
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao transicionar status da OS.");
    } finally {
      setOsEmAndamento(null);
    }
  };

  const entregarOS = async (osId: string, formaPagamento: FormaPagamento) => {
    try {
      setMensagemErro(null);
      const os = await container.avancarStatusOSUC.entregar(osId, formaPagamento);
      setMensagemSucesso(`OS #${os.numeroOS} faturada e veículo entregue.`);
      setTimeout(() => setMensagemSucesso(null), 3000);
      carregarOrdens();
      if (osSelecionada?.id === osId) setOsSelecionada(os);
      return true;
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao faturar a OS.");
      return false;
    }
  };

  /** true = OS aberta; false = recusada (o formulário continua preenchido). */
  const criarOS = async (props: Partial<OrdemServicoProps>): Promise<boolean> => {
    if (criandoOS) return false;
    setCriandoOS(true);
    try {
      setMensagemErro(null);
      const nova = await container.criarOSUC.executar(props);
      setModalNovaOSAberto(false);
      setMensagemSucesso(`Ordem de Serviço #${nova.numeroOS} aberta com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
      await carregarOrdens();
      return true;
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao abrir OS.");
      return false;
    } finally {
      setCriandoOS(false);
    }
  };

  // Simulação do fluxo de voz: Áudio no Telegram -> Whisper -> LLM JSON -> OS em Triagem
  const simularEnvioAudioTelegram = async (transcricaoSimulada: string, cliente: string, carro: string) => {
    try {
      setSimulandoAudio(true);
      setMensagemErro(null);
      container.soundGateway.tocarNotificacaoVoz();

      // Simula o tempo de processamento Whisper ASR + extração LLM (1.2s)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const novaOS = await container.criarOSUC.executar({
        clienteNome: cliente,
        carroModelo: carro,
        origem: OrigemOS.TELEGRAM_VOICE,
        prioridade: PrioridadeOS.ALTA,
        sintomas: transcricaoSimulada,
        hipoteseDiagnostica: "Diagnóstico elétrico preliminar extraído via inteligência artificial",
        checklistEletrico: {
          bateria: transcricaoSimulada.toLowerCase().includes("bateria"),
          alternador: transcricaoSimulada.toLowerCase().includes("alternador"),
          motorPartida: transcricaoSimulada.toLowerCase().includes("partida"),
          iluminacao: transcricaoSimulada.toLowerCase().includes("luz") || transcricaoSimulada.toLowerCase().includes("farol"),
          injecaoEletronica: false,
        },
      });

      setModalTelegramAberto(false);
      setMensagemSucesso(
        `🎙️ Áudio Telegram processado com sucesso! OS #${novaOS.numeroOS} gerada na baia e enviada para Triagem.`
      );
      setTimeout(() => setMensagemSucesso(null), 4000);
      carregarOrdens();
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro no processamento do áudio.");
    } finally {
      setSimulandoAudio(false);
    }
  };

  return {
    ordens,
    filtroStatus,
    setFiltroStatus,
    osSelecionada,
    setOsSelecionada,
    avancarStatus,
    entregarOS,
    carregarOrdens,
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
  };
}
