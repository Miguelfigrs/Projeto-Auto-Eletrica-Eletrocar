/**
 * Adaptador de Efeitos Sonoros via Web Audio API.
 * Gera tons de bip com precisão militar diretamente no oscilador do navegador, sem latência.
 */
import { ISoundEffectGateway } from "../../application/ports/gateways/ISoundEffectGateway";

export class WebAudioSoundGateway implements ISoundEffectGateway {
  private ctx: AudioContext | null = null;

  private obterContexto(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public tocarBipSucesso(): void {
    try {
      const ctx = this.obterContexto();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // Tom alto característico de leitor (A6)
      osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Ignora silenciosamente caso o navegador bloqueie áudio antes de interação
    }
  }

  public tocarAlertaErro(): void {
    try {
      const ctx = this.obterContexto();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime); // Tom grave de alerta (A3)

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignora silenciosamente
    }
  }

  public tocarNotificacaoVoz(): void {
    try {
      const ctx = this.obterContexto();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignora silenciosamente
    }
  }
}
