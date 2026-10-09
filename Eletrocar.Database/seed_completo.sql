-- ==============================================================================
-- Carga de Dados Completa e Relacional - Auto Elétrica Eletrocar
-- ==============================================================================

-- 1. USUÁRIOS & OPERADORES (Equipe da Oficina)
INSERT INTO usuarios (id, nome, email, senha_hash, role, pin_caixa, telegram_user_id, ativo)
VALUES
    ('u-admin-0001', 'Administrador Eletrocar', 'admin@eletrocar.com.br', '$2b$12$lMZV4ZiQ8ZMEHwoRp9SkquiV0ZuXqBqqasJEkQyjAHcweegcvSUh2', 'ADMIN', '1234', '100000001', true),
    ('u-eletricista-0001', 'Márcio Eletricista', 'marcio@eletrocar.com.br', '$2b$12$lMZV4ZiQ8ZMEHwoRp9SkquiV0ZuXqBqqasJEkQyjAHcweegcvSUh2', 'ELETRICISTA', '4321', '987654321', true),
    ('u-eletricista-0002', 'Roberto Sênior Eletro', 'roberto@eletrocar.com.br', '$2b$12$lMZV4ZiQ8ZMEHwoRp9SkquiV0ZuXqBqqasJEkQyjAHcweegcvSUh2', 'ELETRICISTA', '5566', '987654322', true),
    ('u-balcao-0001', 'Carlos Atendente Balcão', 'carlos.balcao@eletrocar.com.br', '$2b$12$lMZV4ZiQ8ZMEHwoRp9SkquiV0ZuXqBqqasJEkQyjAHcweegcvSUh2', 'BALCAO', '1122', NULL, true),
    ('u-balcao-0002', 'Juliana Vendas e Caixa', 'juliana@eletrocar.com.br', '$2b$12$lMZV4ZiQ8ZMEHwoRp9SkquiV0ZuXqBqqasJEkQyjAHcweegcvSUh2', 'BALCAO', '3344', NULL, true)
ON CONFLICT (email) DO NOTHING;

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
    ('caixa-0001', (SELECT id FROM usuarios WHERE email = 'carlos.balcao@eletrocar.com.br'), 250.00, 'FECHADO', '2026-10-07 08:00:00', '2026-10-07 18:00:00', 0.00, '{"dinheiro": 1250.00, "pix": 2180.00, "cartao_debito": 680.00, "cartao_credito": 1450.00}'),
    ('caixa-0002', (SELECT id FROM usuarios WHERE email = 'juliana@eletrocar.com.br'), 300.00, 'FECHADO', '2026-10-08 08:00:00', '2026-10-08 18:05:00', -5.00, '{"dinheiro": 985.00, "pix": 1890.00, "cartao_debito": 420.00, "cartao_credito": 1100.00}'),
    ('caixa-0003', (SELECT id FROM usuarios WHERE email = 'carlos.balcao@eletrocar.com.br'), 300.00, 'ABERTO', '2026-10-09 08:00:00', NULL, NULL, NULL)
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
    ('os-0001', 'OS-2026-0001', 'cli-0001', 'car-0001', (SELECT id FROM usuarios WHERE email = 'carlos.balcao@eletrocar.com.br'), 'ENTREGUE', 'BALCAO', 
     'Veículo apagou na avenida e luz da bateria acendeu no painel antes de falhar.', 
     'Alternador não está gerando carga (regulador em curto) e descarregou totalmente a bateria.', 
     '{"tensao_bateria": "10.2V", "carga_alternador": "11.1V", "motor_partida": "PESADO", "fuga_corrente_ma": 45}', 
     0.00, 'Serviço executado e testado. Veículo entregue ao proprietário com garantia de 1 ano na bateria.', '2026-10-07 08:30:00'),

    ('os-0002', 'OS-2026-0002', 'cli-0004', 'car-0005', (SELECT id FROM usuarios WHERE email = 'juliana@eletrocar.com.br'), 'FINALIZADO', 'BALCAO', 
     'Motor falhando em subidas, engasgando e luz de injeção piscando no painel.', 
     'Bobina de ignição com fuga de faísca no cilindro 3 e velas desgastadas.', 
     '{"tensao_bateria": "12.6V", "carga_alternador": "14.2V", "motor_partida": "OK", "fuga_corrente_ma": 22}', 
     20.00, 'Troca da bobina e do jogo de velas Iridium concluída com sucesso. Testado no scanner sem erros.', '2026-10-08 09:10:00'),

    ('os-0003', 'OS-2026-0003', 'cli-0003', 'car-0003', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br'), 'EM_EXECUCAO', 'BALCAO', 
     'Sprinter não dá partida no primeiro giro da manhã; motor de arranque estala mas não vira.', 
     'Automático e escovas do motor de partida desgastados; fiação com oxidação.', 
     '{"tensao_bateria": "12.4V", "carga_alternador": "13.9V", "motor_partida": "DEFEITO", "fuga_corrente_ma": 30}', 
     0.00, 'Motor de partida na bancada para revisão completa e troca de bendix/escovas.', '2026-10-09 08:45:00'),

    ('os-0004', 'OS-2026-0004', 'cli-0008', 'car-0009', (SELECT id FROM usuarios WHERE email = 'roberto@eletrocar.com.br'), 'APROVADO', 'BALCAO', 
     'Corolla não liga quando o motor esquenta; após esfriar pega normal.', 
     'Motor de partida Denso travando buchas por dilatação térmica.', 
     '{"tensao_bateria": "12.7V", "carga_alternador": "14.1V", "motor_partida": "TRAVAMENTO", "fuga_corrente_ma": 18}', 
     0.00, 'Orçamento aprovado via WhatsApp pelo cliente. Aguardando entrada no elevador.', '2026-10-09 09:30:00'),

    ('os-0005', 'OS-2026-0005', 'cli-0007', 'car-0008', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br'), 'TESTES_ELETRICOS', 'BALCAO', 
     'Farol baixo queimando com frequência e luzes do painel oscilando com aceleração.', 
     'Picos de tensão provenientes do regulador do alternador ultrapassando 15.5V.', 
     '{"tensao_bateria": "12.5V", "carga_alternador": "15.8V", "motor_partida": "OK", "fuga_corrente_ma": 25}', 
     15.00, 'Regulador substituído. Executando teste de carga com osciloscópio por 30 minutos.', '2026-10-09 10:15:00'),

    ('os-0006', 'OS-2026-0006', 'cli-0005', 'car-0006', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br'), 'ORCAMENTO_PENDENTE', 'TELEGRAM_VOICE', 
     'Abertura por voz Telegram: Doutora Ana relata que o Jeep não ligou na garagem após 3 dias parado.', 
     'Bateria original descarregada por fim de vida útil ou módulo não entrando em modo sleep.', 
     '{"tensao_bateria": "9.8V", "carga_alternador": "TESTAR", "motor_partida": "TESTAR", "fuga_corrente_ma": 120}', 
     0.00, 'Bateria Heliar 70Ah Start-Stop recomendada. Aguardando retorno do orçamento.', '2026-10-09 11:00:00'),

    ('os-0007', 'OS-2026-0007', 'cli-0006', 'car-0007', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br'), 'TRIAGEM', 'TELEGRAM_VOICE', 
     'Abertura por voz Telegram: Guincho relata que a sirene de ré e o giroflex da plataforma pararam de funcionar.', 
     'Suspeita de fusível rompido ou relé auxiliar travado devido a curto na fiação traseira.', 
     '{"tensao_bateria": "12.5V", "carga_alternador": "14.0V", "motor_partida": "OK", "fuga_corrente_ma": 0}', 
     0.00, 'Veículo deu entrada no pátio da oficina. Eletricista irá iniciar triagem elétrica.', '2026-10-09 11:40:00'),

    ('os-0008', 'OS-2026-0008', 'cli-0009', 'car-0010', (SELECT id FROM usuarios WHERE email = 'juliana@eletrocar.com.br'), 'AGUARDANDO_PECA', 'BALCAO', 
     'Furgão da padaria falha na partida e fumaça preta com cheiro forte de combustível.', 
     'Sonda lambda travada em mistura rica e falha intermitente na bomba de combustível.', 
     '{"tensao_bateria": "12.3V", "carga_alternador": "13.8V", "motor_partida": "OK", "fuga_corrente_ma": 35}', 
     0.00, 'Sonda Lambda Bosch requisitada no fornecedor. Previsão de chegada às 15h.', '2026-10-09 12:00:00')
ON CONFLICT (id) DO NOTHING;

-- 7. PEÇAS ALOCADAS NAS ORDENS DE SERVIÇO (itens_os)
INSERT INTO itens_os (id, ordem_servico_id, peca_id, descricao_peca, quantidade, preco_unitario)
VALUES
    -- OS 1 (Gol: Bateria + Regulador + Terminais)
    ('ios-0001', 'os-0001', (SELECT id FROM pecas WHERE codigo_barras = '7892019482014'), 'Bateria Automotiva Moura 60Ah M60GD', 1, 489.00),
    ('ios-0002', 'os-0001', (SELECT id FROM pecas WHERE codigo_barras = '7891049281023'), 'Regulador de Voltagem Bosch 12V', 1, 185.00),
    ('ios-0003', 'os-0001', (SELECT id FROM pecas WHERE codigo_barras = '7899100181196'), 'Par Terminais de Bateria Latão Reforçado Fundido', 1, 18.00),

    -- OS 2 (Onix: Bobina + Velas + Cabos)
    ('ios-0004', 'os-0002', (SELECT id FROM pecas WHERE codigo_barras = '7894059681059'), 'Bobina de Ignição Bosch 4 Pinos VW EA111 1.0/1.6', 1, 250.00),
    ('ios-0005', 'os-0002', (SELECT id FROM pecas WHERE codigo_barras = '7895069781066'), 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 1, 160.00),
    ('ios-0006', 'os-0002', (SELECT id FROM pecas WHERE codigo_barras = '7895069781073'), 'Jogo de Cabos de Vela Resistivos NGK', 1, 120.00),

    -- OS 3 (Sprinter: Bendix)
    ('ios-0007', 'os-0003', (SELECT id FROM pecas WHERE codigo_barras = '7899100181189'), 'Pinhão / Impulsor de Partida Bendix Valeo 9 Dentes', 1, 115.00),

    -- OS 4 (Corolla: Motor de Partida Denso)
    ('ios-0008', 'os-0004', (SELECT id FROM pecas WHERE codigo_barras = '7893049581035'), 'Motor de Partida Denso 12V Toyota Corolla 1.8/2.0', 1, 720.00),

    -- OS 5 (Cronos: Regulador + Lâmpadas H7)
    ('ios-0009', 'os-0005', (SELECT id FROM pecas WHERE codigo_barras = '7891049281023'), 'Regulador de Voltagem Bosch 12V', 1, 185.00),
    ('ios-0010', 'os-0005', (SELECT id FROM pecas WHERE codigo_barras = '7898090081134'), 'Lâmpada H7 Standard Original Line Osram 12V 55W', 2, 55.00)
ON CONFLICT (id) DO NOTHING;

-- 8. SERVIÇOS DE MÃO DE OBRA NAS ORDENS DE SERVIÇO (servicos_os)
INSERT INTO servicos_os (id, ordem_servico_id, descricao, valor, eletricista_responsavel_id)
VALUES
    -- OS 1
    ('sos-0001', 'os-0001', 'Desmontagem, reparo de bancada e instalação de alternador', 350.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br')),
    ('sos-0002', 'os-0001', 'Instalação de bateria e teste de sistema de carga e partida', 80.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br')),

    -- OS 2
    ('sos-0003', 'os-0002', 'Diagnóstico eletrônico via Scanner e substituição do sistema de ignição', 220.00, (SELECT id FROM usuarios WHERE email = 'roberto@eletrocar.com.br')),

    -- OS 3
    ('sos-0004', 'os-0003', 'Revisão geral do motor de partida de veículo comercial Sprinter', 380.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br')),

    -- OS 4
    ('sos-0005', 'os-0004', 'Substituição e calibração de motor de arranque Corolla', 280.00, (SELECT id FROM usuarios WHERE email = 'roberto@eletrocar.com.br')),

    -- OS 5
    ('sos-0006', 'os-0005', 'Diagnóstico com osciloscópio, troca de regulador e alinhamento de faróis', 240.00, (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br'))
ON CONFLICT (id) DO NOTHING;

-- 9. ITENS DAS VENDAS NO BALCÃO (itens_venda)
INSERT INTO itens_venda (id, venda_id, peca_id, descricao_peca, quantidade, preco_unitario)
VALUES
    -- VB 1: Bateria Moura 60Ah
    ('iv-0001', 'vb-0001', (SELECT id FROM pecas WHERE codigo_barras = '7892019482014'), 'Bateria Automotiva Moura 60Ah M60GD', 1, 489.00),

    -- VB 2: Fusíveis + Lâmpada H7
    ('iv-0002', 'vb-0002', (SELECT id FROM pecas WHERE codigo_barras = '7897089981103'), 'Kit Fusíveis Lâmina Automotivos Sortidos 10A a 30A', 1, 32.00),
    ('iv-0003', 'vb-0002', (SELECT id FROM pecas WHERE codigo_barras = '7898090081134'), 'Lâmpada H7 Standard Original Line Osram 12V 55W', 1, 55.00),

    -- VB 3: Velas Iridium + Cabos
    ('iv-0004', 'vb-0003', (SELECT id FROM pecas WHERE codigo_barras = '7895069781066'), 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 1, 160.00),
    ('iv-0005', 'vb-0003', (SELECT id FROM pecas WHERE codigo_barras = '7895069781073'), 'Jogo de Cabos de Vela Resistivos NGK', 1, 120.00),

    -- VB 4: Relé Auxiliar + Terminais de Latão
    ('iv-0006', 'vb-0004', (SELECT id FROM pecas WHERE codigo_barras = '7896079881080'), 'Relé Auxiliar 4 Pinos 12V 40A DNI com Suporte', 2, 25.00),
    ('iv-0007', 'vb-0004', (SELECT id FROM pecas WHERE codigo_barras = '7899100181196'), 'Par Terminais de Bateria Latão Reforçado Fundido', 1, 18.00),

    -- VB 5: Sirene de Ré Bivolt + Chave Geral
    ('iv-0008', 'vb-0005', (SELECT id FROM pecas WHERE codigo_barras = '7899100181226'), 'Sirene de Marcha Ré Bivolt 12V/24V DNI', 1, 50.00),
    ('iv-0009', 'vb-0005', (SELECT id FROM pecas WHERE codigo_barras = '7899100181202'), 'Chave Geral de Bateria Automotiva / Náutica 300A', 1, 110.00),

    -- VB 6: Par de Lâmpadas LED Pingo
    ('iv-0010', 'vb-0006', (SELECT id FROM pecas WHERE codigo_barras = '7898090081141'), 'Par de Lâmpadas LED Pingo T10 W5W 6000K', 1, 22.00)
ON CONFLICT (id) DO NOTHING;

-- 10. LOGS DE AUDITORIA (Rastreabilidade e Segurança)
INSERT INTO logs_auditoria (id, usuario_id, origem, acao, detalhes, ip_address, timestamp)
VALUES
    ('log-0001', (SELECT id FROM usuarios WHERE email = 'admin@eletrocar.com.br'), 'WEB_PAINEL', 'SISTEMA_INICIALIZADO', '{"ambiente": "producao_docker", "versao": "1.0.0"}', '127.0.0.1', '2026-10-09 08:00:00'),
    ('log-0002', (SELECT id FROM usuarios WHERE email = 'carlos.balcao@eletrocar.com.br'), 'PDV_BALCAO', 'ABERTURA_CAIXA', '{"caixa_id": "caixa-0003", "saldo_inicial": 300.00}', '192.168.1.10', '2026-10-09 08:00:05'),
    ('log-0003', (SELECT id FROM usuarios WHERE email = 'carlos.balcao@eletrocar.com.br'), 'ORDEM_SERVICO', 'ENTREGA_VEICULO', '{"numero_os": "OS-2026-0001", "valor_total": 1369.00}', '192.168.1.10', '2026-10-09 11:45:00'),
    ('log-0004', (SELECT id FROM usuarios WHERE email = 'marcio@eletrocar.com.br'), 'TELEGRAM_BOT', 'ABERTURA_OS_VOZ', '{"audio_duracao_seg": 14, "numero_os": "OS-2026-0006"}', '149.154.167.220', '2026-10-09 11:00:00'),
    ('log-0005', (SELECT id FROM usuarios WHERE email = 'carlos.balcao@eletrocar.com.br'), 'PDV_BALCAO', 'SANGRIA_CAIXA', '{"caixa_id": "caixa-0003", "valor": 400.00, "motivo": "segurança"}', '192.168.1.10', '2026-10-09 12:30:00')
ON CONFLICT (id) DO NOTHING;
