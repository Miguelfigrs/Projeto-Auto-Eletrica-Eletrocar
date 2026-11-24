/**
 * Leitor de código de barras pela câmera (alternativa ao leitor USB/Bluetooth).
 * Usa o BarcodeDetector nativo do navegador quando disponível (Chrome Android/macOS/ChromeOS)
 * e cai para a biblioteca ZXing nos demais (iPhone/Safari, Chrome no Windows).
 * Exige HTTPS ou localhost e a permissão de câmera do navegador.
 */

export const FORMATOS_NATIVOS = ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "qr_code"];

export interface SessaoCamera {
  parar(): void;
  /** Lanterna (só em aparelhos que suportam). */
  alternarLanterna?(ligar: boolean): Promise<void>;
  temLanterna: boolean;
}

export function mensagemErroCamera(err: unknown): string {
  const nome = (err as { name?: string })?.name;
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return "A câmera só funciona em endereço seguro (HTTPS) ou em localhost.";
  }
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "Permissão de câmera negada. Libere a câmera nas configurações do navegador para este site.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") return "Nenhuma câmera encontrada neste aparelho.";
  if (nome === "NotReadableError") return "A câmera está em uso por outro aplicativo.";
  return "Não foi possível abrir a câmera.";
}

export class CameraBarcodeGateway {
  public async iniciar(video: HTMLVideoElement, onCodigo: (codigo: string) => void): Promise<SessaoCamera> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error("sem mediaDevices"), { name: "NotFoundError" });
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.muted = true;
    await video.play().catch(() => undefined);

    const [track] = stream.getVideoTracks();
    const capacidades = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
    let ativo = true;
    let pararDecodificador: () => void = () => undefined;

    const emitir = (texto: string | undefined | null) => {
      const codigo = (texto ?? "").trim();
      if (ativo && codigo) onCodigo(codigo);
    };

    const Nativo = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    const suportados = Nativo?.getSupportedFormats ? await Nativo.getSupportedFormats().catch(() => []) : [];
    const formatos = FORMATOS_NATIVOS.filter((f) => suportados.includes(f));

    if (Nativo && formatos.includes("ean_13")) {
      const detector = new Nativo({ formats: formatos });
      const timer = window.setInterval(async () => {
        if (!ativo || video.readyState < 2) return;
        try {
          const [achado] = await detector.detect(video);
          emitir(achado?.rawValue);
        } catch {
          // quadro inválido: tenta no próximo
        }
      }, 150);
      pararDecodificador = () => window.clearInterval(timer);
    } else {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const leitor = new BrowserMultiFormatReader();
      const controles = await leitor.decodeFromStream(stream, video, (resultado) => emitir(resultado?.getText()));
      pararDecodificador = () => controles.stop();
    }

    return {
      temLanterna: Boolean(capacidades.torch),
      alternarLanterna: capacidades.torch
        ? (ligar: boolean) => track.applyConstraints({ advanced: [{ torch: ligar } as MediaTrackConstraintSet] })
        : undefined,
      parar: () => {
        ativo = false;
        pararDecodificador();
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      },
    };
  }
}

interface BarcodeDetectorCtor {
  new (opcoes: { formats: string[] }): { detect(fonte: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
  getSupportedFormats?(): Promise<string[]>;
}
