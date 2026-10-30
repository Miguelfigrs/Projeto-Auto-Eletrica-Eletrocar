-- ==============================================================================
-- Inicialização do PostgreSQL 16 - Auto Elétrica Eletrocar
-- Executado pelo contêiner postgres apenas na criação do volume.
--
-- O ESQUEMA (tabelas, índices B-Tree/GIN, constraints e trigger de auditoria imutável)
-- é criado e versionado pelas migrações Alembic da API:
--   Eletrocar.API/src/infra/database/migracoes/versions/
-- A API executa "alembic upgrade head" automaticamente ao iniciar (MIGRAR_NA_INICIALIZACAO=true).
-- Os dados de demonstração ficam em seed_completo.sql (SEED_DADOS_DEMO=true).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- índices GIN trigram para busca textual (peças, clientes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- hashes bcrypt na carga de demonstração

-- Banco isolado para os testes de integração (TEST_POSTGRES_URL); as migrações criam o esquema
CREATE DATABASE eletrocar_test;
