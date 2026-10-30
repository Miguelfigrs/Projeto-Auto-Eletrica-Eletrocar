"""
Caso de Uso: InicializarAdministradorUseCase
Na primeira execução (banco sem usuários) cria o administrador inicial a partir das variáveis
de ambiente, com os três papéis (dono multi-perfil). Nunca usa senha padrão embutida no código.
"""
from typing import Optional
import uuid
from src.domain.entities.usuario import Usuario
from src.domain.value_objects.enums import Papel
from src.domain.repositories.interfaces import UsuarioRepositoryInterface
from src.application.ports.seguranca import PasswordHasher
from src.application.use_cases.gerenciar_usuarios_use_case import TAMANHO_MINIMO_SENHA
from src.domain.exceptions.domain_exceptions import RegraNegocioException


class InicializarAdministradorUseCase:
    def __init__(self, usuario_repo: UsuarioRepositoryInterface, password_hasher: PasswordHasher):
        self.usuario_repo = usuario_repo
        self.password_hasher = password_hasher

    async def executar(self, nome: str, email: str, senha: Optional[str], username: Optional[str] = None) -> bool:
        """Retorna True se o administrador foi criado."""
        if await self.usuario_repo.contar() > 0 or not email or not senha:
            return False
        if len(senha) < TAMANHO_MINIMO_SENHA:
            raise RegraNegocioException(f"ADMIN_SENHA_INICIAL deve ter ao menos {TAMANHO_MINIMO_SENHA} caracteres.")
        await self.usuario_repo.salvar(Usuario(
            id=uuid.uuid4(),
            nome=nome or "Administrador",
            email=email,
            username=username,
            senha_hash=self.password_hasher.hash(senha),
            papeis={Papel.ADMIN, Papel.BALCONISTA, Papel.ELETRICISTA},
        ))
        return True
