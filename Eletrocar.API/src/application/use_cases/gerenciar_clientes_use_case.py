"""
Caso de Uso: GerenciarClientesUseCase
Cadastro rápido de clientes e seus carros vinculados para atendimento ágil de balcão.
"""
from typing import List, Optional
import uuid
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.repositories.interfaces import ClienteRepositoryInterface
from src.domain.exceptions.domain_exceptions import RegraNegocioException
from src.application.dtos.cliente_dtos import (
    CadastrarClienteInputDTO,
    CarroInputDTO,
    CarroOutputDTO,
    ClienteOutputDTO
)


class GerenciarClientesUseCase:
    def __init__(self, cliente_repo: ClienteRepositoryInterface):
        self.cliente_repo = cliente_repo

    async def cadastrar_cliente(self, input_dto: CadastrarClienteInputDTO) -> ClienteOutputDTO:
        cliente_id = uuid.uuid4()
        
        carros = []
        for c in input_dto.carros:
            carro = Carro(
                id=uuid.uuid4(),
                cliente_id=cliente_id,
                modelo=c.modelo,
                marca=c.marca,
                placa=c.placa,
                ano=c.ano
            )
            carros.append(carro)

        cliente = Cliente(
            id=cliente_id,
            nome=input_dto.nome,
            cpf_cnpj=input_dto.cpf_cnpj,
            telefone=input_dto.telefone,
            email=input_dto.email,
            carros=carros
        )

        salvo = await self.cliente_repo.salvar(cliente)
        return self._to_dto(salvo)

    async def buscar_por_termo(self, termo: str) -> List[ClienteOutputDTO]:
        clientes = await self.cliente_repo.buscar_por_termo(termo)
        return [self._to_dto(c) for c in clientes]

    async def buscar_por_id(self, cliente_id: uuid.UUID) -> Optional[ClienteOutputDTO]:
        cliente = await self.cliente_repo.buscar_por_id(cliente_id)
        if not cliente:
            return None
        return self._to_dto(cliente)

    def _to_dto(self, c: Cliente) -> ClienteOutputDTO:
        return ClienteOutputDTO(
            id=c.id,
            nome=c.nome,
            cpf_cnpj=c.cpf_cnpj,
            telefone=c.telefone,
            email=c.email,
            carros=[
                CarroOutputDTO(
                    id=carro.id,
                    modelo=carro.modelo,
                    marca=carro.marca,
                    placa=carro.placa,
                    ano=carro.ano,
                    descricao_completa=carro.formatar_descricao()
                )
                for carro in c.carros
            ]
        )
