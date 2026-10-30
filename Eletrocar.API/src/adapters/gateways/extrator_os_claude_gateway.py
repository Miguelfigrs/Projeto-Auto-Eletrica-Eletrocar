"""
Gateway: extração estruturada da OS a partir da transcrição (LLM Claude + JSON Schema rígido).
Usa structured outputs (output_config.format) para garantir JSON válido no esquema da especificação
e esforço baixo para cumprir a meta de < 5 s no pipeline de voz.
"""
import json
from typing import Any, Dict
import anthropic
from src.domain.gateways.interfaces import ExtratorDadosOSGateway
from src.domain.value_objects.dados_os_extraidos import DadosOSExtraidos
from src.domain.value_objects.enums import PrioridadeOS
from src.domain.services.normalizador_termos_eletricos_service import VOCABULARIO_AUTO_ELETRICA
from src.domain.exceptions.domain_exceptions import IntegracaoExternaException

TEXTO_OPCIONAL = {"anyOf": [{"type": "string"}, {"type": "null"}]}
ITEM_CHECKLIST = ["bateria", "alternador", "motor_partida", "iluminacao", "injecao"]

ESQUEMA_OS: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "nome_cliente": {"type": "string"},
        "carro_modelo": {"type": "string"},
        "carro_marca": TEXTO_OPCIONAL,
        "carro_placa": TEXTO_OPCIONAL,
        "carro_ano": TEXTO_OPCIONAL,
        "telefone_cliente": TEXTO_OPCIONAL,
        "sintomas_relatados": {"type": "string"},
        "hipotese_diagnostica": TEXTO_OPCIONAL,
        "servicos_sugeridos": {"type": "array", "items": {"type": "string"}},
        "checklist_eletrico": {
            "type": "object",
            "properties": {item: TEXTO_OPCIONAL for item in ITEM_CHECKLIST},
            "required": ITEM_CHECKLIST,
            "additionalProperties": False,
        },
        "prioridade": {"type": "string", "enum": [p.value for p in PrioridadeOS]},
    },
    "required": [
        "nome_cliente", "carro_modelo", "carro_marca", "carro_placa", "carro_ano", "telefone_cliente",
        "sintomas_relatados", "hipotese_diagnostica", "servicos_sugeridos", "checklist_eletrico", "prioridade",
    ],
    "additionalProperties": False,
}

INSTRUCOES = f"""Você recebe a transcrição de um áudio gravado por um eletricista na baia de uma auto elétrica brasileira.
Extraia os dados para abrir uma Ordem de Serviço.

- nome_cliente e carro_modelo: como foram ditos (ex.: "seu Carlos" -> "Carlos"; "Gol 1.6"). Se não foram mencionados, use string vazia.
- sintomas_relatados: o defeito descrito, em uma frase objetiva em português.
- hipotese_diagnostica: a suspeita técnica do eletricista, se houver.
- servicos_sugeridos: serviços de diagnóstico/reparo citados ou claramente implicados.
- checklist_eletrico: estado de cada sistema somente quando o áudio disser algo sobre ele; caso contrário null.
- prioridade: ALTA para veículo parado/sem partida ou risco; BAIXA para itens de conforto; senão MEDIA.
- Não invente placa, ano, telefone ou marca: use null quando não forem ditos.

Vocabulário técnico da oficina (use a grafia correta): {", ".join(VOCABULARIO_AUTO_ELETRICA)}."""


class ClaudeExtratorDadosOSGateway(ExtratorDadosOSGateway):
    def __init__(self, client: anthropic.AsyncAnthropic, modelo: str = "claude-opus-5-5", esforco: str = "low"):
        self.client = client
        self.modelo = modelo
        self.esforco = esforco

    async def extrair(self, transcricao: str) -> DadosOSExtraidos:
        try:
            resposta = await self.client.beta.messages.create(
                model=self.modelo,
                max_tokens=8000,
                # Recusa de classificador de segurança é reprocessada no modelo de fallback recomendado
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                system=INSTRUCOES,
                output_config={
                    "effort": self.esforco,
                    "format": {"type": "json_schema", "schema": ESQUEMA_OS},
                },
                messages=[{"role": "user", "content": f"<transcricao>\n{transcricao}\n</transcricao>"}],
            )
        except anthropic.APIConnectionError as exc:
            raise IntegracaoExternaException("Falha de conexão com o serviço de IA.") from exc
        except anthropic.RateLimitError as exc:
            raise IntegracaoExternaException("Serviço de IA sobrecarregado. Tente novamente em instantes.") from exc
        except anthropic.APIStatusError as exc:
            raise IntegracaoExternaException(f"Serviço de IA retornou erro {exc.status_code}.") from exc

        if resposta.stop_reason == "refusal":
            raise IntegracaoExternaException("O serviço de IA recusou processar este áudio.")
        if resposta.stop_reason == "max_tokens":
            raise IntegracaoExternaException("A resposta do serviço de IA foi truncada.")

        texto = next((bloco.text for bloco in resposta.content if bloco.type == "text"), None)
        if not texto:
            raise IntegracaoExternaException("O serviço de IA não retornou dados estruturados.")
        try:
            dados = json.loads(texto)
        except json.JSONDecodeError as exc:
            raise IntegracaoExternaException("O serviço de IA retornou um JSON inválido.") from exc

        return converter_para_dados_os(dados)


def converter_para_dados_os(dados: Dict[str, Any]) -> DadosOSExtraidos:
    checklist = {k: v for k, v in (dados.get("checklist_eletrico") or {}).items() if v}
    try:
        prioridade = PrioridadeOS(dados.get("prioridade") or "MEDIA")
    except ValueError:
        prioridade = PrioridadeOS.MEDIA
    return DadosOSExtraidos(
        nome_cliente=(dados.get("nome_cliente") or "").strip(),
        carro_modelo=(dados.get("carro_modelo") or "").strip(),
        sintomas_relatados=(dados.get("sintomas_relatados") or "").strip(),
        carro_marca=dados.get("carro_marca"),
        carro_placa=dados.get("carro_placa"),
        carro_ano=dados.get("carro_ano"),
        telefone_cliente=dados.get("telefone_cliente"),
        hipotese_diagnostica=dados.get("hipotese_diagnostica"),
        servicos_sugeridos=[s for s in (dados.get("servicos_sugeridos") or []) if s],
        checklist_eletrico=checklist,
        prioridade=prioridade,
    )
