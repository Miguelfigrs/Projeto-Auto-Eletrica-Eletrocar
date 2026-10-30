"""
Implementação SQLAlchemy do ClienteRepositoryInterface.
"""
from typing import List, Optional
import uuid
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from src.domain.entities.cliente import Cliente
from src.domain.entities.carro import Carro
from src.domain.repositories.interfaces import ClienteRepositoryInterface
from src.infra.database.models import ClienteModel, CarroModel


class ClienteRepositorySQLAlchemy(ClienteRepositoryInterface):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def salvar(self, cliente: Cliente) -> Cliente:
        model = await self.session.get(ClienteModel, cliente.id)
        if not model:
            model = ClienteModel(id=cliente.id, carros=[])
            self.session.add(model)

        model.nome = cliente.nome
        model.cpf_cnpj = cliente.cpf_cnpj
        model.telefone = cliente.telefone
        model.email = cliente.email
        model.created_at = cliente.created_at

        existentes = {c.id: c for c in model.carros}
        for carro in cliente.carros:
            c_model = existentes.get(carro.id)
            if not c_model:
                c_model = CarroModel(id=carro.id, cliente_id=cliente.id)
                model.carros.append(c_model)
            c_model.modelo = carro.modelo
            c_model.marca = carro.marca
            c_model.placa = carro.placa
            c_model.ano = carro.ano

        await self.session.flush()
        return cliente

    async def buscar_por_id(self, cliente_id: uuid.UUID) -> Optional[Cliente]:
        model = await self.session.get(ClienteModel, cliente_id)
        return self._to_entity(model) if model else None

    async def buscar_por_cpf_cnpj(self, cpf_cnpj: str) -> Optional[Cliente]:
        res = await self.session.execute(select(ClienteModel).where(ClienteModel.cpf_cnpj == cpf_cnpj.strip()))
        model = res.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def buscar_por_termo(self, termo: str) -> List[Cliente]:
        like = f"%{termo.strip()}%"
        # Busca por nome do cliente, CPF/CNPJ ou modelo/placa do carro (índices trigram no PostgreSQL)
        stmt = (
            select(ClienteModel)
            .outerjoin(CarroModel, ClienteModel.id == CarroModel.cliente_id)
            .where(or_(
                ClienteModel.nome.ilike(like),
                ClienteModel.cpf_cnpj.ilike(like),
                CarroModel.modelo.ilike(like),
                CarroModel.placa.ilike(like.upper().replace("-", "")),
            ))
            .distinct()
            .order_by(ClienteModel.nome)
            .limit(50)
        )
        res = await self.session.execute(stmt)
        return [self._to_entity(m) for m in res.scalars().all()]

    async def buscar_carro_por_placa(self, placa: str) -> Optional[Carro]:
        placa_limpa = placa.strip().upper().replace("-", "")
        res = await self.session.execute(select(CarroModel).where(CarroModel.placa == placa_limpa))
        c = res.scalar_one_or_none()
        return self._carro(c) if c else None

    @staticmethod
    def _carro(c: CarroModel) -> Carro:
        return Carro(id=c.id, cliente_id=c.cliente_id, modelo=c.modelo, marca=c.marca, placa=c.placa, ano=c.ano)

    def _to_entity(self, m: ClienteModel) -> Cliente:
        return Cliente(
            id=m.id,
            nome=m.nome,
            cpf_cnpj=m.cpf_cnpj,
            telefone=m.telefone,
            email=m.email,
            carros=[self._carro(c) for c in m.carros],
            created_at=m.created_at
        )
