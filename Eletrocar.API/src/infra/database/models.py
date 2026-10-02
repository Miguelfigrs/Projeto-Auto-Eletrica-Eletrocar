"""
Modelos ORM SQLAlchemy 2.0 para persistência relacional.
Índices otimizados para busca rápida por código de barras, SKU, placa, CPF e chaves primárias UUID.
"""
from datetime import datetime
from decimal import Decimal
import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Numeric,
    Integer,
    ForeignKey,
    Text,
    JSON,
    Index
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)
    pin_caixa = Column(String(10), nullable=True)
    telegram_user_id = Column(String(50), unique=True, index=True, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ClienteModel(Base):
    __tablename__ = "clientes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome = Column(String(150), index=True, nullable=False)
    cpf_cnpj = Column(String(20), index=True, nullable=True)
    telefone = Column(String(30), nullable=True)
    email = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    carros = relationship("CarroModel", back_populates="cliente", cascade="all, delete-orphan", lazy="selectin")


class CarroModel(Base):
    __tablename__ = "carros"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cliente_id = Column(String(36), ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True)
    modelo = Column(String(100), index=True, nullable=False)
    marca = Column(String(100), nullable=False)
    placa = Column(String(20), index=True, nullable=True)
    ano = Column(String(10), nullable=True)

    cliente = relationship("ClienteModel", back_populates="carros")


class PecaModel(Base):
    __tablename__ = "pecas"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    codigo_barras = Column(String(60), unique=True, index=True, nullable=False)
    sku = Column(String(60), unique=True, index=True, nullable=False)
    descricao = Column(String(255), index=True, nullable=False)
    preco_custo = Column(Numeric(10, 2), nullable=False)
    preco_venda = Column(Numeric(10, 2), nullable=False)
    estoque_atual = Column(Integer, default=0, nullable=False)
    estoque_minimo = Column(Integer, default=2, nullable=False)
    localizacao = Column(String(100), nullable=True)
    unidade_medida = Column(String(10), default="UN", nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class OrdemServicoModel(Base):
    __tablename__ = "ordens_servico"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    numero_os = Column(String(50), unique=True, index=True, nullable=False)
    cliente_id = Column(String(36), ForeignKey("clientes.id"), nullable=False, index=True)
    carro_id = Column(String(36), ForeignKey("carros.id"), nullable=False, index=True)
    usuario_id = Column(String(36), ForeignKey("usuarios.id"), nullable=False, index=True)
    status = Column(String(40), index=True, nullable=False)
    origem = Column(String(40), nullable=False)
    sintomas = Column(Text, nullable=True)
    hipotese_diagnostica = Column(Text, nullable=True)
    checklist_eletrico = Column(JSON, default=dict, nullable=False)
    desconto = Column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    itens = relationship("ItemOSModel", back_populates="ordem_servico", cascade="all, delete-orphan", lazy="selectin")
    servicos = relationship("ServicoOSModel", back_populates="ordem_servico", cascade="all, delete-orphan", lazy="selectin")


class ItemOSModel(Base):
    __tablename__ = "itens_os"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ordem_servico_id = Column(String(36), ForeignKey("ordens_servico.id", ondelete="CASCADE"), nullable=False, index=True)
    peca_id = Column(String(36), ForeignKey("pecas.id"), nullable=False, index=True)
    descricao_peca = Column(String(255), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Numeric(10, 2), nullable=False)

    ordem_servico = relationship("OrdemServicoModel", back_populates="itens")


class ServicoOSModel(Base):
    __tablename__ = "servicos_os"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ordem_servico_id = Column(String(36), ForeignKey("ordens_servico.id", ondelete="CASCADE"), nullable=False, index=True)
    descricao = Column(String(255), nullable=False)
    valor = Column(Numeric(10, 2), nullable=False)
    eletricista_responsavel_id = Column(String(36), ForeignKey("usuarios.id"), nullable=True)

    ordem_servico = relationship("OrdemServicoModel", back_populates="servicos")


class VendaBalcaoModel(Base):
    __tablename__ = "vendas_balcao"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    numero_venda = Column(String(50), unique=True, index=True, nullable=False)
    operador_id = Column(String(36), ForeignKey("usuarios.id"), nullable=False, index=True)
    cliente_id = Column(String(36), ForeignKey("clientes.id"), nullable=True, index=True)
    desconto = Column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    forma_pagamento = Column(String(40), nullable=True)
    status = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    itens = relationship("ItemVendaModel", back_populates="venda", cascade="all, delete-orphan", lazy="selectin")


class ItemVendaModel(Base):
    __tablename__ = "itens_venda"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    venda_id = Column(String(36), ForeignKey("vendas_balcao.id", ondelete="CASCADE"), nullable=False, index=True)
    peca_id = Column(String(36), ForeignKey("pecas.id"), nullable=False, index=True)
    descricao_peca = Column(String(255), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Numeric(10, 2), nullable=False)

    venda = relationship("VendaBalcaoModel", back_populates="itens")


class CaixaDiarioModel(Base):
    __tablename__ = "caixas_diario"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    operador_id = Column(String(36), ForeignKey("usuarios.id"), nullable=False, index=True)
    saldo_inicial = Column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    status = Column(String(20), nullable=False)
    data_abertura = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_fechamento = Column(DateTime, nullable=True)
    diferenca_fechamento = Column(Numeric(10, 2), nullable=True)
    totais_informados_fechamento = Column(JSON, nullable=True)

    movimentacoes = relationship("MovimentacaoCaixaModel", back_populates="caixa", cascade="all, delete-orphan", lazy="selectin")


class MovimentacaoCaixaModel(Base):
    __tablename__ = "movimentacoes_caixa"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    caixa_id = Column(String(36), ForeignKey("caixas_diario.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(30), nullable=False)
    valor = Column(Numeric(10, 2), nullable=False)
    forma_pagamento = Column(String(30), nullable=False)
    descricao = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    caixa = relationship("CaixaDiarioModel", back_populates="movimentacoes")


class LogAuditoriaModel(Base):
    __tablename__ = "logs_auditoria"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id = Column(String(36), nullable=True, index=True)
    origem = Column(String(50), nullable=False)
    acao = Column(String(100), nullable=False, index=True)
    detalhes = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
