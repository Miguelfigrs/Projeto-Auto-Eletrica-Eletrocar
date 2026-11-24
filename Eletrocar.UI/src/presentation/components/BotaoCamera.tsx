/**
 * Botão "Câmera" ao lado de um campo de código: abre a leitura pela câmera
 * como alternativa ao leitor USB/Bluetooth (que continua funcionando normalmente).
 */
import React, { useState } from "react";
import { Camera } from "lucide-react";
import { LeitorCameraModal } from "./LeitorCameraModal";
import type { CameraBarcodeGateway } from "../../adapters/gateways/CameraBarcodeGateway";
import { cn } from "../../lib/utils";

export const BotaoCamera: React.FC<{
  onCodigo: (codigo: string) => void;
  /** PDV: continua aberta para ler vários itens seguidos. */
  continuo?: boolean;
  rotulo?: string;
  className?: string;
  leitor?: Pick<CameraBarcodeGateway, "iniciar">;
}> = ({ onCodigo, continuo, rotulo, className, leitor }) => {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn("btn btn-secondary", className)}
        title="Ler o código de barras pela câmera"
        aria-label="Ler o código de barras pela câmera"
      >
        <Camera size={17} />
        {rotulo && <span>{rotulo}</span>}
      </button>
      <LeitorCameraModal
        aberto={aberto}
        onFechar={() => setAberto(false)}
        onCodigo={onCodigo}
        continuo={continuo}
        leitor={leitor}
      />
    </>
  );
};
