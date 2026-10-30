"""
Serviço de Aplicação: montagem do DTO completo da OS (nome do cliente e descrição do veículo).
"""
from src.domain.entities.ordem_servico import OrdemServico
from src.domain.repositories.interfaces import ClienteRepositoryInterface
from src.application.dtos.os_dtos import OrdemServicoOutputDTO


async def montar_os_dto(os: OrdemServico, cliente_repo: ClienteRepositoryInterface) -> OrdemServicoOutputDTO:
    cliente = await cliente_repo.buscar_por_id(os.cliente_id)
    nome_cliente = cliente.nome if cliente else "Cliente Não Identificado"
    descricao_carro = "Veículo"
    if cliente:
        carro = cliente.buscar_carro_por_id(os.carro_id)
        if carro:
            descricao_carro = carro.formatar_descricao()
    return OrdemServicoOutputDTO.de(os, nome_cliente, descricao_carro)
