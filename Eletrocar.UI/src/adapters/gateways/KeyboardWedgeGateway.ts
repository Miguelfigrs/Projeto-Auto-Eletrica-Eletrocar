/**
 * Adaptador de Leitor de Código de Barras via Cunha de Teclado (HID Keyboard Wedge).
 * Mede a cadência temporal entre caracteres (<35ms) para diferenciar o leitor da digitação humana,
 * permitindo ler códigos sem foco no campo de texto e evitando submits indevidos.
 */
import {
  IBarcodeReaderGateway,
  DeviceStatus,
} from "../../application/ports/gateways/IBarcodeReaderGateway";

export class KeyboardWedgeGateway implements IBarcodeReaderGateway {
  private buffer = "";
  private ultimoTempo = 0;
  private readonly LIMITE_CADENCIA_MS = 40;
  private status: DeviceStatus = "STANDBY";
  private modelo = "Leitor USB/Bluetooth (Keyboard Wedge)";
  private ouvintesStatus: Array<(status: DeviceStatus, modelo: string) => void> = [];

  public iniciarEscuta(onBarcodeScanned: (barcode: string) => void): () => void {
    const handler = (e: KeyboardEvent) => {
      // Ignora teclas de controle puro (Shift, Ctrl, etc.)
      if (e.key.length > 1 && e.key !== "Enter") {
        return;
      }

      const agora = performance.now();
      const delta = agora - this.ultimoTempo;
      this.ultimoTempo = agora;

      // Se passou muito tempo, reseta buffer (humano digitando)
      if (delta > this.LIMITE_CADENCIA_MS && this.buffer.length > 0) {
        this.buffer = "";
      }

      if (e.key === "Enter") {
        if (this.buffer.length >= 4) {
          e.preventDefault();
          e.stopPropagation();
          const codigo = this.buffer;
          this.buffer = "";
          this.definirStatus("CONECTADO", this.modelo);
          onBarcodeScanned(codigo);
        }
      } else if (e.key.length === 1) {
        this.buffer += e.key;
      }
    };

    window.addEventListener("keydown", handler, true);

    // Tenta detectar conexão via WebHID se disponível
    if ("hid" in navigator) {
      this.iniciarMonitoramentoWebHid();
    }

    return () => {
      window.removeEventListener("keydown", handler, true);
    };
  }

  public obterStatus(): DeviceStatus {
    return this.status;
  }

  public obterNomeModelo(): string {
    return this.modelo;
  }

  public onStatusChange(callback: (status: DeviceStatus, modelo: string) => void): () => void {
    this.ouvintesStatus.push(callback);
    callback(this.status, this.modelo);
    return () => {
      this.ouvintesStatus = this.ouvintesStatus.filter((cb) => cb !== callback);
    };
  }

  public simularLeitura(codigo: string, onBarcodeScanned: (barcode: string) => void): void {
    this.definirStatus("CONECTADO", "Leitor Simulado (USB HID)");
    onBarcodeScanned(codigo);
  }

  private definirStatus(novoStatus: DeviceStatus, modelo: string): void {
    this.status = novoStatus;
    this.modelo = modelo;
    this.ouvintesStatus.forEach((cb) => cb(novoStatus, modelo));
  }

  private async iniciarMonitoramentoWebHid(): Promise<void> {
    try {
      const navHid = (navigator as unknown as { hid?: { getDevices: () => Promise<Array<{ productName?: string }>> } }).hid;
      if (navHid) {
        const devices = await navHid.getDevices();
        if (devices.length > 0 && devices[0].productName) {
          this.definirStatus("CONECTADO", devices[0].productName);
        }
      }
    } catch {
      // Ignora erro de permissão
    }
  }
}
