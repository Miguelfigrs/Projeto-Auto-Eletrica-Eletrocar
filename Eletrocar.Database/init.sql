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

-- ==============================================================================
-- Carga Inicial de Peças e Componentes Elétricos (Auto Elétrica Eletrocar)
-- ==============================================================================
INSERT INTO pecas (id, codigo_barras, sku, descricao, preco_custo, preco_venda, estoque_atual, estoque_minimo, localizacao, unidade_medida, ativo)
VALUES
    (uuid_generate_v4()::text, '7891049281023', 'REG-BOSCH-12V', 'Regulador de Voltagem Bosch 12V', 110.00, 185.00, 15, 3, 'Prateleira B3', 'UN', true),
    (uuid_generate_v4()::text, '7891234567890', 'ALT-BOSCH-12V', 'Alternador Bosch 12V 90A', 450.00, 680.00, 5, 2, 'Prateleira C3', 'UN', true),
    (uuid_generate_v4()::text, '7892019482014', 'BAT-MOURA-60AH', 'Bateria Automotiva Moura 60Ah M60GD', 340.00, 489.00, 12, 4, 'Setor Baterias A1', 'UN', true),
    (uuid_generate_v4()::text, '7892019482021', 'BAT-HELIAR-70AH', 'Bateria Automotiva Heliar 70Ah EFB Start-Stop', 520.00, 749.00, 8, 3, 'Setor Baterias A2', 'UN', true),
    (uuid_generate_v4()::text, '7893049581028', 'MOT-PART-VALEO', 'Motor de Partida / Arranque Valeo 12V VW Fox/Gol G5', 380.00, 580.00, 6, 2, 'Prateleira C1', 'UN', true),
    (uuid_generate_v4()::text, '7893049581035', 'MOT-PART-DENSO', 'Motor de Partida Denso 12V Toyota Corolla 1.8/2.0', 490.00, 720.00, 4, 2, 'Prateleira C2', 'UN', true),
    (uuid_generate_v4()::text, '7894059681042', 'ALT-VALEO-110A', 'Alternador Valeo 110A Chevrolet Onix / Prisma', 460.00, 690.00, 5, 2, 'Prateleira C3', 'UN', true),
    (uuid_generate_v4()::text, '7894059681059', 'BOB-IGN-BOSCH', 'Bobina de Ignição Bosch 4 Pinos VW EA111 1.0/1.6', 160.00, 250.00, 14, 4, 'Prateleira B1', 'UN', true),
    (uuid_generate_v4()::text, '7895069781066', 'VELAS-NGK-IRID', 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 95.00, 160.00, 20, 5, 'Prateleira B2', 'JG', true),
    (uuid_generate_v4()::text, '7895069781073', 'CAB-VELA-NGK', 'Jogo de Cabos de Vela Resistivos NGK', 70.00, 120.00, 12, 3, 'Prateleira B2', 'JG', true),
    (uuid_generate_v4()::text, '7896079881080', 'RELE-AUX-4P', 'Relé Auxiliar 4 Pinos 12V 40A DNI com Suporte', 12.00, 25.00, 45, 10, 'Gaveteiro E1', 'UN', true),
    (uuid_generate_v4()::text, '7896079881097', 'RELE-PISCA-3P', 'Relé Eletrônico de Pisca 3 Pinos 12V Híbrido LED', 18.00, 38.00, 25, 5, 'Gaveteiro E2', 'UN', true),
    (uuid_generate_v4()::text, '7897089981103', 'FUS-KIT-LAMINA', 'Kit Fusíveis Lâmina Automotivos Sortidos 10A a 30A', 15.00, 32.00, 30, 8, 'Gaveteiro E3', 'KT', true),
    (uuid_generate_v4()::text, '7897089981110', 'FUS-MAXI-50A', 'Maxi Fusível Lâmina 50A Vermelho', 6.00, 14.00, 40, 10, 'Gaveteiro E4', 'UN', true),
    (uuid_generate_v4()::text, '7898090081127', 'LAMP-H4-PHILIPS', 'Lâmpada H4 X-tremeVision Pro150 Philips 12V 60/55W', 45.00, 85.00, 24, 6, 'Vitrine D1', 'UN', true),
    (uuid_generate_v4()::text, '7898090081134', 'LAMP-H7-OSRAM', 'Lâmpada H7 Standard Original Line Osram 12V 55W', 28.00, 55.00, 28, 6, 'Vitrine D2', 'UN', true),
    (uuid_generate_v4()::text, '7898090081141', 'LAMP-PINGO-T10', 'Par de Lâmpadas LED Pingo T10 W5W 6000K', 10.00, 22.00, 50, 12, 'Vitrine D3', 'PAR', true),
    (uuid_generate_v4()::text, '7898090081158', 'LAMP-1034-2POL', 'Lâmpada 2 Polos 12V 21/5W P21/5W Freio e Lanterna', 4.50, 10.00, 60, 15, 'Vitrine D4', 'UN', true),
    (uuid_generate_v4()::text, '7899100181165', 'SOND-LAMB-BOSCH', 'Sonda Lambda Universal Planar Bosch 4 Fios', 190.00, 310.00, 8, 3, 'Prateleira B4', 'UN', true),
    (uuid_generate_v4()::text, '7899100181172', 'POLIA-RODA-ZEN', 'Polia Roda Livre do Alternador Zen 9 Pistas', 130.00, 220.00, 7, 2, 'Prateleira C4', 'UN', true),
    (uuid_generate_v4()::text, '7899100181189', 'BENDIX-VALEO', 'Pinhão / Impulsor de Partida Bendix Valeo 9 Dentes', 65.00, 115.00, 11, 3, 'Prateleira C5', 'UN', true),
    (uuid_generate_v4()::text, '7899100181196', 'TERM-BAT-LATAO', 'Par Terminais de Bateria Latão Reforçado Fundido', 8.00, 18.00, 40, 10, 'Setor Baterias A3', 'PAR', true),
    (uuid_generate_v4()::text, '7899100181202', 'CHV-GERAL-BAT', 'Chave Geral de Bateria Automotiva / Náutica 300A', 55.00, 110.00, 9, 2, 'Setor Baterias A4', 'UN', true),
    (uuid_generate_v4()::text, '7899100181219', 'AUTO-FAL-6POL', 'Par Alto-falantes 6 Polegadas Triaxial Bravox 100W', 90.00, 160.00, 10, 3, 'Vitrine Som V1', 'PAR', true),
    (uuid_generate_v4()::text, '7899100181226', 'SIRENE-1-TOM', 'Sirene de Marcha Ré Bivolt 12V/24V DNI', 25.00, 50.00, 15, 4, 'Vitrine D5', 'UN', true)
ON CONFLICT (codigo_barras) DO NOTHING;

-- 2. CLIENTES (Pessoas Físicas, Motoristas de App e Frotistas)
INSERT INTO clientes (id, nome, cpf_cnpj, telefone, email)
VALUES
    ('cli-0001', 'João Paulo da Silva', '123.456.789-01', '(11) 98765-1122', 'joao.silva@gmail.com'),
    ('cli-0002', 'Maria Fernandes Oliveira', '234.567.890-12', '(11) 97654-2233', 'maria.fernandes@hotmail.com'),
    ('cli-0003', 'Transportadora TransRápido Ltda', '12.345.678/0001-90', '(11) 3456-7890', 'frotas@transrapido.com.br'),
    ('cli-0004', 'Lucas Henrique Santos', '345.678.901-23', '(11) 99123-4455', 'lucas.uber@yahoo.com.br'),
    ('cli-0005', 'Dra. Ana Carolina Mendes', '456.789.012-34', '(11) 98234-5566', 'ana.mendes@clinica.med.br'),
    ('cli-0006', 'Auto Socorro Guinchos 24h', '98.765.432/0001-10', '(11) 3322-1100', 'operacoes@socorro24h.com.br'),
    ('cli-0007', 'Rodrigo Albuquerque Taxista', '567.890.123-45', '(11) 97788-9900', 'rodrigo.taxi@gmail.com'),
    ('cli-0008', 'Camila Duarte Lima', '678.901.234-56', '(11) 96655-4433', 'camila.duarte@empresa.com'),
    ('cli-0009', 'Padaria & Confeitaria Central', '11.223.344/0001-55', '(11) 4567-8901', 'financeiro@padariacentral.com.br'),
    ('cli-0010', 'Fernando Gomes Rocha', '789.012.345-67', '(11) 95544-3322', 'fernando.rocha@outlook.com')
ON CONFLICT (id) DO NOTHING;

-- 3. VEÍCULOS / CARROS (Composição com os Clientes)
INSERT INTO carros (id, cliente_id, modelo, marca, placa, ano)
VALUES
    ('car-0001', 'cli-0001', 'Gol 1.6 MSI TotalFlex', 'Volkswagen', 'BRA2E19', '2020'),
    ('car-0002', 'cli-0002', 'HB20 1.0 Evolution', 'Hyundai', 'RIO1A23', '2022'),
    ('car-0003', 'cli-0003', 'Sprinter 415 CDI Furgão', 'Mercedes-Benz', 'SPX9F88', '2019'),
    ('car-0004', 'cli-0003', 'Transit 2.2 TDCi 350L', 'Ford', 'SPX3B45', '2021'),
    ('car-0005', 'cli-0004', 'Onix Plus 1.0 Turbo Premier', 'Chevrolet', 'MOB8C77', '2023'),
    ('car-0006', 'cli-0005', 'Renegade 1.8 Longitude Flex', 'Jeep', 'JEP4D56', '2021'),
    ('car-0007', 'cli-0006', 'Daily 35S14 Plataforma Guincho', 'Iveco', 'GCH7A90', '2018'),
    ('car-0008', 'cli-0007', 'Cronos 1.3 Drive Flex', 'Fiat', 'TAX5E66', '2022'),
    ('car-0009', 'cli-0008', 'Corolla 2.0 XEi DirectShift', 'Toyota', 'COR9H12', '2020'),
    ('car-0010', 'cli-0009', 'Master 2.3 dCi Extra Furgão', 'Renault', 'PAD2G33', '2020'),
    ('car-0011', 'cli-0010', 'Strada 1.4 Hard Working Cabine Simples', 'Fiat', 'STR6K44', '2019')
ON CONFLICT (id) DO NOTHING;

-- 4. CAIXAS DIÁRIOS
INSERT INTO caixas_diario (id, operador_id, saldo_inicial, status, data_abertura, data_fechamento, diferenca_fechamento, totais_informados_fechamento)
VALUES
    ('caixa-0001', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 250.00, 'FECHADO', '2026-10-07 08:00:00', '2026-10-07 18:00:00', 0.00, '{"dinheiro": 1250.00, "pix": 2180.00, "cartao_debito": 680.00, "cartao_credito": 1450.00}'),
    ('caixa-0002', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 300.00, 'FECHADO', '2026-10-08 08:00:00', '2026-10-08 18:05:00', -5.00, '{"dinheiro": 985.00, "pix": 1890.00, "cartao_debito": 420.00, "cartao_credito": 1100.00}'),
    ('caixa-0003', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 300.00, 'ABERTO', '2026-10-09 08:00:00', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 5. MOVIMENTAÇÕES DE CAIXA
INSERT INTO movimentacoes_caixa (id, caixa_id, tipo, valor, forma_pagamento, descricao, created_at)
VALUES
    ('mov-0001', 'caixa-0003', 'SUPRIMENTO', 300.00, 'DINHEIRO', 'Fundo de troco para abertura de caixa', '2026-10-09 08:00:05'),
    ('mov-0002', 'caixa-0003', 'ENTRADA_VENDA', 489.00, 'PIX', 'Venda Balcão VB-2026-0001 (Bateria Moura 60Ah)', '2026-10-09 09:15:30'),
    ('mov-0003', 'caixa-0003', 'ENTRADA_VENDA', 87.00, 'DINHEIRO', 'Venda Balcão VB-2026-0002 (Fusíveis + Lâmpadas)', '2026-10-09 10:20:12'),
    ('mov-0004', 'caixa-0003', 'ENTRADA_OS', 1369.00, 'PIX', 'Recebimento Conclusão OS-2026-0001 (VW Gol)', '2026-10-09 11:45:00'),
    ('mov-0005', 'caixa-0003', 'SANGRIA', 400.00, 'DINHEIRO', 'Sangria de segurança para cofre da administração', '2026-10-09 12:30:00')
ON CONFLICT (id) DO NOTHING;

-- 6. ORDENS DE SERVIÇO (Cobrem todos os fluxos e status do negócio)
INSERT INTO ordens_servico (id, numero_os, cliente_id, carro_id, usuario_id, status, origem, sintomas, hipotese_diagnostica, checklist_eletrico, desconto, observacoes, created_at)
VALUES
    ('os-0001', 'OS-2026-0001', 'cli-0001', 'car-0001', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'ENTREGUE', 'BALCAO', 
     'Veículo apagou na avenida e luz da bateria acendeu no painel antes de falhar.', 
     'Alternador não está gerando carga (regulador em curto) e descarregou totalmente a bateria.', 
     '{"tensao_bateria": "10.2V", "carga_alternador": "11.1V", "motor_partida": "PESADO", "fuga_corrente_ma": 45}', 
     0.00, 'Serviço executado e testado. Veículo entregue ao proprietário com garantia de 1 ano na bateria.', '2026-10-07 08:30:00'),

    ('os-0002', 'OS-2026-0002', 'cli-0004', 'car-0005', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'FINALIZADO', 'BALCAO', 
     'Motor falhando em subidas, engasgando e luz de injeção piscando no painel.', 
     'Bobina de ignição com fuga de faísca no cilindro 3 e velas desgastadas.', 
     '{"tensao_bateria": "12.6V", "carga_alternador": "14.2V", "motor_partida": "OK", "fuga_corrente_ma": 22}', 
     20.00, 'Troca da bobina e do jogo de velas Iridium concluída com sucesso. Testado no scanner sem erros.', '2026-10-08 09:10:00'),

    ('os-0003', 'OS-2026-0003', 'cli-0003', 'car-0003', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1), 'EM_EXECUCAO', 'BALCAO', 
     'Sprinter não dá partida no primeiro giro da manhã; motor de arranque estala mas não vira.', 
     'Automático e escovas do motor de partida desgastados; fiação com oxidação.', 
     '{"tensao_bateria": "12.4V", "carga_alternador": "13.9V", "motor_partida": "DEFEITO", "fuga_corrente_ma": 30}', 
     0.00, 'Motor de partida na bancada para revisão completa e troca de bendix/escovas.', '2026-10-09 08:45:00'),

    ('os-0004', 'OS-2026-0004', 'cli-0008', 'car-0009', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1), 'APROVADO', 'BALCAO', 
     'Corolla não liga quando o motor esquenta; após esfriar pega normal.', 
     'Motor de partida Denso travando buchas por dilatação térmica.', 
     '{"tensao_bateria": "12.7V", "carga_alternador": "14.1V", "motor_partida": "TRAVAMENTO", "fuga_corrente_ma": 18}', 
     0.00, 'Orçamento aprovado via WhatsApp pelo cliente. Aguardando entrada no elevador.', '2026-10-09 09:30:00'),

    ('os-0005', 'OS-2026-0005', 'cli-0007', 'car-0008', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1), 'TESTES_ELETRICOS', 'BALCAO', 
     'Farol baixo queimando com frequência e luzes do painel oscilando com aceleração.', 
     'Picos de tensão provenientes do regulador do alternador ultrapassando 15.5V.', 
     '{"tensao_bateria": "12.5V", "carga_alternador": "15.8V", "motor_partida": "OK", "fuga_corrente_ma": 25}', 
     15.00, 'Regulador substituído. Executando teste de carga com osciloscópio por 30 minutos.', '2026-10-09 10:15:00'),

    ('os-0006', 'OS-2026-0006', 'cli-0005', 'car-0006', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1), 'ORCAMENTO_PENDENTE', 'TELEGRAM_VOICE', 
     'Abertura por voz Telegram: Doutora Ana relata que o Jeep não ligou na garagem após 3 dias parado.', 
     'Bateria original descarregada por fim de vida útil ou módulo não entrando em modo sleep.', 
     '{"tensao_bateria": "9.8V", "carga_alternador": "TESTAR", "motor_partida": "TESTAR", "fuga_corrente_ma": 120}', 
     0.00, 'Bateria Heliar 70Ah Start-Stop recomendada. Aguardando retorno do orçamento.', '2026-10-09 11:00:00'),

    ('os-0007', 'OS-2026-0007', 'cli-0006', 'car-0007', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1), 'TRIAGEM', 'TELEGRAM_VOICE', 
     'Abertura por voz Telegram: Guincho relata que a sirene de ré e o giroflex da plataforma pararam de funcionar.', 
     'Suspeita de fusível rompido ou relé auxiliar travado devido a curto na fiação traseira.', 
     '{"tensao_bateria": "12.5V", "carga_alternador": "14.0V", "motor_partida": "OK", "fuga_corrente_ma": 0}', 
     0.00, 'Veículo deu entrada no pátio da oficina. Eletricista irá iniciar triagem elétrica.', '2026-10-09 11:40:00'),

    ('os-0008', 'OS-2026-0008', 'cli-0009', 'car-0010', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1), 'AGUARDANDO_PECA', 'BALCAO', 
     'Furgão da padaria falha na partida e fumaça preta com cheiro forte de combustível.', 
     'Sonda lambda travada em mistura rica e falha intermitente na bomba de combustível.', 
     '{"tensao_bateria": "12.3V", "carga_alternador": "13.8V", "motor_partida": "OK", "fuga_corrente_ma": 35}', 
     0.00, 'Sonda Lambda Bosch requisitada no fornecedor. Previsão de chegada às 15h.', '2026-10-09 12:00:00')
ON CONFLICT (id) DO NOTHING;

-- 7. PEÇAS ALOCADAS NAS ORDENS DE SERVIÇO (itens_os)
INSERT INTO itens_os (id, ordem_servico_id, peca_id, descricao_peca, quantidade, preco_unitario)
VALUES
    ('ios-0001', 'os-0001', (SELECT id FROM pecas WHERE codigo_barras = '7892019482014' LIMIT 1), 'Bateria Automotiva Moura 60Ah M60GD', 1, 489.00),
    ('ios-0002', 'os-0001', (SELECT id FROM pecas WHERE codigo_barras = '7891049281023' LIMIT 1), 'Regulador de Voltagem Bosch 12V', 1, 185.00),
    ('ios-0003', 'os-0001', (SELECT id FROM pecas WHERE codigo_barras = '7899100181196' LIMIT 1), 'Par Terminais de Bateria Latão Reforçado Fundido', 1, 18.00),

    ('ios-0004', 'os-0002', (SELECT id FROM pecas WHERE codigo_barras = '7894059681059' LIMIT 1), 'Bobina de Ignição Bosch 4 Pinos VW EA111 1.0/1.6', 1, 250.00),
    ('ios-0005', 'os-0002', (SELECT id FROM pecas WHERE codigo_barras = '7895069781066' LIMIT 1), 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 1, 160.00),
    ('ios-0006', 'os-0002', (SELECT id FROM pecas WHERE codigo_barras = '7895069781073' LIMIT 1), 'Jogo de Cabos de Vela Resistivos NGK', 1, 120.00),

    ('ios-0007', 'os-0003', (SELECT id FROM pecas WHERE codigo_barras = '7899100181189' LIMIT 1), 'Pinhão / Impulsor de Partida Bendix Valeo 9 Dentes', 1, 115.00),

    ('ios-0008', 'os-0004', (SELECT id FROM pecas WHERE codigo_barras = '7893049581035' LIMIT 1), 'Motor de Partida Denso 12V Toyota Corolla 1.8/2.0', 1, 720.00),

    ('ios-0009', 'os-0005', (SELECT id FROM pecas WHERE codigo_barras = '7891049281023' LIMIT 1), 'Regulador de Voltagem Bosch 12V', 1, 185.00),
    ('ios-0010', 'os-0005', (SELECT id FROM pecas WHERE codigo_barras = '7898090081134' LIMIT 1), 'Lâmpada H7 Standard Original Line Osram 12V 55W', 2, 55.00)
ON CONFLICT (id) DO NOTHING;

-- 8. SERVIÇOS DE MÃO DE OBRA NAS ORDENS DE SERVIÇO (servicos_os)
INSERT INTO servicos_os (id, ordem_servico_id, descricao, valor, eletricista_responsavel_id)
VALUES
    ('sos-0001', 'os-0001', 'Desmontagem, reparo de bancada e instalação de alternador', 350.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1)),
    ('sos-0002', 'os-0001', 'Instalação de bateria e teste de sistema de carga e partida', 80.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1)),

    ('sos-0003', 'os-0002', 'Diagnóstico eletrônico via Scanner e substituição do sistema de ignição', 220.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1)),

    ('sos-0004', 'os-0003', 'Revisão geral do motor de partida de veículo comercial Sprinter', 380.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1)),

    ('sos-0005', 'os-0004', 'Substituição e calibração de motor de arranque Corolla', 280.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1)),

    ('sos-0006', 'os-0005', 'Diagnóstico com osciloscópio, troca de regulador e alinhamento de faróis', 240.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- 9. VENDAS RÁPIDAS NO BALCÃO (vendas_balcao)
INSERT INTO vendas_balcao (id, numero_venda, operador_id, cliente_id, desconto, forma_pagamento, status, created_at)
VALUES
    ('vb-0001', 'VB-2026-0001', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'cli-0001', 0.00, 'PIX', 'CONCLUIDA', '2026-10-09 09:15:00'),
    ('vb-0002', 'VB-2026-0002', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), NULL, 0.00, 'DINHEIRO', 'CONCLUIDA', '2026-10-09 10:20:00'),
    ('vb-0003', 'VB-2026-0003', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'cli-0004', 10.00, 'CARTAO_CREDITO', 'CONCLUIDA', '2026-10-09 11:05:00'),
    ('vb-0004', 'VB-2026-0004', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'cli-0007', 0.00, 'CARTAO_DEBITO', 'CONCLUIDA', '2026-10-09 11:50:00'),
    ('vb-0005', 'VB-2026-0005', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'cli-0006', 0.00, 'PIX', 'CONCLUIDA', '2026-10-09 12:15:00'),
    ('vb-0006', 'VB-2026-0006', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), NULL, 0.00, 'DINHEIRO', 'CONCLUIDA', '2026-10-09 12:45:00')
ON CONFLICT (id) DO NOTHING;

-- 10. ITENS DAS VENDAS NO BALCÃO (itens_venda)
INSERT INTO itens_venda (id, venda_id, peca_id, descricao_peca, quantidade, preco_unitario)
VALUES
    ('iv-0001', 'vb-0001', (SELECT id FROM pecas WHERE codigo_barras = '7892019482014' LIMIT 1), 'Bateria Automotiva Moura 60Ah M60GD', 1, 489.00),

    ('iv-0002', 'vb-0002', (SELECT id FROM pecas WHERE codigo_barras = '7897089981103' LIMIT 1), 'Kit Fusíveis Lâmina Automotivos Sortidos 10A a 30A', 1, 32.00),
    ('iv-0003', 'vb-0002', (SELECT id FROM pecas WHERE codigo_barras = '7898090081134' LIMIT 1), 'Lâmpada H7 Standard Original Line Osram 12V 55W', 1, 55.00),

    ('iv-0004', 'vb-0003', (SELECT id FROM pecas WHERE codigo_barras = '7895069781066' LIMIT 1), 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 1, 160.00),
    ('iv-0005', 'vb-0003', (SELECT id FROM pecas WHERE codigo_barras = '7895069781073' LIMIT 1), 'Jogo de Cabos de Vela Resistivos NGK', 1, 120.00),

    ('iv-0006', 'vb-0004', (SELECT id FROM pecas WHERE codigo_barras = '7896079881080' LIMIT 1), 'Relé Auxiliar 4 Pinos 12V 40A DNI com Suporte', 2, 25.00),
    ('iv-0007', 'vb-0004', (SELECT id FROM pecas WHERE codigo_barras = '7899100181196' LIMIT 1), 'Par Terminais de Bateria Latão Reforçado Fundido', 1, 18.00),

    ('iv-0008', 'vb-0005', (SELECT id FROM pecas WHERE codigo_barras = '7899100181226' LIMIT 1), 'Sirene de Marcha Ré Bivolt 12V/24V DNI', 1, 50.00),
    ('iv-0009', 'vb-0005', (SELECT id FROM pecas WHERE codigo_barras = '7899100181202' LIMIT 1), 'Chave Geral de Bateria Automotiva / Náutica 300A', 1, 110.00),

    ('iv-0010', 'vb-0006', (SELECT id FROM pecas WHERE codigo_barras = '7898090081141' LIMIT 1), 'Par de Lâmpadas LED Pingo T10 W5W 6000K', 1, 22.00)
ON CONFLICT (id) DO NOTHING;

-- 11. LOGS DE AUDITORIA (Rastreabilidade e Segurança)
INSERT INTO logs_auditoria (id, usuario_id, origem, acao, detalhes, ip_address, timestamp)
VALUES
    ('log-0001', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'WEB_PAINEL', 'SISTEMA_INICIALIZADO', '{"ambiente": "producao_docker", "versao": "1.0.0"}', '127.0.0.1', '2026-10-09 08:00:00'),
    ('log-0002', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'PDV_BALCAO', 'ABERTURA_CAIXA', '{"caixa_id": "caixa-0003", "saldo_inicial": 300.00}', '192.168.1.10', '2026-10-09 08:00:05'),
    ('log-0003', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'ORDEM_SERVICO', 'ENTREGA_VEICULO', '{"numero_os": "OS-2026-0001", "valor_total": 1369.00}', '192.168.1.10', '2026-10-09 11:45:00'),
    ('log-0004', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br' LIMIT 1), 'TELEGRAM_BOT', 'ABERTURA_OS_VOZ', '{"audio_duracao_seg": 14, "numero_os": "OS-2026-0006"}', '149.154.167.220', '2026-10-09 11:00:00'),
    ('log-0005', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br' LIMIT 1), 'PDV_BALCAO', 'SANGRIA_CAIXA', '{"caixa_id": "caixa-0003", "valor": 400.00, "motivo": "segurança"}', '192.168.1.10', '2026-10-09 12:30:00')
ON CONFLICT (id) DO NOTHING;


