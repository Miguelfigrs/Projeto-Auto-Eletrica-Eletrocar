import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,

  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import {
  CameraBarcodeGateway,
  mensagemErroCamera,
  type SessaoCamera,
} from "../../adapters/gateways/CameraBarcodeGateway";
import { LeitorCameraModal } from "../../presentation/components/LeitorCameraModal";
import { EntradaEstoqueModal } from "../../presentation/components/EstoqueModals";
import { BalcaoPDVView } from "../../presentation/pages/BalcaoPDVView";
import { Peca } from "../../domain/entities/Peca";

/** Sequência de módulos (1 = barra) de um EAN-13, conforme a norma GS1. */
function barrasEan13(codigo: string): string {
  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const R = L.map((c) => [...c].map((b) => (b === "1" ? "0" : "1")).join(""));
  const G = R.map((c) => [...c].reverse().join(""));
  const PARIDADE = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
  const d = [...codigo].map(Number);
  const esquerda = d
    .slice(1, 7)
    .map((n, i) => (PARIDADE[d[0]][i] === "L" ? L[n] : G[n]))
    .join("");
  const direita = d.slice(7).map((n) => R[n]).join("");
  return `101${esquerda}01010${direita}101`;
}

/** Leitor falso: guarda o callback para o teste "mostrar" um código à câmera. */
function leitorFalso() {
  let emitir: (codigo: string) => void = () => undefined;
  const parar = vi.fn();
  const leitor = {
    iniciar: vi.fn(async (_video: HTMLVideoElement, onCodigo: (c: string) => void): Promise<SessaoCamera> => {
      emitir = onCodigo;
      return { parar, temLanterna: false };
    }),
  };
  return { leitor, parar, mostrar: (codigo: string) => act(() => emitir(codigo)) };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Janela da câmera", () => {
  it("lê um código, avisa a tela e fecha (modo simples)", async () => {
    const { leitor, parar, mostrar } = leitorFalso();
    const onCodigo = vi.fn();
    const onFechar = vi.fn();
    const { rerender } = render(<LeitorCameraModal aberto onFechar={onFechar} onCodigo={onCodigo} leitor={leitor} />);
    await vi.waitFor(() => expect(leitor.iniciar).toHaveBeenCalled());

    await mostrar("7891049281023");
    expect(onCodigo).toHaveBeenCalledWith("7891049281023");
    expect(onFechar).toHaveBeenCalled();

    rerender(<LeitorCameraModal aberto={false} onFechar={onFechar} onCodigo={onCodigo} leitor={leitor} />);
    expect(parar).toHaveBeenCalled(); // libera a câmera ao fechar
  });

  it("modo contínuo (PDV) ignora o mesmo código repetido em 2 s", async () => {
    const { leitor, mostrar } = leitorFalso();
    const onCodigo = vi.fn();
    render(<LeitorCameraModal aberto continuo onFechar={vi.fn()} onCodigo={onCodigo} leitor={leitor} />);
    await vi.waitFor(() => expect(leitor.iniciar).toHaveBeenCalled());

    await mostrar("111");
    await mostrar("111");
    await mostrar("222");
    expect(onCodigo.mock.calls.map((c) => c[0])).toEqual(["111", "222"]);
    expect(screen.getByText("222")).toBeInTheDocument();
  });

  it("mostra a mensagem de erro da câmera", async () => {
    const leitor = { iniciar: vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "NotAllowedError" })) };
    render(<LeitorCameraModal aberto onFechar={vi.fn()} onCodigo={vi.fn()} leitor={leitor} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Permissão de câmera negada/);
  });

  it("traduz os erros do navegador", () => {
    expect(mensagemErroCamera({ name: "NotFoundError" })).toMatch(/Nenhuma câmera/);
    expect(mensagemErroCamera({ name: "NotReadableError" })).toMatch(/em uso/);
    expect(mensagemErroCamera({ name: "Outro" })).toMatch(/Não foi possível abrir/);
  });
});

describe("Leitor da câmera (gateway)", () => {
  it("usa o BarcodeDetector nativo quando o navegador oferece EAN-13", async () => {
    vi.useFakeTimers();
    const trilha = { stop: vi.fn(), getCapabilities: () => ({ torch: true }), applyConstraints: vi.fn() };
    const stream = { getVideoTracks: () => [trilha], getTracks: () => [trilha] } as unknown as MediaStream;
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    class DetectorFalso {
      static getSupportedFormats = async () => ["ean_13", "qr_code"];
      detect = vi.fn().mockResolvedValue([{ rawValue: "7898237461928" }]);
    }
    vi.stubGlobal("BarcodeDetector", DetectorFalso);

    const video = document.createElement("video");
    Object.defineProperty(video, "readyState", { value: 4 });
    video.play = vi.fn().mockResolvedValue(undefined);
    const onCodigo = vi.fn();

    const sessao = await new CameraBarcodeGateway().iniciar(video, onCodigo);
    await vi.advanceTimersByTimeAsync(200);

    expect(onCodigo).toHaveBeenCalledWith("7898237461928");
    expect(sessao.temLanterna).toBe(true);
    await sessao.alternarLanterna?.(true);
    expect(trilha.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
    sessao.parar();
    expect(trilha.stop).toHaveBeenCalled();
  });

  it("sem câmera no aparelho, falha com erro de câmera não encontrada", async () => {
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });
    await expect(new CameraBarcodeGateway().iniciar(document.createElement("video"), vi.fn())).rejects.toMatchObject({
      name: "NotFoundError",
    });
  });

  it("a biblioteca de reserva (ZXing) decodifica um EAN-13 real", () => {
    // Gera a imagem pelo padrão oficial do EAN-13 (independente do ZXing) e a decodifica
    const modulos = barrasEan13("7891049281023");
    const escala = 3;
    const margem = 15 * escala; // zona de silêncio exigida pelo padrão
    const largura = modulos.length * escala + 2 * margem;
    const altura = 60;
    const pixels = new Uint8ClampedArray(largura * altura).fill(255);
    for (let y = 0; y < altura; y += 1) {
      for (let i = 0; i < modulos.length; i += 1) {
        if (modulos[i] !== "1") continue;
        for (let k = 0; k < escala; k += 1) pixels[y * largura + margem + i * escala + k] = 0;
      }
    }
    const leitor = new MultiFormatReader();
    const dicas = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);
    const resultado = leitor.decode(
      new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, largura, altura))),
      dicas
    );
    expect(resultado.getText()).toBe("7891049281023");
  });
});

describe("Câmera nas telas", () => {
  function simularCamera() {
    const falso = leitorFalso();
    vi.spyOn(CameraBarcodeGateway.prototype, "iniciar").mockImplementation(falso.leitor.iniciar);
    return falso;
  }

  it("PDV: o código lido pela câmera entra no carrinho e a câmera continua aberta", async () => {
    const camera = simularCamera();
    render(<BalcaoPDVView operadorNome="Carlos" />);

    fireEvent.click(screen.getByRole("button", { name: "Ler o código de barras pela câmera" }));
    const janela = await screen.findByRole("dialog", { name: "Ler código pela câmera" });
    await vi.waitFor(() => expect(CameraBarcodeGateway.prototype.iniciar).toHaveBeenCalled());

    await camera.mostrar("7891049281023");
    expect((await screen.findAllByText(/Regulador/)).length).toBeGreaterThan(0);
    expect(janela).toBeInTheDocument();
  });

  it("Entrada de estoque: preenche a peça e o Esc fecha só a câmera", async () => {
    const camera = simularCamera();
    const peca = new Peca({
      id: "p1",
      codigoBarras: "7895847362910",
      sku: "REL-DNI-0102",
      descricao: "Relé Auxiliar 4 Pinos",
      precoVenda: 22,
      estoqueAtual: 10,
    });
    render(<EntradaEstoqueModal aberto onFechar={vi.fn()} pecas={[peca]} onConfirmar={vi.fn()} />);
    const entrada = screen.getByRole("dialog", { name: "" }).closest(".modal") ?? document.body;

    fireEvent.click(within(entrada as HTMLElement).getByRole("button", { name: "Ler o código de barras pela câmera" }));
    await vi.waitFor(() => expect(CameraBarcodeGateway.prototype.iniciar).toHaveBeenCalled());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Ler código pela câmera" })).not.toBeInTheDocument();
    expect(screen.getByText("Entrada de estoque")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ler o código de barras pela câmera" }));
    await vi.waitFor(() => expect(CameraBarcodeGateway.prototype.iniciar).toHaveBeenCalledTimes(2));
    await camera.mostrar("7895847362910");
    expect(screen.getByLabelText(/Peça \(código de barras/)).toHaveValue("7895847362910");
    expect(screen.getByText(/Saldo atual/)).toBeInTheDocument();
  });
});
