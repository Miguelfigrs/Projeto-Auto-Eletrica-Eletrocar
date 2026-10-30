"""
Domain Service: NormalizadorTermosEletricosService
Calibração do vocabulário técnico de auto elétrica: corrige erros comuns da transcrição (ASR)
antes da extração estruturada e fornece o dicionário usado no prompt do extrator.
"""
import re

VOCABULARIO_AUTO_ELETRICA = [
    "alternador", "regulador de voltagem", "placa de diodos", "estator", "rotor", "induzido",
    "motor de partida", "bendix", "automático de partida", "relé de partida", "escovas",
    "bateria", "terminal de bateria", "fuga de corrente", "chicote", "fusível", "maxi fusível",
    "relé", "sensor hall", "sonda lambda", "bobina de ignição", "vela de ignição", "cabo de vela",
    "atuador", "chave de seta", "módulo de injeção", "farol", "lanterna", "pisca", "buzina",
]

# Erros frequentes do ASR em ambiente ruidoso de oficina -> termo técnico correto
CORRECOES_ASR = {
    r"\bbendis\b": "bendix",
    r"\bbendics\b": "bendix",
    r"\balternado\b": "alternador",
    r"\balternadô\b": "alternador",
    r"\brele\b": "relé",
    r"\breles\b": "relés",
    r"\bxicote\b": "chicote",
    r"\bfusivel\b": "fusível",
    r"\bsensor ral\b": "sensor hall",
    r"\bsonda landa\b": "sonda lambda",
    r"\bbobina de ignissão\b": "bobina de ignição",
    r"\bmotor de arranco\b": "motor de partida",
}


class NormalizadorTermosEletricosService:
    @staticmethod
    def normalizar(texto: str) -> str:
        resultado = (texto or "").strip()
        for padrao, correto in CORRECOES_ASR.items():
            resultado = re.sub(padrao, correto, resultado, flags=re.IGNORECASE)
        return resultado
