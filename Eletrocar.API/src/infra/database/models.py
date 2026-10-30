"""
Modelos ORM SQLAlchemy 2.0 (fonte do esquema versionado pelas migrações Alembic).
- Chaves primárias UUID nativas no PostgreSQL 16 (CHAR(32) no SQLite de testes)
- RBAC multi-perfil: PAPEIS + USUARIOS_PAPEIS (N:N)
- Bloqueio otimista (coluna versao) e CHECK de saldo não negativo no estoque
- Índices B-Tree (código de barras, SKU, código original, placa) e GIN (trigram e JSONB) no PostgreSQL
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Date,
    DateTime,
    Numeric,
    Integer,
    ForeignKey,
    Text,
    JSON,
    Index,
    CheckConstraint,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship
from src.domain.value_objects.tempo import agora_utc

Base = declarative_base()

JSON_DOC = JSON().with_variant(JSONB(), "postgresql")
DINHEIRO = Numeric(12, 2)


class PapelModel(Base):
    __tablename__ = "papeis"

    id = Column(Integer, primary_key=True, autoincrement=False)
    codigo = Column(String(30), unique=True, nullable=False)
    descricao = Column(String(100), nullable=False)


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id = Column(Uuid, primary_key=True)
    nome = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    username = Column(String(50), unique=True, nullable=True)
    senha_hash = Column(String(255), nullable=False)
    pin_hash = Column(String(255), nullable=True)
    telegram_user_id = Column(String(50), unique=True, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=agora_utc, nullable=False)

    papeis = relationship("UsuarioPapelModel", cascade="all, delete-orphan", lazy="selectin")


class UsuarioPapelModel(Base):
    __tablename__ = "usuarios_papeis"

    usuario_id = Column(Uuid, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    papel_id = Column(Integer, ForeignKey("papeis.id"), primary_key=True)
    atribuido_em = Column(DateTime, default=agora_utc, nullable=False)

    papel = relationship("PapelModel", lazy="selectin")


class SessaoRefreshModel(Base):
    __tablename__ = "sessoes_refresh"

    id = Column(Uuid, primary_key=True)
    usuario_id = Column(Uuid, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    criada_em = Column(DateTime, nullable=False)
    expira_em = Column(DateTime, nullable=False)
    revogada_em = Column(DateTime, nullable=True)
    substituida_por = Column(Uuid, nullable=True)


class ContadorSequencialModel(Base):
    """Numeração atômica de OS e vendas por ano (UPDATE ... RETURNING)."""
    __tablename__ = "contadores_sequenciais"

    chave = Column(String(30), primary_key=True)
    valor = Column(Integer, nullable=False, default=0)


class ClienteModel(Base):
    __tablename__ = "clientes"
    __table_args__ = (
        Index("idx_clientes_nome_trgm", "nome", postgresql_using="gin", postgresql_ops={"nome": "gin_trgm_ops"}),
    )

    id = Column(Uuid, primary_key=True)
    nome = Column(String(150), nullable=False, index=True)
    cpf_cnpj = Column(String(14), unique=True, nullable=True)
    telefone = Column(String(30), nullable=True)
    email = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=agora_utc, nullable=False)

    carros = relationship("CarroModel", back_populates="cliente", cascade="all, delete-orphan", lazy="selectin")


class CarroModel(Base):
    __tablename__ = "carros"

    id = Column(Uuid, primary_key=True)
    cliente_id = Column(Uuid, ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True)
    modelo = Column(String(100), nullable=False, index=True)
    marca = Column(String(100), nullable=False)
    placa = Column(String(10), unique=True, nullable=True)
    ano = Column(String(10), nullable=True)

    cliente = relationship("ClienteModel", back_populates="carros")


class PecaModel(Base):
    __tablename__ = "pecas"
    __table_args__ = (
        CheckConstraint("estoque_atual >= 0", name="ck_pecas_estoque_nao_negativo"),
        CheckConstraint("estoque_reservado >= 0 AND estoque_reservado <= estoque_atual", name="ck_pecas_reserva_valida"),
        CheckConstraint("preco_custo >= 0 AND preco_venda >= 0", name="ck_pecas_precos_positivos"),
        Index("idx_pecas_descricao_trgm", "descricao", postgresql_using="gin", postgresql_ops={"descricao": "gin_trgm_ops"}),
        Index("idx_pecas_aplicacao_trgm", "aplicacao_veicular", postgresql_using="gin",
              postgresql_ops={"aplicacao_veicular": "gin_trgm_ops"}),
    )

    id = Column(Uuid, primary_key=True)
    codigo_barras = Column(String(60), unique=True, nullable=False)
    sku = Column(String(60), unique=True, nullable=False)
    codigo_original_fabricante = Column(String(60), nullable=True, index=True)
    fabricante = Column(String(80), nullable=True)
    aplicacao_veicular = Column(String(255), nullable=True)
    descricao = Column(String(255), nullable=False)
    preco_custo = Column(DINHEIRO, nullable=False)
    preco_venda = Column(DINHEIRO, nullable=False)
    estoque_atual = Column(Integer, default=0, nullable=False)
    estoque_reservado = Column(Integer, default=0, nullable=False)
    estoque_minimo = Column(Integer, default=2, nullable=False)
    localizacao = Column(String(100), nullable=True)
    unidade_medida = Column(String(10), default="UN", nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    versao = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=agora_utc, nullable=False)

    # Bloqueio otimista: UPDATE ... WHERE versao = :lida (StaleDataError se outra transação alterou)
    __mapper_args__ = {"version_id_col": versao}


class OrdemServicoModel(Base):
    __tablename__ = "ordens_servico"
    __table_args__ = (
        CheckConstraint("desconto >= 0", name="ck_os_desconto_positivo"),
        Index("idx_os_checklist_gin", "checklist_eletrico", postgresql_using="gin"),
    )

    id = Column(Uuid, primary_key=True)
    numero_os = Column(String(30), unique=True, nullable=False)
    cliente_id = Column(Uuid, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    carro_id = Column(Uuid, ForeignKey("carros.id", ondelete="RESTRICT"), nullable=False, index=True)
    usuario_id = Column(Uuid, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(30), nullable=False, index=True)
    origem = Column(String(30), nullable=False)
    prioridade = Column(String(10), nullable=False, default="MEDIA")
    sintomas = Column(Text, nullable=True)
    hipotese_diagnostica = Column(Text, nullable=True)
    checklist_eletrico = Column(JSON_DOC, default=dict, nullable=False)
    desconto = Column(DINHEIRO, default=Decimal("0.00"), nullable=False)
    observacoes = Column(Text, nullable=True)
    forma_pagamento = Column(String(30), nullable=True)
    finalizada_em = Column(DateTime, nullable=True)
    entregue_em = Column(DateTime, nullable=True, index=True)
    versao = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=agora_utc, nullable=False)
    updated_at = Column(DateTime, default=agora_utc, nullable=False)

    itens = relationship("ItemOSModel", back_populates="ordem_servico", cascade="all, delete-orphan", lazy="selectin")
    servicos = relationship("ServicoOSModel", back_populates="ordem_servico", cascade="all, delete-orphan", lazy="selectin")

    __mapper_args__ = {"version_id_col": versao}


class ItemOSModel(Base):
    __tablename__ = "itens_os"
    __table_args__ = (CheckConstraint("quantidade > 0", name="ck_itens_os_quantidade"),)

    id = Column(Uuid, primary_key=True)
    ordem_servico_id = Column(Uuid, ForeignKey("ordens_servico.id", ondelete="CASCADE"), nullable=False, index=True)
    peca_id = Column(Uuid, ForeignKey("pecas.id", ondelete="RESTRICT"), nullable=False, index=True)
    descricao_peca = Column(String(255), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(DINHEIRO, nullable=False)
    custo_unitario = Column(DINHEIRO, nullable=False, default=Decimal("0.00"))

    ordem_servico = relationship("OrdemServicoModel", back_populates="itens")


class ServicoOSModel(Base):
    __tablename__ = "servicos_os"

    id = Column(Uuid, primary_key=True)
    ordem_servico_id = Column(Uuid, ForeignKey("ordens_servico.id", ondelete="CASCADE"), nullable=False, index=True)
    descricao = Column(String(255), nullable=False)
    valor = Column(DINHEIRO, nullable=False)
    eletricista_responsavel_id = Column(Uuid, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    ordem_servico = relationship("OrdemServicoModel", back_populates="servicos")


class VendaBalcaoModel(Base):
    __tablename__ = "vendas_balcao"
    __table_args__ = (CheckConstraint("desconto >= 0", name="ck_vendas_desconto_positivo"),)

    id = Column(Uuid, primary_key=True)
    numero_venda = Column(String(30), unique=True, nullable=False)
    operador_id = Column(Uuid, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    cliente_id = Column(Uuid, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=True, index=True)
    desconto = Column(DINHEIRO, default=Decimal("0.00"), nullable=False)
    forma_pagamento = Column(String(30), nullable=True)
    status = Column(String(20), nullable=False, index=True)
    autorizado_por_id = Column(Uuid, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=True)
    referencia_pagamento = Column(String(60), nullable=True)
    motivo_cancelamento = Column(Text, nullable=True)
    cancelada_em = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=agora_utc, nullable=False, index=True)

    itens = relationship("ItemVendaModel", back_populates="venda", cascade="all, delete-orphan", lazy="selectin")


class ItemVendaModel(Base):
    __tablename__ = "itens_venda"
    __table_args__ = (CheckConstraint("quantidade > 0", name="ck_itens_venda_quantidade"),)

    id = Column(Uuid, primary_key=True)
    venda_id = Column(Uuid, ForeignKey("vendas_balcao.id", ondelete="CASCADE"), nullable=False, index=True)
    peca_id = Column(Uuid, ForeignKey("pecas.id", ondelete="RESTRICT"), nullable=False, index=True)
    descricao_peca = Column(String(255), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(DINHEIRO, nullable=False)
    custo_unitario = Column(DINHEIRO, nullable=False, default=Decimal("0.00"))

    venda = relationship("VendaBalcaoModel", back_populates="itens")


class CaixaDiarioModel(Base):
    __tablename__ = "caixas_diario"
    __table_args__ = (
        # Garante no banco que só existe um caixa aberto por vez
        Index("uq_caixa_aberto", "status", unique=True,
              postgresql_where=text("status = 'ABERTO'"), sqlite_where=text("status = 'ABERTO'")),
    )

    id = Column(Uuid, primary_key=True)
    operador_id = Column(Uuid, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    saldo_inicial = Column(DINHEIRO, default=Decimal("0.00"), nullable=False)
    status = Column(String(20), nullable=False)
    data_abertura = Column(DateTime, default=agora_utc, nullable=False)
    data_fechamento = Column(DateTime, nullable=True)
    diferenca_fechamento = Column(DINHEIRO, nullable=True)
    totais_informados_fechamento = Column(JSON_DOC, nullable=True)

    movimentacoes = relationship("MovimentacaoCaixaModel", back_populates="caixa", cascade="all, delete-orphan",
                                 lazy="selectin", order_by="MovimentacaoCaixaModel.created_at")


class MovimentacaoCaixaModel(Base):
    __tablename__ = "movimentacoes_caixa"
    __table_args__ = (CheckConstraint("valor > 0", name="ck_mov_caixa_valor"),)

    id = Column(Uuid, primary_key=True)
    caixa_id = Column(Uuid, ForeignKey("caixas_diario.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(30), nullable=False)
    valor = Column(DINHEIRO, nullable=False)
    forma_pagamento = Column(String(30), nullable=False)
    descricao = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=agora_utc, nullable=False)

    caixa = relationship("CaixaDiarioModel", back_populates="movimentacoes")


class TituloFinanceiroModel(Base):
    __tablename__ = "titulos_financeiros"
    __table_args__ = (
        CheckConstraint("valor > 0", name="ck_titulos_valor"),
        Index("idx_titulos_tipo_status_venc", "tipo", "status", "data_vencimento"),
    )

    id = Column(Uuid, primary_key=True)
    tipo = Column(String(10), nullable=False)
    descricao = Column(String(255), nullable=False)
    valor = Column(DINHEIRO, nullable=False)
    data_vencimento = Column(Date, nullable=False)
    categoria = Column(String(30), nullable=False)
    status = Column(String(15), nullable=False)
    cliente_id = Column(Uuid, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=True, index=True)
    venda_id = Column(Uuid, ForeignKey("vendas_balcao.id", ondelete="RESTRICT"), nullable=True, index=True)
    ordem_servico_id = Column(Uuid, ForeignKey("ordens_servico.id", ondelete="RESTRICT"), nullable=True, index=True)
    data_pagamento = Column(Date, nullable=True)
    forma_pagamento_baixa = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=agora_utc, nullable=False)


class CobrancaPixModel(Base):
    __tablename__ = "cobrancas_pix"
    __table_args__ = (CheckConstraint("valor > 0", name="ck_pix_valor"),)

    id = Column(Uuid, primary_key=True)
    txid = Column(String(35), unique=True, nullable=False)
    valor = Column(DINHEIRO, nullable=False)
    copia_e_cola = Column(Text, nullable=False)
    descricao = Column(String(140), nullable=True)
    status = Column(String(15), nullable=False)
    end_to_end_id = Column(String(60), nullable=True)
    criada_em = Column(DateTime, nullable=False)
    expira_em = Column(DateTime, nullable=False)
    liquidada_em = Column(DateTime, nullable=True)
    utilizada_em = Column(DateTime, nullable=True)
    referencia_uso = Column(String(60), unique=True, nullable=True)


class LogAuditoriaModel(Base):
    """Logs imutáveis: no PostgreSQL um trigger bloqueia UPDATE e DELETE nesta tabela."""
    __tablename__ = "logs_auditoria"

    id = Column(Uuid, primary_key=True)
    usuario_id = Column(Uuid, nullable=True, index=True)
    origem = Column(String(50), nullable=False)
    acao = Column(String(100), nullable=False, index=True)
    detalhes = Column(JSON_DOC, default=dict, nullable=False)
    payload_antes = Column(JSON_DOC, nullable=True)
    payload_depois = Column(JSON_DOC, nullable=True)
    ip_address = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=agora_utc, nullable=False, index=True)
