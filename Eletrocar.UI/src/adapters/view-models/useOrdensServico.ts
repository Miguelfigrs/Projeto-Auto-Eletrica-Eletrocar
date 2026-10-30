/**
 * ViewModel: useOrdensServico
 * Controla a fila de oficina (Kanban), ciclo de vida da OS e simulação do Telegram Voice Bot.
 */
import { useState, useEffect, useCallback } from "react";
import { OrdemServico, OrdemServicoProps } from "../../domain/entities/OrdemServico";
import { StatusOS, OrigemOS, PrioridadeOS } from "../../domain/value-objects/Enums";
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

  const carregarOrdens = useCallback(async () => {
    const lista = await container.osRepository.listar(
      filtroStatus === "TODOS" ? undefined : filtroStatus
    );
    setOrdens(lista);
  }, [filtroStatus]);

  useEffect(() => {
    carregarOrdens();
  }, [carregarOrdens]);

  const avancarStatus = async (osId: string, novoStatus: StatusOS) => {
    try {
      setMensagemErro(null);
      await container.avancarStatusOSUC.executar(osId, novoStatus);
      setMensagemSucesso(`Status da OS atualizado para "${novoStatus}".`);
      setTimeout(() => setMensagemSucesso(null), 3000);
      carregarOrdens();
      if (osSelecionada?.id === osId) {
        const atualizada = await container.osRepository.buscarPorId(osId);
        setOsSelecionada(atualizada);
      }
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao transicionar status da OS.");
    }
  };

  const criarOS = async (props: Partial<OrdemServicoProps>) => {
    try {
      setMensagemErro(null);
      const nova = await container.criarOSUC.executar(props);
      setModalNovaOSAberto(false);
      setMensagemSucesso(`Ordem de Serviço #${nova.numeroOS} aberta com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 3000);
      carregarOrdens();
    } catch (err: unknown) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao abrir OS.");
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
  };
}
