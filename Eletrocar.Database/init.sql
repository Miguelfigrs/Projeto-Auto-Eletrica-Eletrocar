-- ==============================================================================
-- Esquema de Banco de Dados Relacional - PostgreSQL 16
-- Projeto: Auto Elétrica Eletrocar
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Usuários e Operadores (Admin, Balcão, Eletricistas)
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    pin_caixa VARCHAR(10),
    telegram_user_id VARCHAR(50) UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_telegram ON usuarios(telegram_user_id);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    nome VARCHAR(150) NOT NULL,
    cpf_cnpj VARCHAR(20),
    telefone VARCHAR(30),
    email VARCHAR(150),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);

-- 3. Tabela de Carros (Composição com Cliente)
CREATE TABLE IF NOT EXISTS carros (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    cliente_id VARCHAR(36) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    placa VARCHAR(20),
    ano VARCHAR(10)
);
CREATE INDEX IF NOT EXISTS idx_carros_cliente ON carros(cliente_id);
CREATE INDEX IF NOT EXISTS idx_carros_placa ON carros(placa);
CREATE INDEX IF NOT EXISTS idx_carros_modelo ON carros(modelo);

-- 4. Tabela de Peças e Componentes Elétricos
CREATE TABLE IF NOT EXISTS pecas (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    codigo_barras VARCHAR(60) UNIQUE NOT NULL,
    sku VARCHAR(60) UNIQUE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    preco_custo NUMERIC(10, 2) NOT NULL,
    preco_venda NUMERIC(10, 2) NOT NULL,
    estoque_atual INTEGER NOT NULL DEFAULT 0,
    estoque_minimo INTEGER NOT NULL DEFAULT 2,
    localizacao VARCHAR(100),
    unidade_medida VARCHAR(10) NOT NULL DEFAULT 'UN',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pecas_codigo_barras ON pecas(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_pecas_sku ON pecas(sku);
CREATE INDEX IF NOT EXISTS idx_pecas_descricao ON pecas(descricao);

-- 5. Tabela de Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS ordens_servico (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    numero_os VARCHAR(50) UNIQUE NOT NULL,
    cliente_id VARCHAR(36) NOT NULL REFERENCES clientes(id),
    carro_id VARCHAR(36) NOT NULL REFERENCES carros(id),
    usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id),
    status VARCHAR(40) NOT NULL,
    origem VARCHAR(40) NOT NULL,
    sintomas TEXT,
    hipotese_diagnostica TEXT,
    checklist_eletrico JSONB NOT NULL DEFAULT '{}',
    desconto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_os_numero ON ordens_servico(numero_os);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);

-- 6. Tabela de Itens de Peças alocadas na OS
CREATE TABLE IF NOT EXISTS itens_os (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ordem_servico_id VARCHAR(36) NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    peca_id VARCHAR(36) NOT NULL REFERENCES pecas(id),
    descricao_peca VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_itens_os_ordem ON itens_os(ordem_servico_id);

-- 7. Tabela de Serviços de Mão de Obra na OS
CREATE TABLE IF NOT EXISTS servicos_os (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ordem_servico_id VARCHAR(36) NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    eletricista_responsavel_id VARCHAR(36) REFERENCES usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_servicos_os_ordem ON servicos_os(ordem_servico_id);

-- 8. Tabela de Vendas Rápidas no Balcão (PDV)
CREATE TABLE IF NOT EXISTS vendas_balcao (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    numero_venda VARCHAR(50) UNIQUE NOT NULL,
    operador_id VARCHAR(36) NOT NULL REFERENCES usuarios(id),
    cliente_id VARCHAR(36) REFERENCES clientes(id),
    desconto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    forma_pagamento VARCHAR(40),
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vendas_numero ON vendas_balcao(numero_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_operador ON vendas_balcao(operador_id);

-- 9. Tabela de Itens da Venda no Balcão
CREATE TABLE IF NOT EXISTS itens_venda (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    venda_id VARCHAR(36) NOT NULL REFERENCES vendas_balcao(id) ON DELETE CASCADE,
    peca_id VARCHAR(36) NOT NULL REFERENCES pecas(id),
    descricao_peca VARCHAR(255) NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON itens_venda(venda_id);

-- 10. Tabela de Caixas Diários (Turnos)
CREATE TABLE IF NOT EXISTS caixas_diario (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    operador_id VARCHAR(36) NOT NULL REFERENCES usuarios(id),
    saldo_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL,
    data_abertura TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP WITHOUT TIME ZONE,
    diferenca_fechamento NUMERIC(10, 2),
    totais_informados_fechamento JSONB
);
CREATE INDEX IF NOT EXISTS idx_caixas_status ON caixas_diario(status);

-- 11. Tabela de Movimentações de Caixa (Sangrias, Suprimentos, Entradas)
CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    caixa_id VARCHAR(36) NOT NULL REFERENCES caixas_diario(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    forma_pagamento VARCHAR(30) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mov_caixa ON movimentacoes_caixa(caixa_id);

-- 12. Tabela de Auditoria Imutável
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    usuario_id VARCHAR(36),
    origem VARCHAR(50) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    detalhes JSONB NOT NULL DEFAULT '{}',
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auditoria_acao ON logs_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON logs_auditoria(timestamp);
