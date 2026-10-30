"""
Caso de Uso: AplicarDescontoOSUseCase (UC04 aplicado à Ordem de Serviço)
Desconto acima da alçada exige autorização do gestor; toda alteração gera log antes/depois.
"""
from decimal import Decimal
from src.domain.entities.auditoria import novo_log
from src.domain.services.politica_alcada_service import PoliticaAlcadaService
from src.domain.repositories.interfaces import (
    OrdemServicoRepositoryInterface,
    ClienteRepositoryInterface,
    UsuarioRepositoryInterface,
    AuditoriaRepositoryInterface,
)
from src.domain.exceptions.domain_exceptions import EntidadeNaoEncontradaException
from src.application.services.validador_alcada import ValidadorAlcadaGerencial
from src.application.services.apresentacao_os import montar_os_dto
from src.application.dtos.os_dtos import AplicarDescontoOSInputDTO, OrdemServicoOutputDTO


class AplicarDescontoOSUseCase:
    def __init__(
        self,
        os_repo: OrdemServicoRepositoryInterface,
        cliente_repo: ClienteRepositoryInterface,
        usuario_repo: UsuarioRepositoryInterface,
        validador_alcada: ValidadorAlcadaGerencial,
        audit_repo: AuditoriaRepositoryInterface,
        limite_desconto_percentual: Decimal = Decimal("5"),
    ):
        self.os_repo = os_repo
        self.cliente_repo = cliente_repo
        self.usuario_repo = usuario_repo
        self.validador_alcada = validador_alcada
        self.audit_repo = audit_repo
        self.limite_desconto_percentual = limite_desconto_percentual

    async def executar(self, dto: AplicarDescontoOSInputDTO) -> OrdemServicoOutputDTO:
        os = await self.os_repo.buscar_por_id(dto.os_id)
        if not os:
            raise EntidadeNaoEncontradaException("Ordem de serviço não encontrada.")

        autorizado_por = None
        if PoliticaAlcadaService.exige_autorizacao(os.valor_bruto, dto.desconto, self.limite_desconto_percentual, False):
            operador = await self.usuario_repo.buscar_por_id(dto.operador_id)
            autorizado_por = await self.validador_alcada.autorizar(operador, dto.autorizacao)

        antes = {"desconto": str(os.desconto)}
        os.aplicar_desconto(dto.desconto)
        await self.os_repo.salvar(os)

        detalhes = {"os_id": str(os.id), "numero_os": os.numero_os}
        if autorizado_por:
            detalhes["autorizado_por_id"] = str(autorizado_por)
        await self.audit_repo.registrar(novo_log(
            dto.operador_id, "ORDEM_SERVICO", "DESCONTO_APLICADO",
            detalhes=detalhes, antes=antes, depois={"desconto": str(os.desconto)},
        ))
        return await montar_os_dto(os, self.cliente_repo)
