/**
 * ViewModel: useHardwareStatus
 * Expõe o status em tempo real do leitor USB / Bluetooth para a UI (Badge).
 */
import { useState, useEffect } from "react";
import { DeviceStatus } from "../../application/ports/gateways/IBarcodeReaderGateway";
import { container } from "../../infra/di/container";

export function useHardwareStatus() {
  const [status, setStatus] = useState<DeviceStatus>(container.barcodeGateway.obterStatus());
  const [modelo, setModelo] = useState<string>(container.barcodeGateway.obterNomeModelo());
  const [ultimoBip, setUltimoBip] = useState<Date | null>(null);

  useEffect(() => {
    const unbind = container.barcodeGateway.onStatusChange?.((novoStatus, novoModelo) => {
      setStatus(novoStatus);
      setModelo(novoModelo);
      if (novoStatus === "CONECTADO") {
        setUltimoBip(new Date());
      }
    });
    return unbind;
  }, []);

  const simularLeitura = (codigo: string, callback: (c: string) => void) => {
    container.barcodeGateway.simularLeitura(codigo, callback);
    setUltimoBip(new Date());
  };

  return {
    status,
    modelo,
    ultimoBip,
    simularLeitura,
  };
}
