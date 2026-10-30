"""
Serviço de Aplicação: ValidadorAlcadaGerencial (UC04 - Aplicar Desconto Gerencial)
Valida a autorização do gestor (ADMIN) por PIN quando o operador excede sua alçada.
O próprio administrador (ou o dono multi-papel) possui alçada total.
"""
from typing import Optional
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.repositories.interfaces import UsuarioRepositoryInterface
from src.domain.exceptions.domain_exceptions import (
    AutorizacaoGerencialNecessariaException,
    CredenciaisInvalidasException,
)
from src.application.ports.seguranca import PasswordHasher, LimitadorTentativas
from src.application.dtos.venda_dtos import AutorizacaoGerencialDTO


class ValidadorAlcadaGerencial:
    def __init__(
        self,
        usuario_repo: UsuarioRepositoryInterface,
        password_hasher: PasswordHasher,
        limitador: LimitadorTentativas
    ):
        self.usuario_repo = usuario_repo
        self.password_hasher = password_hasher
        self.limitador = limitador

    async def autorizar(self, operador: Optional[Usuario], autorizacao: Optional[AutorizacaoGerencialDTO]) -> uuid.UUID:
        """Retorna o id de quem autorizou a operação ou lança exceção."""
        if operador is not None and operador.ativo and operador.eh_admin():
            return operador.id
        if autorizacao is None:
            raise AutorizacaoGerencialNecessariaException(
                "Desconto ou alteração de preço acima da alçada do operador: informe a autorização do gestor."
            )

        identificador = (autorizacao.identificador_gestor or "").strip().lower()
        chave = f"alcada:{identificador}"
        self.limitador.verificar(chave)

        gestor = await self.usuario_repo.buscar_por_login(identificador)
        pin_ok = (
            gestor is not None and gestor.ativo and gestor.tem_pin
            and self.password_hasher.verify(autorizacao.pin or "", gestor.pin_hash)
        )
        if not pin_ok:
            self.limitador.registrar_falha(chave)
            raise CredenciaisInvalidasException("Autorização gerencial inválida.")
        if not gestor.eh_admin():
            raise AutorizacaoGerencialNecessariaException("Somente um administrador pode autorizar esta operação.")

        self.limitador.limpar(chave)
        return gestor.id
