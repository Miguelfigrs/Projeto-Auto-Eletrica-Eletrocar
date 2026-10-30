# Eletrocar.Database - Banco de Dados
Auto Elétrica Eletrocar

O PostgreSQL 16 sobe pelo `docker-compose.yml` da raiz do projeto, junto com a API e o pgAdmin.

## 📜 Arquivos

| Arquivo | Uso |
|---|---|
| `init.sql` | Executado na criação do volume: extensões `pg_trgm` e `pgcrypto` e o banco de testes `eletrocar_test` |
| `seed_completo.sql` | Carga de demonstração (usuários, peças, clientes, OS, vendas, caixa, títulos). Aplicada pela API quando `SEED_DADOS_DEMO=true` e o banco não tem usuários |
| `servers.json` | Conexão pré-configurada do pgAdmin |

O **esquema** (tabelas, constraints, índices B-Tree/GIN e o trigger que torna `logs_auditoria` imutável)
é versionado pelas migrações Alembic em `Eletrocar.API/src/infra/database/migracoes/` e aplicado
automaticamente quando a API inicia.

## 🔁 Recriar o banco do zero

```powershell
docker compose down -v
docker compose up -d --build
```

## 🔑 Acesso

- PostgreSQL: `localhost:5432` · usuário `postgres` · senha `eletrocar2026` · banco `eletrocar_db`
- pgAdmin: [http://localhost:5050](http://localhost:5050) · `admin@eletrocar.com.br` / `admin` · host `postgres`
