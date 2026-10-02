"""
Implementação SQLAlchemy do ClienteRepositoryInterface.
"""
from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.repositories.interfaces import ClienteRepositoryInterface
from src.infra.database.models import ClienteModel, CarroModel


class ClienteRepositorySQLAlchemy(ClienteRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, cliente: Cliente) -> Cliente:
        model = await self.session.get(ClienteModel, str(cliente.id))
        if not model:
            model = ClienteModel(id=str(cliente.id))
            self.session.add(model)

        model.nome = cliente.nome
        model.cpf_cnpj = cliente.cpf_cnpj
        model.telefone = cliente.telefone
        model.email = cliente.email
        model.created_at = cliente.created_at

        # Sincroniza carros vinculados
        carros_ids_novos = {str(c.id) for c in cliente.carros}
        
        # Carros existentes a atualizar ou manter
        for carro in cliente.carros:
            c_model = await self.session.get(CarroModel, str(carro.id))
            if not c_model:
                c_model = CarroModel(
                    id=str(carro.id),
                    cliente_id=str(cliente.id),
                    modelo=carro.modelo,
                    marca=carro.marca,
                    placa=carro.placa,
                    ano=carro.ano
                )
                self.session.add(c_model)
            else:
                c_model.modelo = carro.modelo
                c_model.marca = carro.marca
                c_model.placa = carro.placa
                c_model.ano = carro.ano

        await self.session.flush()
        return cliente

    async def buscar_por_id(self, cliente_id: uuid.UUID) -> Optional[Cliente]:
        model = await self.session.get(ClienteModel, str(cliente_id))
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_cpf_cnpj(self, cpf_cnpj: str) -> Optional[Cliente]:
        stmt = select(ClienteModel).where(ClienteModel.cpf_cnpj == cpf_cnpj.strip())
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_entity(model)

    async def buscar_por_termo(self, termo: str) -> List[Cliente]:
        like_termo = f"%{termo.strip()}%"
        # Busca por nome do cliente, CPF ou modelo/placa do carro
        stmt = (
            select(ClienteModel)
            .outerjoin(CarroModel, ClienteModel.id == CarroModel.cliente_id)
            .where(
                or_(
                    ClienteModel.nome.ilike(like_termo),
                    ClienteModel.cpf_cnpj.ilike(like_termo),
                    CarroModel.modelo.ilike(like_termo),
                    CarroModel.placa.ilike(like_termo)
                )
            )
            .distinct()
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_entity(m) for m in models]

    async def buscar_carro_por_placa(self, placa: str) -> Optional[Carro]:
        placa_limpa = placa.strip().upper().replace("-", "")
        stmt = select(CarroModel).where(CarroModel.placa == placa_limpa)
        res = await self.session.execute(stmt)
        c_model = res.scalar_one_or_none()
        if not c_model:
            return None
        return Carro(
            id=uuid.UUID(c_model.id),
            cliente_id=uuid.UUID(c_model.cliente_id),
            modelo=c_model.modelo,
            marca=c_model.marca,
            placa=c_model.placa,
            ano=c_model.ano
        )

    def _to_entity(self, m: ClienteModel) -> Cliente:
        carros = [
            Carro(
                id=uuid.UUID(c.id),
                cliente_id=uuid.UUID(c.cliente_id),
                modelo=c.modelo,
                marca=c.marca,
                placa=c.placa,
                ano=c.ano
            )
            for c in m.carros
        ]
        return Cliente(
            id=uuid.UUID(m.id),
            nome=m.nome,
            cpf_cnpj=m.cpf_cnpj,
            telefone=m.telefone,
            email=m.email,
            carros=carros,
            created_at=m.created_at
        )
