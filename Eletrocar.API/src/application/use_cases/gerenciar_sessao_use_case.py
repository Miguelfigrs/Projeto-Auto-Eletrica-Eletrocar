"""
Caso de Uso: GerenciarSessaoUseCase
Emissão de access token (curta duração) + refresh token com rotação a cada renovação.
Reuso de refresh token já revogado indica roubo: todas as sessões do usuário são encerradas.
"""
from datetime import datetime, timedelta
from typing import Callable, Tuple
import uuid
from src.domain.entities.sessao import SessaoRefresh
from src.domain.repositories.interfaces import UsuarioRepositoryInterface, SessaoRepositoryInterface
from src.domain.value_objects.tempo import agora_utc
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException
from src.application.ports.seguranca import TokenService
from src.application.dtos.auth_dtos import SessaoTokensDTO, UsuarioOutputDTO


class GerenciarSessaoUseCase:
    def __init__(
        self,
        usuario_repo: UsuarioRepositoryInterface,
        sessao_repo: SessaoRepositoryInterface,
        token_service: TokenService,
        validade_refresh_dias: int = 7,
        validade_access_minutos: int = 30,
        relogio: Callable[[], datetime] = agora_utc
    ):
        self.usuario_repo = usuario_repo
        self.sessao_repo = sessao_repo
        self.token_service = token_service
        self.validade_refresh = timedelta(days=validade_refresh_dias)
        self.validade_access_segundos = validade_access_minutos * 60
        self.relogio = relogio

    async def iniciar(self, usuario_id: uuid.UUID) -> SessaoTokensDTO:
        tokens, _ = await self._emitir(usuario_id)
        return tokens

    async def _emitir(self, usuario_id: uuid.UUID) -> Tuple[SessaoTokensDTO, SessaoRefresh]:
        usuario = await self.usuario_repo.buscar_por_id(usuario_id)
        if not usuario or not usuario.ativo:
            raise CredenciaisInvalidasException("Usuário inativo ou inexistente.")

        agora = self.relogio()
        sessao = SessaoRefresh(id=uuid.uuid4(), usuario_id=usuario.id, criada_em=agora, expira_em=agora + self.validade_refresh)
        await self.sessao_repo.salvar(sessao)

        tokens = SessaoTokensDTO(
            access_token=self.token_service.criar_access_token(
                usuario.id, usuario.nome, [p.value for p in usuario.papeis]
            ),
            refresh_token=self.token_service.criar_refresh_token(usuario.id, sessao.id, sessao.expira_em),
            usuario=UsuarioOutputDTO.de(usuario),
            expira_em_segundos=self.validade_access_segundos,
        )
        return tokens, sessao

    async def renovar(self, refresh_token: str) -> SessaoTokensDTO:
        sessao = await self._sessao_do_token(refresh_token)
        agora = self.relogio()

        if sessao.revogada_em is not None:
            # Token já usado/revogado sendo reapresentado: possível roubo de sessão
            await self.sessao_repo.revogar_todas_do_usuario(sessao.usuario_id, agora)
            raise CredenciaisInvalidasException("Sessão inválida. Faça login novamente.")
        if not sessao.esta_ativa(agora):
            raise CredenciaisInvalidasException("Sessão expirada. Faça login novamente.")

        novos_tokens, nova_sessao = await self._emitir(sessao.usuario_id)
        sessao.revogar(agora, substituida_por=nova_sessao.id)
        await self.sessao_repo.salvar(sessao)
        return novos_tokens

    async def encerrar(self, refresh_token: str) -> None:
        sessao = await self._sessao_do_token(refresh_token)
        sessao.revogar(self.relogio())
        await self.sessao_repo.salvar(sessao)

    async def _sessao_do_token(self, refresh_token: str) -> SessaoRefresh:
        dados = self.token_service.decodificar(refresh_token, "refresh")
        try:
            sessao_id = uuid.UUID(str(dados.get("jti")))
        except ValueError:
            raise CredenciaisInvalidasException("Token de sessão inválido.")
        sessao = await self.sessao_repo.buscar_por_id(sessao_id)
        if not sessao or str(sessao.usuario_id) != str(dados.get("sub")):
            raise CredenciaisInvalidasException("Token de sessão inválido.")
        return sessao
