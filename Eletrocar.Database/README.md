# Eletrocar.Database - Módulo de Banco de Dados Isolado
Auto Elétrica Eletrocar

Este diretório contém a infraestrutura e os scripts do banco de dados, mantidos **100% desacoplados e fora da aplicação API** (`Eletrocar.API`).

---

## 🐘 1. Executando com PostgreSQL 16 (Recomendado / Produção)

Para subir o banco de dados oficial em contêiner Docker:

```powershell
docker compose up -d
```

- **PostgreSQL 16**: `localhost:5432`
  - Usuário: `postgres`
  - Senha: `eletrocar2026`
  - Banco de Dados: `eletrocar_db`
- **pgAdmin 4 (Interface Web)**: [http://localhost:5050](http://localhost:5050)
  - Login: `admin@eletrocar.com.br`
  - Senha: `admin`

Para parar o contêiner:
```powershell
docker compose down
```

---

## 📁 2. Modo Local sem Docker (`./data/`)

Caso esteja executando sem Docker em ambiente de desenvolvimento leve, o sistema direciona automaticamente os arquivos SQLite para este diretório externo:
- `Eletrocar.Database/data/eletrocar.db`

Desta forma, **nenhum arquivo de banco de dados fica dentro da pasta da API**.

---

## 📜 3. Scripts SQL

- `init.sql`: Contém o script DDL com todas as tabelas relacionais, chaves estrangeiras (`ON DELETE CASCADE`), campos JSONB e índices otimizados (B-Tree) para buscas instantâneas por Código de Barras, SKU, Placa e CPF.
