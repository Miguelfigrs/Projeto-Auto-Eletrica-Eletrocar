-- ==============================================================================
-- Carga de dados de DEMONSTRAÇÃO - Auto Elétrica Eletrocar (PostgreSQL 16)
-- Aplicada automaticamente pela API quando SEED_DADOS_DEMO=true e o banco não tem usuários.
-- NUNCA habilitar em produção (a API recusa SEED_DADOS_DEMO com AMBIENTE=producao).
--
-- Logins de desenvolvimento (usuário / senha / PIN):
--   admin   / admin123   / 1234  -> Dono multi-perfil (ADMIN + BALCONISTA + ELETRICISTA)
--   marcio  / marcio123  / 4321  -> Eletricista (Telegram 987654321)
--   roberto / roberto123 / 5566  -> Eletricista (Telegram 987654322)
--   carlos  / carlos123  / 1122  -> Balconista
--   juliana / juliana123 / 3344  -> Balconista + Eletricista
-- ==============================================================================

-- 1. USUÁRIOS (senhas e PINs em hash bcrypt gerado pelo pgcrypto)
INSERT INTO usuarios (id, nome, email, username, senha_hash, pin_hash, telegram_user_id, ativo, created_at) VALUES
    ('a0000000-0000-4000-8000-000000000001', 'Administrador Eletrocar (Dono)', 'admin@eletrocar.com.br', 'admin',
     crypt('admin123', gen_salt('bf', 12)), crypt('1234', gen_salt('bf', 12)), '100000001', true, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000002', 'Márcio Eletricista', 'marcio@eletrocar.com.br', 'marcio',
     crypt('marcio123', gen_salt('bf', 12)), crypt('4321', gen_salt('bf', 12)), '987654321', true, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000003', 'Roberto Sênior Eletro', 'roberto@eletrocar.com.br', 'roberto',
     crypt('roberto123', gen_salt('bf', 12)), crypt('5566', gen_salt('bf', 12)), '987654322', true, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000004', 'Carlos Atendente Balcão', 'carlos.balcao@eletrocar.com.br', 'carlos',
     crypt('carlos123', gen_salt('bf', 12)), crypt('1122', gen_salt('bf', 12)), NULL, true, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000005', 'Juliana Vendas e Caixa', 'juliana@eletrocar.com.br', 'juliana',
     crypt('juliana123', gen_salt('bf', 12)), crypt('3344', gen_salt('bf', 12)), NULL, true, '2026-10-01 08:00:00');

-- 2. PAPÉIS DE CADA USUÁRIO (N:N) - 1 ADMIN, 2 BALCONISTA, 3 ELETRICISTA
INSERT INTO usuarios_papeis (usuario_id, papel_id, atribuido_em) VALUES
    ('a0000000-0000-4000-8000-000000000001', 1, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000001', 2, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000001', 3, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000002', 3, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000003', 3, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000004', 2, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000005', 2, '2026-10-01 08:00:00'),
    ('a0000000-0000-4000-8000-000000000005', 3, '2026-10-01 08:00:00');

-- 3. PEÇAS E COMPONENTES ELÉTRICOS (código de barras, SKU, código original e aplicação veicular)
INSERT INTO pecas (id, codigo_barras, sku, codigo_original_fabricante, fabricante, aplicacao_veicular, descricao,
                   preco_custo, preco_venda, estoque_atual, estoque_reservado, estoque_minimo, localizacao,
                   unidade_medida, ativo, versao, created_at) VALUES
    ('b0000000-0000-4000-8000-000000000001', '7891049281023', 'REG-BOSCH-12V', 'F00M144136', 'Bosch', 'Gol, Fox, Voyage, Saveiro 1.0/1.6', 'Regulador de Voltagem Bosch 12V', 110.00, 185.00, 15, 0, 3, 'Prateleira B3', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000002', '7891234567890', 'ALT-BOSCH-12V', 'F000BL0662', 'Bosch', 'Gol G5 1.6, Fox 1.6, Polo 1.6', 'Alternador Bosch 12V 90A', 450.00, 680.00, 5, 0, 2, 'Prateleira C3', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000003', '7892019482014', 'BAT-MOURA-60AH', 'M60GD', 'Moura', 'Universal (polo positivo direito)', 'Bateria Automotiva Moura 60Ah M60GD', 340.00, 489.00, 12, 0, 4, 'Setor Baterias A1', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000004', '7892019482021', 'BAT-HELIAR-70AH', 'HF70QD', 'Heliar', 'Renegade, Compass, Onix Turbo (Start-Stop)', 'Bateria Automotiva Heliar 70Ah EFB Start-Stop', 520.00, 749.00, 8, 0, 3, 'Setor Baterias A2', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000005', '7893049581028', 'MOT-PART-VALEO', 'D7E15', 'Valeo', 'Gol G5, Fox, Voyage 1.0/1.6', 'Motor de Partida / Arranque Valeo 12V VW Fox/Gol G5', 380.00, 580.00, 6, 0, 2, 'Prateleira C1', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000006', '7893049581035', 'MOT-PART-DENSO', '428000-6120', 'Denso', 'Corolla 1.8/2.0 2009-2019', 'Motor de Partida Denso 12V Toyota Corolla 1.8/2.0', 490.00, 720.00, 4, 0, 2, 'Prateleira C2', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000007', '7894059681042', 'ALT-VALEO-110A', '439894', 'Valeo', 'Onix, Prisma, Cobalt 1.0/1.4', 'Alternador Valeo 110A Chevrolet Onix / Prisma', 460.00, 690.00, 5, 0, 2, 'Prateleira C3', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000008', '7894059681059', 'BOB-IGN-BOSCH', 'F000ZS0222', 'Bosch', 'Gol, Fox, Polo EA111 1.0/1.6', 'Bobina de Ignição Bosch 4 Pinos VW EA111 1.0/1.6', 160.00, 250.00, 14, 0, 4, 'Prateleira B1', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000009', '7895069781066', 'VELAS-NGK-IRID', 'BKR6EIX', 'NGK', 'Universal 4 cilindros', 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 95.00, 160.00, 20, 0, 5, 'Prateleira B2', 'JG', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000010', '7895069781073', 'CAB-VELA-NGK', 'SCG65', 'NGK', 'Gol, Parati, Saveiro motor AP', 'Jogo de Cabos de Vela Resistivos NGK', 70.00, 120.00, 12, 0, 3, 'Prateleira B2', 'JG', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000011', '7896079881080', 'RELE-AUX-4P', 'DNI0101', 'DNI', 'Universal 12V', 'Relé Auxiliar 4 Pinos 12V 40A DNI com Suporte', 12.00, 25.00, 45, 0, 10, 'Gaveteiro E1', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000012', '7896079881097', 'RELE-PISCA-3P', 'DNI0126', 'DNI', 'Universal 12V (LED)', 'Relé Eletrônico de Pisca 3 Pinos 12V Híbrido LED', 18.00, 38.00, 25, 0, 5, 'Gaveteiro E2', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000013', '7897089981103', 'FUS-KIT-LAMINA', NULL, NULL, 'Universal', 'Kit Fusíveis Lâmina Automotivos Sortidos 10A a 30A', 15.00, 32.00, 30, 0, 8, 'Gaveteiro E3', 'KT', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000014', '7897089981110', 'FUS-MAXI-50A', NULL, NULL, 'Universal', 'Maxi Fusível Lâmina 50A Vermelho', 6.00, 14.00, 40, 0, 10, 'Gaveteiro E4', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000015', '7898090081127', 'LAMP-H4-PHILIPS', '12342XVPS2', 'Philips', 'Farol H4 universal', 'Lâmpada H4 X-tremeVision Pro150 Philips 12V 60/55W', 45.00, 85.00, 24, 0, 6, 'Vitrine D1', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000016', '7898090081134', 'LAMP-H7-OSRAM', '64210', 'Osram', 'Farol H7 universal', 'Lâmpada H7 Standard Original Line Osram 12V 55W', 28.00, 55.00, 28, 0, 6, 'Vitrine D2', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000017', '7898090081141', 'LAMP-PINGO-T10', NULL, NULL, 'Lanterna e placa universal', 'Par de Lâmpadas LED Pingo T10 W5W 6000K', 10.00, 22.00, 50, 0, 12, 'Vitrine D3', 'PAR', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000018', '7898090081158', 'LAMP-1034-2POL', NULL, NULL, 'Freio e lanterna universal', 'Lâmpada 2 Polos 12V 21/5W P21/5W Freio e Lanterna', 4.50, 10.00, 60, 0, 15, 'Vitrine D4', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000019', '7899100181165', 'SOND-LAMB-BOSCH', '0258986602', 'Bosch', 'Universal 4 fios (Master, Sprinter, Gol)', 'Sonda Lambda Universal Planar Bosch 4 Fios', 190.00, 310.00, 8, 0, 3, 'Prateleira B4', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000020', '7899100181172', 'POLIA-RODA-ZEN', '5263', 'Zen', 'Onix, Cobalt, Spin', 'Polia Roda Livre do Alternador Zen 9 Pistas', 130.00, 220.00, 7, 0, 2, 'Prateleira C4', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000021', '7899100181189', 'BENDIX-VALEO', '594070', 'Valeo', 'Sprinter, Master, Ducato', 'Pinhão / Impulsor de Partida Bendix Valeo 9 Dentes', 65.00, 115.00, 11, 0, 3, 'Prateleira C5', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000022', '7899100181196', 'TERM-BAT-LATAO', NULL, NULL, 'Universal', 'Par Terminais de Bateria Latão Reforçado Fundido', 8.00, 18.00, 40, 0, 10, 'Setor Baterias A3', 'PAR', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000023', '7899100181202', 'CHV-GERAL-BAT', NULL, NULL, 'Universal 12/24V', 'Chave Geral de Bateria Automotiva / Náutica 300A', 55.00, 110.00, 9, 0, 2, 'Setor Baterias A4', 'UN', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000024', '7899100181219', 'AUTO-FAL-6POL', 'B6X', 'Bravox', 'Universal', 'Par Alto-falantes 6 Polegadas Triaxial Bravox 100W', 90.00, 160.00, 10, 0, 3, 'Vitrine Som V1', 'PAR', true, 1, '2026-10-01 08:00:00'),
    ('b0000000-0000-4000-8000-000000000025', '7899100181226', 'SIRENE-1-TOM', 'DNI4040', 'DNI', 'Universal 12/24V', 'Sirene de Marcha Ré Bivolt 12V/24V DNI', 25.00, 50.00, 15, 0, 4, 'Vitrine D5', 'UN', true, 1, '2026-10-01 08:00:00');

-- 4. CLIENTES (CPF/CNPJ válidos, somente dígitos)
INSERT INTO clientes (id, nome, cpf_cnpj, telefone, email, created_at) VALUES
    ('c0000000-0000-4000-8000-000000000001', 'João Paulo da Silva', '12345678909', '(11) 98765-1122', 'joao.silva@gmail.com', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000002', 'Maria Fernandes Oliveira', '23456789092', '(11) 97654-2233', 'maria.fernandes@hotmail.com', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000003', 'Transportadora TransRápido Ltda', '12345678000195', '(11) 3456-7890', 'frotas@transrapido.com.br', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000004', 'Lucas Henrique Santos', '34567890175', '(11) 99123-4455', 'lucas.uber@yahoo.com.br', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000005', 'Dra. Ana Carolina Mendes', '45678901249', '(11) 98234-5566', 'ana.mendes@clinica.med.br', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000006', 'Auto Socorro Guinchos 24h', '98765432000198', '(11) 3322-1100', 'operacoes@socorro24h.com.br', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000007', 'Rodrigo Albuquerque Taxista', '56789012303', '(11) 97788-9900', 'rodrigo.taxi@gmail.com', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000008', 'Camila Duarte Lima', '67890123469', '(11) 96655-4433', 'camila.duarte@empresa.com', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000009', 'Padaria & Confeitaria Central', '11223344000186', '(11) 4567-8901', 'financeiro@padariacentral.com.br', '2026-10-01 09:00:00'),
    ('c0000000-0000-4000-8000-000000000010', 'Fernando Gomes Rocha', '78901234505', '(11) 95544-3322', 'fernando.rocha@outlook.com', '2026-10-01 09:00:00');

-- 5. CARROS (composição com os clientes)
INSERT INTO carros (id, cliente_id, modelo, marca, placa, ano) VALUES
    ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Gol 1.6 MSI TotalFlex', 'Volkswagen', 'BRA2E19', '2020'),
    ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'HB20 1.0 Evolution', 'Hyundai', 'RIO1A23', '2022'),
    ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Sprinter 415 CDI Furgão', 'Mercedes-Benz', 'SPX9F88', '2019'),
    ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000003', 'Transit 2.2 TDCi 350L', 'Ford', 'SPX3B45', '2021'),
    ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000004', 'Onix Plus 1.0 Turbo Premier', 'Chevrolet', 'MOB8C77', '2023'),
    ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000005', 'Renegade 1.8 Longitude Flex', 'Jeep', 'JEP4D56', '2021'),
    ('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000006', 'Daily 35S14 Plataforma Guincho', 'Iveco', 'GCH7A90', '2018'),
    ('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000007', 'Cronos 1.3 Drive Flex', 'Fiat', 'TAX5E66', '2022'),
    ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000008', 'Corolla 2.0 XEi DirectShift', 'Toyota', 'COR9H12', '2020'),
    ('d0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000009', 'Master 2.3 dCi Extra Furgão', 'Renault', 'PAD2G33', '2020'),
    ('d0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000010', 'Strada 1.4 Hard Working Cabine Simples', 'Fiat', 'STR6K44', '2019');

-- 6. ORDENS DE SERVIÇO (cobrem todos os status da máquina de estados)
INSERT INTO ordens_servico (id, numero_os, cliente_id, carro_id, usuario_id, status, origem, prioridade, sintomas,
                            hipotese_diagnostica, checklist_eletrico, desconto, observacoes, forma_pagamento,
                            finalizada_em, entregue_em, versao, created_at, updated_at) VALUES
    ('f0000000-0000-4000-8000-000000000001', 'OS-2026-0001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
     'a0000000-0000-4000-8000-000000000004', 'ENTREGUE', 'BALCAO', 'ALTA',
     'Veículo apagou na avenida e luz da bateria acendeu no painel antes de falhar.',
     'Alternador não está gerando carga (regulador em curto) e descarregou totalmente a bateria.',
     '{"bateria": "10.2V", "alternador": "11.1V - sem carga", "motor_partida": "pesado"}', 0.00,
     'Serviço executado e testado. Garantia de 1 ano na bateria.', 'PIX',
     '2026-10-08 17:30:00', '2026-10-09 11:45:00', 1, '2026-10-07 08:30:00', '2026-10-09 11:45:00'),
    ('f0000000-0000-4000-8000-000000000002', 'OS-2026-0002', 'c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005',
     'a0000000-0000-4000-8000-000000000005', 'FINALIZADO', 'BALCAO', 'MEDIA',
     'Motor falhando em subidas, engasgando e luz de injeção piscando no painel.',
     'Bobina de ignição com fuga de faísca no cilindro 3 e velas desgastadas.',
     '{"bateria": "12.6V", "alternador": "14.2V", "injecao": "falha cilindro 3"}', 20.00,
     'Troca da bobina e do jogo de velas Iridium concluída. Testado no scanner sem erros.', NULL,
     '2026-10-09 16:00:00', NULL, 1, '2026-10-08 09:10:00', '2026-10-09 16:00:00'),
    ('f0000000-0000-4000-8000-000000000003', 'OS-2026-0003', 'c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003',
     'a0000000-0000-4000-8000-000000000002', 'EM_EXECUCAO', 'BALCAO', 'ALTA',
     'Sprinter não dá partida no primeiro giro da manhã; motor de arranque estala mas não vira.',
     'Automático e escovas do motor de partida desgastados; fiação com oxidação.',
     '{"bateria": "12.4V", "motor_partida": "defeito no automático"}', 0.00,
     'Motor de partida na bancada para revisão completa e troca de bendix/escovas.', NULL,
     NULL, NULL, 1, '2026-10-09 08:45:00', '2026-10-09 08:45:00'),
    ('f0000000-0000-4000-8000-000000000004', 'OS-2026-0004', 'c0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000009',
     'a0000000-0000-4000-8000-000000000002', 'APROVADO', 'BALCAO', 'MEDIA',
     'Corolla não liga quando o motor esquenta; após esfriar pega normal.',
     'Motor de partida Denso travando buchas por dilatação térmica.',
     '{"bateria": "12.7V", "motor_partida": "travamento a quente"}', 0.00,
     'Orçamento aprovado pelo cliente. Aguardando entrada no elevador.', NULL,
     NULL, NULL, 1, '2026-10-09 09:30:00', '2026-10-09 09:30:00'),
    ('f0000000-0000-4000-8000-000000000005', 'OS-2026-0005', 'c0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000008',
     'a0000000-0000-4000-8000-000000000002', 'TESTES_ELETRICOS', 'BALCAO', 'MEDIA',
     'Farol baixo queimando com frequência e luzes do painel oscilando com aceleração.',
     'Picos de tensão do regulador do alternador ultrapassando 15.5V.',
     '{"alternador": "15.8V - sobrecarga", "iluminacao": "lâmpadas queimando"}', 15.00,
     'Regulador substituído. Teste de carga com osciloscópio por 30 minutos.', NULL,
     NULL, NULL, 1, '2026-10-09 10:15:00', '2026-10-09 10:15:00'),
    ('f0000000-0000-4000-8000-000000000006', 'OS-2026-0006', 'c0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006',
     'a0000000-0000-4000-8000-000000000002', 'ORCAMENTO_PENDENTE', 'TELEGRAM_VOICE', 'ALTA',
     'Jeep não ligou na garagem após 3 dias parado.',
     'Bateria original no fim da vida útil ou módulo não entrando em modo sleep.',
     '{"bateria": "9.8V", "alternador": "testar"}', 0.00,
     'Serviços sugeridos: Teste de fuga de corrente; Substituição da bateria EFB', NULL,
     NULL, NULL, 1, '2026-10-09 11:00:00', '2026-10-09 11:00:00'),
    ('f0000000-0000-4000-8000-000000000007', 'OS-2026-0007', 'c0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000007',
     'a0000000-0000-4000-8000-000000000003', 'TRIAGEM', 'TELEGRAM_VOICE', 'MEDIA',
     'Sirene de ré e giroflex da plataforma pararam de funcionar.',
     'Fusível rompido ou relé auxiliar travado por curto na fiação traseira.',
     '{"iluminacao": "giroflex inoperante"}', 0.00,
     'Serviços sugeridos: Verificação do chicote traseiro', NULL,
     NULL, NULL, 1, '2026-10-09 11:40:00', '2026-10-09 11:40:00'),
    ('f0000000-0000-4000-8000-000000000008', 'OS-2026-0008', 'c0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000010',
     'a0000000-0000-4000-8000-000000000003', 'AGUARDANDO_PECA', 'BALCAO', 'MEDIA',
     'Furgão falha na partida e solta fumaça preta com cheiro forte de combustível.',
     'Sonda lambda travada em mistura rica.',
     '{"injecao": "mistura rica"}', 0.00,
     'Sonda Lambda Bosch requisitada ao fornecedor. Previsão de chegada às 15h.', NULL,
     NULL, NULL, 1, '2026-10-09 12:00:00', '2026-10-09 12:00:00');

-- 7. PEÇAS DAS OS (custo congelado no momento da alocação para o CMV)
INSERT INTO itens_os (id, ordem_servico_id, peca_id, descricao_peca, quantidade, preco_unitario, custo_unitario) VALUES
    ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'Bateria Automotiva Moura 60Ah M60GD', 1, 489.00, 340.00),
    ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Regulador de Voltagem Bosch 12V', 1, 185.00, 110.00),
    ('f1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000022', 'Par Terminais de Bateria Latão Reforçado Fundido', 1, 18.00, 8.00),
    ('f1000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000008', 'Bobina de Ignição Bosch 4 Pinos VW EA111 1.0/1.6', 1, 250.00, 160.00),
    ('f1000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000009', 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 1, 160.00, 95.00),
    ('f1000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000010', 'Jogo de Cabos de Vela Resistivos NGK', 1, 120.00, 70.00),
    ('f1000000-0000-4000-8000-000000000007', 'f0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000021', 'Pinhão / Impulsor de Partida Bendix Valeo 9 Dentes', 1, 115.00, 65.00),
    ('f1000000-0000-4000-8000-000000000008', 'f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000006', 'Motor de Partida Denso 12V Toyota Corolla 1.8/2.0', 1, 720.00, 490.00),
    ('f1000000-0000-4000-8000-000000000009', 'f0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Regulador de Voltagem Bosch 12V', 1, 185.00, 110.00),
    ('f1000000-0000-4000-8000-000000000010', 'f0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000016', 'Lâmpada H7 Standard Original Line Osram 12V 55W', 2, 55.00, 28.00);

-- Peças de OS ainda não finalizadas ficam RESERVADAS (fora do saldo disponível para o balcão)
UPDATE pecas p SET estoque_reservado = COALESCE((
    SELECT SUM(i.quantidade) FROM itens_os i
    JOIN ordens_servico o ON o.id = i.ordem_servico_id
    WHERE i.peca_id = p.id AND o.status NOT IN ('FINALIZADO', 'ENTREGUE', 'CANCELADO')
), 0);

-- 8. MÃO DE OBRA DAS OS
INSERT INTO servicos_os (id, ordem_servico_id, descricao, valor, eletricista_responsavel_id) VALUES
    ('f2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Desmontagem, reparo de bancada e instalação de alternador', 350.00, 'a0000000-0000-4000-8000-000000000002'),
    ('f2000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'Instalação de bateria e teste de sistema de carga e partida', 80.00, 'a0000000-0000-4000-8000-000000000002'),
    ('f2000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 'Diagnóstico via scanner e substituição do sistema de ignição', 220.00, 'a0000000-0000-4000-8000-000000000005'),
    ('f2000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000003', 'Revisão geral do motor de partida de veículo comercial Sprinter', 380.00, 'a0000000-0000-4000-8000-000000000002'),
    ('f2000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000004', 'Substituição e calibração de motor de arranque Corolla', 280.00, 'a0000000-0000-4000-8000-000000000002'),
    ('f2000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000005', 'Diagnóstico com osciloscópio, troca de regulador e alinhamento de faróis', 240.00, 'a0000000-0000-4000-8000-000000000002');

-- 9. VENDAS NO BALCÃO
INSERT INTO vendas_balcao (id, numero_venda, operador_id, cliente_id, desconto, forma_pagamento, status,
                           autorizado_por_id, referencia_pagamento, motivo_cancelamento, cancelada_em, created_at) VALUES
    ('90000000-0000-4000-8000-000000000001', 'VB-2026-0001', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 0.00, 'PIX', 'CONCLUIDA', NULL, NULL, NULL, NULL, '2026-10-09 09:15:00'),
    ('90000000-0000-4000-8000-000000000002', 'VB-2026-0002', 'a0000000-0000-4000-8000-000000000004', NULL, 0.00, 'DINHEIRO', 'CONCLUIDA', NULL, NULL, NULL, NULL, '2026-10-09 10:20:00'),
    ('90000000-0000-4000-8000-000000000003', 'VB-2026-0003', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 10.00, 'CARTAO_CREDITO', 'CONCLUIDA', NULL, NULL, NULL, NULL, '2026-10-09 11:05:00'),
    ('90000000-0000-4000-8000-000000000004', 'VB-2026-0004', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000007', 0.00, 'CARTAO_DEBITO', 'CONCLUIDA', NULL, NULL, NULL, NULL, '2026-10-09 11:50:00'),
    ('90000000-0000-4000-8000-000000000005', 'VB-2026-0005', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000006', 0.00, 'PIX', 'CONCLUIDA', NULL, NULL, NULL, NULL, '2026-10-09 12:15:00'),
    ('90000000-0000-4000-8000-000000000006', 'VB-2026-0006', 'a0000000-0000-4000-8000-000000000005', NULL, 0.00, 'DINHEIRO', 'CONCLUIDA', NULL, NULL, NULL, NULL, '2026-10-09 12:45:00');

INSERT INTO itens_venda (id, venda_id, peca_id, descricao_peca, quantidade, preco_unitario, custo_unitario) VALUES
    ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'Bateria Automotiva Moura 60Ah M60GD', 1, 489.00, 340.00),
    ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000013', 'Kit Fusíveis Lâmina Automotivos Sortidos 10A a 30A', 1, 32.00, 15.00),
    ('91000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000016', 'Lâmpada H7 Standard Original Line Osram 12V 55W', 1, 55.00, 28.00),
    ('91000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000009', 'Jogo de Velas de Ignição NGK G-Power Iridium (4 un)', 1, 160.00, 95.00),
    ('91000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000010', 'Jogo de Cabos de Vela Resistivos NGK', 1, 120.00, 70.00),
    ('91000000-0000-4000-8000-000000000006', '90000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000011', 'Relé Auxiliar 4 Pinos 12V 40A DNI com Suporte', 2, 25.00, 12.00),
    ('91000000-0000-4000-8000-000000000007', '90000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000022', 'Par Terminais de Bateria Latão Reforçado Fundido', 1, 18.00, 8.00),
    ('91000000-0000-4000-8000-000000000008', '90000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000025', 'Sirene de Marcha Ré Bivolt 12V/24V DNI', 1, 50.00, 25.00),
    ('91000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000023', 'Chave Geral de Bateria Automotiva / Náutica 300A', 1, 110.00, 55.00),
    ('91000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000017', 'Par de Lâmpadas LED Pingo T10 W5W 6000K', 1, 22.00, 10.00);

-- 10. CAIXAS DIÁRIOS (dois turnos fechados com fechamento cego e o turno atual aberto)
INSERT INTO caixas_diario (id, operador_id, saldo_inicial, status, data_abertura, data_fechamento,
                           diferenca_fechamento, totais_informados_fechamento) VALUES
    ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 250.00, 'FECHADO', '2026-10-07 08:00:00', '2026-10-07 18:00:00', 0.00,
     '{"DINHEIRO": "250.00", "PIX": "0.00", "CARTAO_CREDITO": "0.00", "CARTAO_DEBITO": "0.00"}'),
    ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 300.00, 'FECHADO', '2026-10-08 08:00:00', '2026-10-08 18:05:00', -5.00,
     '{"DINHEIRO": "295.00", "PIX": "0.00", "CARTAO_CREDITO": "0.00", "CARTAO_DEBITO": "0.00"}'),
    ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 300.00, 'ABERTO', '2026-10-09 08:00:00', NULL, NULL, NULL);

INSERT INTO movimentacoes_caixa (id, caixa_id, tipo, valor, forma_pagamento, descricao, created_at) VALUES
    ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'ENTRADA_VENDA', 489.00, 'PIX', 'Venda no Balcão #VB-2026-0001', '2026-10-09 09:15:30'),
    ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003', 'ENTRADA_VENDA', 87.00, 'DINHEIRO', 'Venda no Balcão #VB-2026-0002', '2026-10-09 10:20:12'),
    ('e1000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', 'ENTRADA_VENDA', 270.00, 'CARTAO_CREDITO', 'Venda no Balcão #VB-2026-0003', '2026-10-09 11:05:20'),
    ('e1000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000003', 'ENTRADA_OS', 1122.00, 'PIX', 'Recebimento OS #OS-2026-0001', '2026-10-09 11:45:00'),
    ('e1000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000003', 'ENTRADA_VENDA', 68.00, 'CARTAO_DEBITO', 'Venda no Balcão #VB-2026-0004', '2026-10-09 11:50:10'),
    ('e1000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000003', 'ENTRADA_VENDA', 160.00, 'PIX', 'Venda no Balcão #VB-2026-0005', '2026-10-09 12:15:15'),
    ('e1000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000003', 'SANGRIA', 200.00, 'DINHEIRO', 'Sangria de segurança para o cofre da administração', '2026-10-09 12:30:00'),
    ('e1000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000003', 'ENTRADA_VENDA', 22.00, 'DINHEIRO', 'Venda no Balcão #VB-2026-0006', '2026-10-09 12:45:05');

-- 11. CONTAS A PAGAR E A RECEBER
INSERT INTO titulos_financeiros (id, tipo, descricao, valor, data_vencimento, categoria, status, cliente_id, venda_id,
                                 ordem_servico_id, data_pagamento, forma_pagamento_baixa, created_at) VALUES
    ('80000000-0000-4000-8000-000000000001', 'PAGAR', 'Aluguel do galpão - outubro', 3500.00, '2026-10-05', 'DESPESA_FIXA', 'PAGO', NULL, NULL, NULL, '2026-10-05', 'PIX', '2026-10-01 10:00:00'),
    ('80000000-0000-4000-8000-000000000002', 'PAGAR', 'Energia elétrica - setembro', 680.00, '2026-10-20', 'DESPESA_VARIAVEL', 'ABERTO', NULL, NULL, NULL, NULL, NULL, '2026-10-01 10:00:00'),
    ('80000000-0000-4000-8000-000000000003', 'PAGAR', 'Compra de alternadores e reguladores - Distribuidora Bosch', 4200.00, '2026-10-15', 'COMPRA_MERCADORIA', 'ABERTO', NULL, NULL, NULL, NULL, NULL, '2026-10-02 10:00:00'),
    ('80000000-0000-4000-8000-000000000004', 'RECEBER', 'Frota TransRápido - serviços faturados de setembro', 1450.00, '2026-10-01', 'SERVICO_A_PRAZO', 'ABERTO', 'c0000000-0000-4000-8000-000000000003', NULL, NULL, NULL, NULL, '2026-09-01 10:00:00'),
    ('80000000-0000-4000-8000-000000000005', 'RECEBER', 'Guinchos 24h - peças faturadas', 890.00, '2026-11-08', 'VENDA_A_PRAZO', 'ABERTO', 'c0000000-0000-4000-8000-000000000006', NULL, NULL, NULL, NULL, '2026-10-08 10:00:00');

-- 12. NUMERAÇÃO SEQUENCIAL (continua a partir dos registros de demonstração)
INSERT INTO contadores_sequenciais (chave, valor) VALUES ('OS-2026', 8), ('VB-2026', 6);

-- 13. LOGS DE AUDITORIA (imutáveis)
INSERT INTO logs_auditoria (id, usuario_id, origem, acao, detalhes, payload_antes, payload_depois, ip_address, timestamp) VALUES
    ('70000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'CAIXA', 'CAIXA_ABERTO', '{"caixa_id": "e0000000-0000-4000-8000-000000000003", "saldo_inicial": "300.00"}', NULL, NULL, '192.168.1.10', '2026-10-09 08:00:05'),
    ('70000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 'ORDEM_SERVICO', 'OS_FATURADA', '{"numero_os": "OS-2026-0001", "valor_total": "1122.00", "forma_pagamento": "PIX"}', '{"status": "FINALIZADO"}', '{"status": "ENTREGUE"}', '192.168.1.10', '2026-10-09 11:45:00'),
    ('70000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'TELEGRAM_VOICE_BOT', 'OS_CRIADA_POR_VOZ', '{"numero_os": "OS-2026-0006", "telegram_user_id": "987654321"}', NULL, NULL, '149.154.167.220', '2026-10-09 11:00:00'),
    ('70000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'BALCAO_PDV', 'DESCONTO_APLICADO', '{"numero_venda": "VB-2026-0003"}', '{"desconto": "0.00"}', '{"desconto": "10.00", "percentual": "3.57"}', '192.168.1.10', '2026-10-09 11:05:00'),
    ('70000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 'CAIXA', 'CAIXA_SANGRIA', '{"caixa_id": "e0000000-0000-4000-8000-000000000003", "valor": "200.00"}', NULL, NULL, '192.168.1.10', '2026-10-09 12:30:00');
