"""
Value Object: CpfCnpj
Validação de CPF e CNPJ brasileiros com cálculo estrito dos dígitos verificadores (Módulo 11).
Suporta valor nulo (pois no cadastro ágil de balcão o documento é opcional).
"""
import re
from typing import Optional
from src.domain.exceptions.domain_exceptions import RegraNegocioException


class CpfCnpj:
    def __init__(self, valor: Optional[str] = None):
        if valor is None or not str(valor).strip():
            self._valor = None
            self._tipo = None
            return

        digitos = re.sub(r"\D", "", str(valor))
        if len(digitos) == 11:
            if not self._validar_cpf(digitos):
                raise RegraNegocioException(f"CPF inválido: {valor}")
            self._valor = digitos
            self._tipo = "CPF"
        elif len(digitos) == 14:
            if not self._validar_cnpj(digitos):
                raise RegraNegocioException(f"CNPJ inválido: {valor}")
            self._valor = digitos
            self._tipo = "CNPJ"
        else:
            raise RegraNegocioException(f"Documento com quantidade de dígitos inválida (deve ter 11 ou 14 dígitos): {valor}")

    @property
    def valor(self) -> Optional[str]:
        return self._valor

    @property
    def tipo(self) -> Optional[str]:
        return self._tipo

    def eh_valido(self) -> bool:
        return True

    def somente_digitos(self) -> str:
        return self._valor or ""

    def formatado(self) -> str:
        if not self._valor:
            return ""
        if self._tipo == "CPF":
            return f"{self._valor[:3]}.{self._valor[3:6]}.{self._valor[6:9]}-{self._valor[9:]}"
        elif self._tipo == "CNPJ":
            return f"{self._valor[:2]}.{self._valor[2:5]}.{self._valor[5:8]}/{self._valor[8:12]}-{self._valor[12:]}"
        return self._valor

    @staticmethod
    def _validar_cpf(cpf: str) -> bool:
        if len(cpf) != 11 or cpf == cpf[0] * 11:
            return False
        
        # Primeiro dígito
        soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
        resto = (soma * 10) % 11
        d1 = 0 if resto == 10 else resto
        if d1 != int(cpf[9]):
            return False

        # Segundo dígito
        soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
        resto = (soma * 10) % 11
        d2 = 0 if resto == 10 else resto
        return d2 == int(cpf[10])

    @staticmethod
    def _validar_cnpj(cnpj: str) -> bool:
        if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
            return False

        # Pesos primeiro dígito
        pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma1 = sum(int(cnpj[i]) * pesos1[i] for i in range(12))
        resto1 = soma1 % 11
        d1 = 0 if resto1 < 2 else 11 - resto1
        if d1 != int(cnpj[12]):
            return False

        # Pesos segundo dígito
        pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma2 = sum(int(cnpj[i]) * pesos2[i] for i in range(13))
        resto2 = soma2 % 11
        d2 = 0 if resto2 < 2 else 11 - resto2
        return d2 == int(cnpj[13])

    def __eq__(self, outro: object) -> bool:
        if not isinstance(outro, CpfCnpj):
            return False
        return self._valor == outro.valor

    def __repr__(self) -> str:
        return f"CpfCnpj({self.formatado() or 'None'})"
