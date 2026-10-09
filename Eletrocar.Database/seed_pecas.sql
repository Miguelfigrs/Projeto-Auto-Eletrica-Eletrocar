-- ==============================================================================
-- Carga Inicial de Peças e Componentes Elétricos - Auto Elétrica Eletrocar
-- ==============================================================================

INSERT INTO pecas (id, codigo_barras, sku, descricao, preco_custo, preco_venda, estoque_atual, estoque_minimo, localizacao, unidade_medida, ativo)
VALUES
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
