"""
Caso de Uso: GerenciarClientesUseCase (Módulo 5 - Cadastro Simplificado)
Cadastro rápido de clientes (Nome obrigatório, CPF/CNPJ opcional) e seus carros vinculados.
"""
from typing import List, Optional
import uuid
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.repositories.interfaces import ClienteRepositoryInterface
from src.domain.exceptions.domain_exceptions import RegraNegocioException, EntidadeNaoEncontradaException
from src.application.dtos.cliente_dtos import (
    CadastrarClienteInputDTO,
    CarroInputDTO,
    CarroOutputDTO,
    ClienteOutputDTO
)


class GerenciarClientesUseCase:
    def __init__(self, cliente_repo: ClienteRepositoryInterface):
        self.cliente_repo = cliente_repo

    async def cadastrar_cliente(self, dto: CadastrarClienteInputDTO) -> ClienteOutputDTO:
        cliente_id = uuid.uuid4()
        cliente = Cliente(
            id=cliente_id,
            nome=dto.nome,
            cpf_cnpj=dto.cpf_cnpj,
            telefone=dto.telefone,
            email=dto.email,
            carros=[self._novo_carro(cliente_id, c) for c in dto.carros]
        )
        if cliente.cpf_cnpj and await self.cliente_repo.buscar_por_cpf_cnpj(cliente.cpf_cnpj):
            raise RegraNegocioException("Já existe um cliente cadastrado com este CPF/CNPJ.")
        await self._validar_placas(cliente.carros)
        await self.cliente_repo.salvar(cliente)
        return self._to_dto(cliente)

    async def adicionar_carro(self, cliente_id: uuid.UUID, dto: CarroInputDTO) -> ClienteOutputDTO:
        cliente = await self.cliente_repo.buscar_por_id(cliente_id)
        if not cliente:
            raise EntidadeNaoEncontradaException("Cliente não encontrado.")
        carro = self._novo_carro(cliente.id, dto)
        await self._validar_placas([carro])
        cliente.adicionar_carro(carro)
        await self.cliente_repo.salvar(cliente)
        return self._to_dto(cliente)

    async def buscar_por_termo(self, termo: str) -> List[ClienteOutputDTO]:
        return [self._to_dto(c) for c in await self.cliente_repo.buscar_por_termo(termo)]

    async def buscar_por_id(self, cliente_id: uuid.UUID) -> Optional[ClienteOutputDTO]:
        cliente = await self.cliente_repo.buscar_por_id(cliente_id)
        return self._to_dto(cliente) if cliente else None

    async def _validar_placas(self, carros: List[Carro]):
        for carro in carros:
            if carro.placa and await self.cliente_repo.buscar_carro_por_placa(carro.placa):
                raise RegraNegocioException(f"A placa '{carro.placa}' já está cadastrada.")

    @staticmethod
    def _novo_carro(cliente_id: uuid.UUID, c: CarroInputDTO) -> Carro:
        return Carro(id=uuid.uuid4(), cliente_id=cliente_id, modelo=c.modelo, marca=c.marca, placa=c.placa, ano=c.ano)

    @staticmethod
    def _to_dto(c: Cliente) -> ClienteOutputDTO:
        return ClienteOutputDTO(
            id=c.id,
            nome=c.nome,
            cpf_cnpj=c.cpf_cnpj,
            telefone=c.telefone,
            email=c.email,
            carros=[
                CarroOutputDTO(
                    id=carro.id, modelo=carro.modelo, marca=carro.marca, placa=carro.placa,
                    ano=carro.ano, descricao_completa=carro.formatar_descricao()
                )
                for carro in c.carros
            ]
        )
