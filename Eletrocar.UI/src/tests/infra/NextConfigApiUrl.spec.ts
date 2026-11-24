import { describe, it, expect } from "vitest";
import { normalizarUrlApi, resolverUrlApi } from "../../../next.config.mjs";

const RENDER = "https://eletrocar-api-latest.onrender.com";

describe("next.config — endereço da API para o repasse /api/v1", () => {
  it.each([
    [RENDER, RENDER],
    ["eletrocar-api-latest.onrender.com", RENDER],
    [`  "${RENDER}/"\n`, RENDER],
    [`'${RENDER}'`, RENDER],
    [`${RENDER}/api/v1/`, RENDER],
    ["http://127.0.0.1:8000", "http://127.0.0.1:8000"],
  ])("normaliza %j", (entrada, esperado) => {
    expect(normalizarUrlApi(entrada)).toBe(esperado);
  });

  it.each([[""], ["   "], [undefined], ["ftp://x.com"], ["ws://x.com"], ["https://"], ["minha api"], ["[SENSITIVE]"]])(
    "recusa %j",
    (entrada) => {
      expect(normalizarUrlApi(entrada)).toBeNull();
    }
  );

  it("usa o primeiro endereço válido: Vercel, depois a variável do GitHub", () => {
    expect(resolverUrlApi({ ELETROCAR_API_URL: "https://outra.onrender.com", API_URL: RENDER })).toBe(
      "https://outra.onrender.com"
    );
    expect(resolverUrlApi({ ELETROCAR_API_URL: "[SENSITIVE]", API_URL: RENDER })).toBe(RENDER);
  });

  it("sem endereço usa a API local, exceto quando o deploy exige", () => {
    expect(resolverUrlApi({})).toBe("http://127.0.0.1:8000");
    expect(() => resolverUrlApi({ ELETROCAR_API_URL: "minha api", ELETROCAR_EXIGIR_API_URL: "1" })).toThrow(
      /Endereço da API não configurado/
    );
  });
});
