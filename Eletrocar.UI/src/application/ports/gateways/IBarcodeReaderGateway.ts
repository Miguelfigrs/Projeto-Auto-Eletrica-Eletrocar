export type DeviceStatus = "CONECTADO" | "STANDBY" | "DESCONECTADO";

export interface IBarcodeReaderGateway {
  iniciarEscuta(onBarcodeScanned: (barcode: string) => void): () => void;
  obterStatus(): DeviceStatus;
  obterNomeModelo(): string;
  onStatusChange?(callback: (status: DeviceStatus, modelo: string) => void): () => void;
}
