import "@testing-library/jest-dom/vitest";

// Polyfill AudioContext para testes de áudio WebAudioSoundGateway no jsdom
class FakeAudioContext {
  state = "running";
  currentTime = 0;
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator = vi.fn().mockReturnValue({
    type: "sine",
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  createGain = vi.fn().mockReturnValue({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  });
  destination = {};
}

// @ts-expect-error Mock do AudioContext para ambiente JSDOM
window.AudioContext = FakeAudioContext;
// @ts-expect-error Mock do webkitAudioContext
window.webkitAudioContext = FakeAudioContext;
