"""Esquema inicial do PostgreSQL 16 da Auto Elétrica Eletrocar.

- RBAC multi-perfil (PAPEIS + USUARIOS_PAPEIS), sessões de refresh token
- Clientes/carros, peças com reserva e bloqueio otimista, OS, vendas, caixa, títulos e PIX
- Índices B-Tree e GIN (pg_trgm para busca textual, JSONB do checklist elétrico)
- Logs de auditoria imutáveis (trigger bloqueia UPDATE/DELETE no PostgreSQL)

Revision ID: 0001
Revises:
Create Date: 2026-10-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    if _postgres():
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table('clientes',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.String(length=150), nullable=False),
    sa.Column('cpf_cnpj', sa.String(length=14), nullable=True),
    sa.Column('telefone', sa.String(length=30), nullable=True),
    sa.Column('email', sa.String(length=150), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('cpf_cnpj')
    )
    with op.batch_alter_table('clientes', schema=None) as batch_op:
        batch_op.create_index('idx_clientes_nome_trgm', ['nome'], unique=False, postgresql_using='gin', postgresql_ops={'nome': 'gin_trgm_ops'})
        batch_op.create_index(batch_op.f('ix_clientes_nome'), ['nome'], unique=False)

    op.create_table('cobrancas_pix',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('txid', sa.String(length=35), nullable=False),
    sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('copia_e_cola', sa.Text(), nullable=False),
    sa.Column('descricao', sa.String(length=140), nullable=True),
    sa.Column('status', sa.String(length=15), nullable=False),
    sa.Column('end_to_end_id', sa.String(length=60), nullable=True),
    sa.Column('criada_em', sa.DateTime(), nullable=False),
    sa.Column('expira_em', sa.DateTime(), nullable=False),
    sa.Column('liquidada_em', sa.DateTime(), nullable=True),
    sa.Column('utilizada_em', sa.DateTime(), nullable=True),
    sa.Column('referencia_uso', sa.String(length=60), nullable=True),
    sa.CheckConstraint('valor > 0', name='ck_pix_valor'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('referencia_uso'),
    sa.UniqueConstraint('txid')
    )
    op.create_table('contadores_sequenciais',
    sa.Column('chave', sa.String(length=30), nullable=False),
    sa.Column('valor', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('chave')
    )
    op.create_table('logs_auditoria',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=True),
    sa.Column('origem', sa.String(length=50), nullable=False),
    sa.Column('acao', sa.String(length=100), nullable=False),
    sa.Column('detalhes', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('payload_antes', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('payload_depois', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('ip_address', sa.String(length=64), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('logs_auditoria', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_logs_auditoria_acao'), ['acao'], unique=False)
        batch_op.create_index(batch_op.f('ix_logs_auditoria_timestamp'), ['timestamp'], unique=False)
        batch_op.create_index(batch_op.f('ix_logs_auditoria_usuario_id'), ['usuario_id'], unique=False)

    op.create_table('papeis',
    sa.Column('id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column('codigo', sa.String(length=30), nullable=False),
    sa.Column('descricao', sa.String(length=100), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('codigo')
    )
    op.create_table('pecas',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('codigo_barras', sa.String(length=60), nullable=False),
    sa.Column('sku', sa.String(length=60), nullable=False),
    sa.Column('codigo_original_fabricante', sa.String(length=60), nullable=True),
    sa.Column('fabricante', sa.String(length=80), nullable=True),
    sa.Column('aplicacao_veicular', sa.String(length=255), nullable=True),
    sa.Column('descricao', sa.String(length=255), nullable=False),
    sa.Column('preco_custo', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('preco_venda', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('estoque_atual', sa.Integer(), nullable=False),
    sa.Column('estoque_reservado', sa.Integer(), nullable=False),
    sa.Column('estoque_minimo', sa.Integer(), nullable=False),
    sa.Column('localizacao', sa.String(length=100), nullable=True),
    sa.Column('unidade_medida', sa.String(length=10), nullable=False),
    sa.Column('ativo', sa.Boolean(), nullable=False),
    sa.Column('versao', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint('estoque_atual >= 0', name='ck_pecas_estoque_nao_negativo'),
    sa.CheckConstraint('estoque_reservado >= 0 AND estoque_reservado <= estoque_atual', name='ck_pecas_reserva_valida'),
    sa.CheckConstraint('preco_custo >= 0 AND preco_venda >= 0', name='ck_pecas_precos_positivos'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('codigo_barras'),
    sa.UniqueConstraint('sku')
    )
    with op.batch_alter_table('pecas', schema=None) as batch_op:
        batch_op.create_index('idx_pecas_aplicacao_trgm', ['aplicacao_veicular'], unique=False, postgresql_using='gin', postgresql_ops={'aplicacao_veicular': 'gin_trgm_ops'})
        batch_op.create_index('idx_pecas_descricao_trgm', ['descricao'], unique=False, postgresql_using='gin', postgresql_ops={'descricao': 'gin_trgm_ops'})
        batch_op.create_index(batch_op.f('ix_pecas_codigo_original_fabricante'), ['codigo_original_fabricante'], unique=False)

    op.create_table('usuarios',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.String(length=150), nullable=False),
    sa.Column('email', sa.String(length=150), nullable=False),
    sa.Column('username', sa.String(length=50), nullable=True),
    sa.Column('senha_hash', sa.String(length=255), nullable=False),
    sa.Column('pin_hash', sa.String(length=255), nullable=True),
    sa.Column('telegram_user_id', sa.String(length=50), nullable=True),
    sa.Column('ativo', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('telegram_user_id'),
    sa.UniqueConstraint('username')
    )
    op.create_table('caixas_diario',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('operador_id', sa.Uuid(), nullable=False),
    sa.Column('saldo_inicial', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('data_abertura', sa.DateTime(), nullable=False),
    sa.Column('data_fechamento', sa.DateTime(), nullable=True),
    sa.Column('diferenca_fechamento', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('totais_informados_fechamento', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.ForeignKeyConstraint(['operador_id'], ['usuarios.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('caixas_diario', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_caixas_diario_operador_id'), ['operador_id'], unique=False)
        batch_op.create_index('uq_caixa_aberto', ['status'], unique=True, postgresql_where=sa.text("status = 'ABERTO'"), sqlite_where=sa.text("status = 'ABERTO'"))

    op.create_table('carros',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('cliente_id', sa.Uuid(), nullable=False),
    sa.Column('modelo', sa.String(length=100), nullable=False),
    sa.Column('marca', sa.String(length=100), nullable=False),
    sa.Column('placa', sa.String(length=10), nullable=True),
    sa.Column('ano', sa.String(length=10), nullable=True),
    sa.ForeignKeyConstraint(['cliente_id'], ['clientes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('placa')
    )
    with op.batch_alter_table('carros', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_carros_cliente_id'), ['cliente_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_carros_modelo'), ['modelo'], unique=False)

    op.create_table('sessoes_refresh',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=False),
    sa.Column('criada_em', sa.DateTime(), nullable=False),
    sa.Column('expira_em', sa.DateTime(), nullable=False),
    sa.Column('revogada_em', sa.DateTime(), nullable=True),
    sa.Column('substituida_por', sa.Uuid(), nullable=True),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('sessoes_refresh', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_sessoes_refresh_usuario_id'), ['usuario_id'], unique=False)

    op.create_table('usuarios_papeis',
    sa.Column('usuario_id', sa.Uuid(), nullable=False),
    sa.Column('papel_id', sa.Integer(), nullable=False),
    sa.Column('atribuido_em', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['papel_id'], ['papeis.id'], ),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('usuario_id', 'papel_id')
    )
    op.create_table('vendas_balcao',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('numero_venda', sa.String(length=30), nullable=False),
    sa.Column('operador_id', sa.Uuid(), nullable=False),
    sa.Column('cliente_id', sa.Uuid(), nullable=True),
    sa.Column('desconto', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('forma_pagamento', sa.String(length=30), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('autorizado_por_id', sa.Uuid(), nullable=True),
    sa.Column('referencia_pagamento', sa.String(length=60), nullable=True),
    sa.Column('motivo_cancelamento', sa.Text(), nullable=True),
    sa.Column('cancelada_em', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint('desconto >= 0', name='ck_vendas_desconto_positivo'),
    sa.ForeignKeyConstraint(['autorizado_por_id'], ['usuarios.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['cliente_id'], ['clientes.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['operador_id'], ['usuarios.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('numero_venda')
    )
    with op.batch_alter_table('vendas_balcao', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_vendas_balcao_cliente_id'), ['cliente_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_vendas_balcao_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_vendas_balcao_operador_id'), ['operador_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_vendas_balcao_status'), ['status'], unique=False)

    op.create_table('itens_venda',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('venda_id', sa.Uuid(), nullable=False),
    sa.Column('peca_id', sa.Uuid(), nullable=False),
    sa.Column('descricao_peca', sa.String(length=255), nullable=False),
    sa.Column('quantidade', sa.Integer(), nullable=False),
    sa.Column('preco_unitario', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('custo_unitario', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.CheckConstraint('quantidade > 0', name='ck_itens_venda_quantidade'),
    sa.ForeignKeyConstraint(['peca_id'], ['pecas.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['venda_id'], ['vendas_balcao.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('itens_venda', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_itens_venda_peca_id'), ['peca_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_itens_venda_venda_id'), ['venda_id'], unique=False)

    op.create_table('movimentacoes_caixa',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('caixa_id', sa.Uuid(), nullable=False),
    sa.Column('tipo', sa.String(length=30), nullable=False),
    sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('forma_pagamento', sa.String(length=30), nullable=False),
    sa.Column('descricao', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint('valor > 0', name='ck_mov_caixa_valor'),
    sa.ForeignKeyConstraint(['caixa_id'], ['caixas_diario.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('movimentacoes_caixa', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_movimentacoes_caixa_caixa_id'), ['caixa_id'], unique=False)

    op.create_table('ordens_servico',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('numero_os', sa.String(length=30), nullable=False),
    sa.Column('cliente_id', sa.Uuid(), nullable=False),
    sa.Column('carro_id', sa.Uuid(), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('origem', sa.String(length=30), nullable=False),
    sa.Column('prioridade', sa.String(length=10), nullable=False),
    sa.Column('sintomas', sa.Text(), nullable=True),
    sa.Column('hipotese_diagnostica', sa.Text(), nullable=True),
    sa.Column('checklist_eletrico', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=False),
    sa.Column('desconto', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('observacoes', sa.Text(), nullable=True),
    sa.Column('forma_pagamento', sa.String(length=30), nullable=True),
    sa.Column('finalizada_em', sa.DateTime(), nullable=True),
    sa.Column('entregue_em', sa.DateTime(), nullable=True),
    sa.Column('versao', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint('desconto >= 0', name='ck_os_desconto_positivo'),
    sa.ForeignKeyConstraint(['carro_id'], ['carros.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['cliente_id'], ['clientes.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('numero_os')
    )
    with op.batch_alter_table('ordens_servico', schema=None) as batch_op:
        batch_op.create_index('idx_os_checklist_gin', ['checklist_eletrico'], unique=False, postgresql_using='gin')
        batch_op.create_index(batch_op.f('ix_ordens_servico_carro_id'), ['carro_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_ordens_servico_cliente_id'), ['cliente_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_ordens_servico_entregue_em'), ['entregue_em'], unique=False)
        batch_op.create_index(batch_op.f('ix_ordens_servico_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_ordens_servico_usuario_id'), ['usuario_id'], unique=False)

    op.create_table('itens_os',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('ordem_servico_id', sa.Uuid(), nullable=False),
    sa.Column('peca_id', sa.Uuid(), nullable=False),
    sa.Column('descricao_peca', sa.String(length=255), nullable=False),
    sa.Column('quantidade', sa.Integer(), nullable=False),
    sa.Column('preco_unitario', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('custo_unitario', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.CheckConstraint('quantidade > 0', name='ck_itens_os_quantidade'),
    sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['peca_id'], ['pecas.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('itens_os', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_itens_os_ordem_servico_id'), ['ordem_servico_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_itens_os_peca_id'), ['peca_id'], unique=False)

    op.create_table('servicos_os',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('ordem_servico_id', sa.Uuid(), nullable=False),
    sa.Column('descricao', sa.String(length=255), nullable=False),
    sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('eletricista_responsavel_id', sa.Uuid(), nullable=True),
    sa.ForeignKeyConstraint(['eletricista_responsavel_id'], ['usuarios.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('servicos_os', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_servicos_os_ordem_servico_id'), ['ordem_servico_id'], unique=False)

    op.create_table('titulos_financeiros',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('tipo', sa.String(length=10), nullable=False),
    sa.Column('descricao', sa.String(length=255), nullable=False),
    sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('data_vencimento', sa.Date(), nullable=False),
    sa.Column('categoria', sa.String(length=30), nullable=False),
    sa.Column('status', sa.String(length=15), nullable=False),
    sa.Column('cliente_id', sa.Uuid(), nullable=True),
    sa.Column('venda_id', sa.Uuid(), nullable=True),
    sa.Column('ordem_servico_id', sa.Uuid(), nullable=True),
    sa.Column('data_pagamento', sa.Date(), nullable=True),
    sa.Column('forma_pagamento_baixa', sa.String(length=30), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint('valor > 0', name='ck_titulos_valor'),
    sa.ForeignKeyConstraint(['cliente_id'], ['clientes.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['venda_id'], ['vendas_balcao.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('titulos_financeiros', schema=None) as batch_op:
        batch_op.create_index('idx_titulos_tipo_status_venc', ['tipo', 'status', 'data_vencimento'], unique=False)
        batch_op.create_index(batch_op.f('ix_titulos_financeiros_cliente_id'), ['cliente_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_titulos_financeiros_ordem_servico_id'), ['ordem_servico_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_titulos_financeiros_venda_id'), ['venda_id'], unique=False)

    papeis = sa.table("papeis", sa.column("id", sa.Integer), sa.column("codigo", sa.String), sa.column("descricao", sa.String))
    op.bulk_insert(papeis, [
        {"id": 1, "codigo": "ADMIN", "descricao": "Administrador / Gestor"},
        {"id": 2, "codigo": "BALCONISTA", "descricao": "Balconista / Atendente"},
        {"id": 3, "codigo": "ELETRICISTA", "descricao": "Eletricista / Mecânico"},
    ])

    if _postgres():
        op.execute("""
            CREATE OR REPLACE FUNCTION fn_auditoria_imutavel() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'logs_auditoria é imutável: % não permitido', TG_OP;
            END;
            $$ LANGUAGE plpgsql;
        """)
        op.execute("""
            CREATE TRIGGER trg_auditoria_imutavel
            BEFORE UPDATE OR DELETE ON logs_auditoria
            FOR EACH ROW EXECUTE FUNCTION fn_auditoria_imutavel();
        """)


def downgrade() -> None:
    if _postgres():
        op.execute("DROP TRIGGER IF EXISTS trg_auditoria_imutavel ON logs_auditoria")
        op.execute("DROP FUNCTION IF EXISTS fn_auditoria_imutavel()")
    with op.batch_alter_table('titulos_financeiros', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_titulos_financeiros_venda_id'))
        batch_op.drop_index(batch_op.f('ix_titulos_financeiros_ordem_servico_id'))
        batch_op.drop_index(batch_op.f('ix_titulos_financeiros_cliente_id'))
        batch_op.drop_index('idx_titulos_tipo_status_venc')

    op.drop_table('titulos_financeiros')
    with op.batch_alter_table('servicos_os', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_servicos_os_ordem_servico_id'))

    op.drop_table('servicos_os')
    with op.batch_alter_table('itens_os', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_itens_os_peca_id'))
        batch_op.drop_index(batch_op.f('ix_itens_os_ordem_servico_id'))

    op.drop_table('itens_os')
    with op.batch_alter_table('ordens_servico', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_ordens_servico_usuario_id'))
        batch_op.drop_index(batch_op.f('ix_ordens_servico_status'))
        batch_op.drop_index(batch_op.f('ix_ordens_servico_entregue_em'))
        batch_op.drop_index(batch_op.f('ix_ordens_servico_cliente_id'))
        batch_op.drop_index(batch_op.f('ix_ordens_servico_carro_id'))
        batch_op.drop_index('idx_os_checklist_gin', postgresql_using='gin')

    op.drop_table('ordens_servico')
    with op.batch_alter_table('movimentacoes_caixa', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_movimentacoes_caixa_caixa_id'))

    op.drop_table('movimentacoes_caixa')
    with op.batch_alter_table('itens_venda', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_itens_venda_venda_id'))
        batch_op.drop_index(batch_op.f('ix_itens_venda_peca_id'))

    op.drop_table('itens_venda')
    with op.batch_alter_table('vendas_balcao', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_vendas_balcao_status'))
        batch_op.drop_index(batch_op.f('ix_vendas_balcao_operador_id'))
        batch_op.drop_index(batch_op.f('ix_vendas_balcao_created_at'))
        batch_op.drop_index(batch_op.f('ix_vendas_balcao_cliente_id'))

    op.drop_table('vendas_balcao')
    op.drop_table('usuarios_papeis')
    with op.batch_alter_table('sessoes_refresh', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_sessoes_refresh_usuario_id'))

    op.drop_table('sessoes_refresh')
    with op.batch_alter_table('carros', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_carros_modelo'))
        batch_op.drop_index(batch_op.f('ix_carros_cliente_id'))

    op.drop_table('carros')
    with op.batch_alter_table('caixas_diario', schema=None) as batch_op:
        batch_op.drop_index('uq_caixa_aberto', postgresql_where=sa.text("status = 'ABERTO'"), sqlite_where=sa.text("status = 'ABERTO'"))
        batch_op.drop_index(batch_op.f('ix_caixas_diario_operador_id'))

    op.drop_table('caixas_diario')
    op.drop_table('usuarios')
    with op.batch_alter_table('pecas', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_pecas_codigo_original_fabricante'))
        batch_op.drop_index('idx_pecas_descricao_trgm', postgresql_using='gin', postgresql_ops={'descricao': 'gin_trgm_ops'})
        batch_op.drop_index('idx_pecas_aplicacao_trgm', postgresql_using='gin', postgresql_ops={'aplicacao_veicular': 'gin_trgm_ops'})

    op.drop_table('pecas')
    op.drop_table('papeis')
    with op.batch_alter_table('logs_auditoria', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_logs_auditoria_usuario_id'))
        batch_op.drop_index(batch_op.f('ix_logs_auditoria_timestamp'))
        batch_op.drop_index(batch_op.f('ix_logs_auditoria_acao'))

    op.drop_table('logs_auditoria')
    op.drop_table('contadores_sequenciais')
    op.drop_table('cobrancas_pix')
    with op.batch_alter_table('clientes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_clientes_nome'))
        batch_op.drop_index('idx_clientes_nome_trgm', postgresql_using='gin', postgresql_ops={'nome': 'gin_trgm_ops'})

    op.drop_table('clientes')
