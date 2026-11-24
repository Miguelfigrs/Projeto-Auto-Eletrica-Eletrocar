/**
 * Janela de leitura por câmera: vídeo com mira, lanterna e aviso de erro.
 * Modo contínuo (PDV): continua aberta e ignora o mesmo código repetido por 2 s.
 * Fica acima de outros modais e o Esc fecha só a câmera.
 */
import React, { useEffect, useRef, useState } from "react";
import { Camera, Flashlight, X } from "lucide-react";
import { CameraBarcodeGateway, mensagemErroCamera, SessaoCamera } from "../../adapters/gateways/CameraBarcodeGateway";

export const LeitorCameraModal: React.FC<{
  aberto: boolean;
  onFechar: () => void;
  onCodigo: (codigo: string) => void;
  continuo?: boolean;
  leitor?: Pick<CameraBarcodeGateway, "iniciar">;
}> = ({ aberto, onFechar, onCodigo, continuo = false, leitor }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessaoRef = useRef<SessaoCamera | null>(null);
  const ultimoRef = useRef<{ codigo: string; quando: number }>({ codigo: "", quando: 0 });
  const [erro, setErro] = useState<string | null>(null);
  const [lido, setLido] = useState<string | null>(null);
  const [lanterna, setLanterna] = useState(false);
  const [temLanterna, setTemLanterna] = useState(false);
  const callbacks = useRef({ onCodigo, onFechar, continuo });
  callbacks.current = { onCodigo, onFechar, continuo };

  useEffect(() => {
    if (!aberto || !videoRef.current) return;
    let cancelado = false;
    setErro(null);
    setLido(null);
    (leitor ?? new CameraBarcodeGateway())
      .iniciar(videoRef.current, (codigo) => {
        const agora = Date.now();
        if (codigo === ultimoRef.current.codigo && agora - ultimoRef.current.quando < 2000) return;
        ultimoRef.current = { codigo, quando: agora };
        setLido(codigo);
        callbacks.current.onCodigo(codigo);
        if (!callbacks.current.continuo) callbacks.current.onFechar();
      })
      .then((sessao) => {
        if (cancelado) return sessao.parar();
        sessaoRef.current = sessao;
        setTemLanterna(sessao.temLanterna);
      })
      .catch((err) => !cancelado && setErro(mensagemErroCamera(err)));
    return () => {
      cancelado = true;
      sessaoRef.current?.parar();
      sessaoRef.current = null;
      setLanterna(false);
    };
  }, [aberto, leitor]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      callbacks.current.onFechar();
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [aberto]);

  if (!aberto) return null;

  const alternarLanterna = async () => {
    try {
      await sessaoRef.current?.alternarLanterna?.(!lanterna);
      setLanterna((v) => !v);
    } catch {
      setTemLanterna(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 80 }} role="dialog" aria-modal="true" aria-label="Ler código pela câmera">
      <div className="modal brand-stripe" style={{ maxWidth: 520 }}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Camera size={18} className="text-brand-text" />
          <h2 className="flex-1 text-base font-semibold text-fg">Ler código pela câmera</h2>
          <button type="button" onClick={onFechar} className="btn btn-ghost btn-icon" aria-label="Fechar câmera">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4 / 3" }}>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-1/3 -translate-y-1/2 rounded-lg border-2 border-brand/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            {temLanterna && (
              <button
                type="button"
                onClick={alternarLanterna}
                className="btn btn-secondary btn-sm absolute bottom-3 right-3"
                aria-pressed={lanterna}
              >
                <Flashlight size={14} /> {lanterna ? "Desligar luz" : "Lanterna"}
              </button>
            )}
          </div>
          {erro ? (
            <p role="alert" className="mt-3 text-sm text-neg-text">{erro}</p>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">
              Aponte para o código de barras dentro da moldura.
              {lido && <> Último lido: <strong className="font-mono text-fg">{lido}</strong></>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
