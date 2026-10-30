"""
Value Object: DadosOSExtraidos
Esquema rígido extraído do áudio do Telegram (Whisper -> LLM) para abertura de Ordem de Serviço.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from src.domain.value_objects.enums import PrioridadeOS
from src.domain.exceptions.domain_exceptions import RegraNegocioException


@dataclass(frozen=True)
class DadosOSExtraidos:
    nome_cliente: str
    carro_modelo: str
    sintomas_relatados: str
    carro_marca: Optional[str] = None
    carro_placa: Optional[str] = None
    carro_ano: Optional[str] = None
    telefone_cliente: Optional[str] = None
    hipotese_diagnostica: Optional[str] = None
    servicos_sugeridos: List[str] = field(default_factory=list)
    checklist_eletrico: Dict[str, Any] = field(default_factory=dict)
    prioridade: PrioridadeOS = PrioridadeOS.MEDIA

    def __post_init__(self):
        if not (self.nome_cliente or "").strip():
            raise RegraNegocioException("O áudio não identificou o nome do cliente.")
        if not (self.carro_modelo or "").strip():
            raise RegraNegocioException("O áudio não identificou o modelo do carro.")
        if not (self.sintomas_relatados or "").strip():
            raise RegraNegocioException("O áudio não descreveu os sintomas do veículo.")
