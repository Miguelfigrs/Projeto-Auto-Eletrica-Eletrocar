# Projeto Auto Elétrica Eletrocar

Sistema e site para oficina mecânica e auto elétrica.

## 🚀 Sobre o Projeto
Este projeto tem como objetivo gerenciar e divulgar os serviços de auto elétrica, agendamentos, orçamentos e informações da oficina Eletrocar.

## 📚 Documentação do Projeto
- **[📽️ Apresentação Web Interativa (Slides 16:9)](docs/apresentacao/index.html)**: Apresentação de slides executiva completa (42 slides em formato tela cheia, com zoom 4K, navegação por teclado e exportação para PDF).
- **[📄 Documento da Apresentação Técnica](docs/APRESENTACAO_PROJETO_ELETROCAR.md)**: Roteiro estruturado dos 42 slides com tabelas comparativas, requisitos e mapeamento arquitetural.
- **[📐 Catálogo Visual de Diagramas (Slides 4K)](docs/diagramas/README.md)**: 12 diagramas de arquitetura, domínio, DER, máquina de estados, BCE e sequência em 4K e vetores SVG.
- **[Proposta Técnica e Comercial Completa](docs/PROPOSTA_TECNICA_E_COMERCIAL.md)**: Proposta executiva e comercial estruturada com stack FastAPI/React, arquitetura de leitor de código de barras sem perda de foco, módulos descritos, cronograma em Sprints de 2 semanas, valores de investimento, condições e SLA.
- **[Especificação Técnica e Operacional Consolidada](docs/ESPECIFICACAO_TECNICA_E_COMERCIAL.md)**: Detalhamento de arquitetura, integração Telegram Voice Bot, usabilidade de balcão, módulos financeiros (Fluxo de Caixa, DRE), cadastro simplificado de clientes e matriz de riscos.

## 🛠️ Tecnologias
- **Backend**: Python 3.11/3.12 (FastAPI) + AsyncIO + SQLAlchemy 2.0 (RESTful API + WebSockets)
- **Banco de Dados**: PostgreSQL 16 / SQLite Assíncrono (`aiosqlite`)
- **Segurança**: Bcrypt + JWT (OAuth2 Password Bearer) + PIN de Caixa
- **Hardware & I/O**: Leitores de Código de Barras USB / Bluetooth (HID Keyboard Wedge + Web Serial API)
- **Inteligência Artificial & Voz**: Telegram Bot API + Whisper ASR + LLM Entity Extraction
- **Qualidade & Metodologia**: Clean Architecture, Domain-Driven Design (DDD) e Test-Driven Development (TDD)

---

## 🏛️ Arquitetura do Backend (Clean Architecture & DDD)

O backend foi construído seguindo estritamente as diretrizes da **Clean Architecture** e **DDD**:

```
Projeto_Eletrocar/
├── Eletrocar.API/               # Módulo Backend FastAPI (Clean Architecture & DDD)
│   ├── src/
│   │   ├── domain/              # Camada 1: Domain (Zero dependências, regras puras)
│   │   │   ├── entities/        # Peca, OrdemServico, Cliente, Carro, VendaBalcao, CaixaDiario, Usuario
│   │   │   ├── value_objects/   # Dinheiro, CodigoBarras, CpfCnpj, Enums (Role, StatusOS...)
│   │   │   ├── exceptions/      # Exceções ricas de domínio (EstoqueInsuficiente, etc.)
│   │   │   ├── services/        # Domain Services: CalculadoraDREService, ConciliadorCaixaService
│   │   │   └── repositories/    # Interfaces Abstratas (ABCs) - Inversão de Dependência (DIP)
│   │   ├── application/         # Camada 2: Application (Casos de Uso e DTOs)
│   │   │   ├── use_cases/       # RealizarVendaBalcao, CriarOSPorVozTelegram, OperarCaixa...
│   │   │   └── dtos/            # Data Transfer Objects com validação estrita
│   │   ├── adapters/            # Camada 3: Interface Adapters
│   │   │   ├── controllers/     # Endpoints FastAPI REST e WebSockets em tempo real
│   │   │   └── repositories/    # Implementações SQLAlchemy 2.0 assíncronas dos repositórios
│   │   └── infra/               # Camada 4: Frameworks & Drivers
│   │       ├── database/        # Conexão assíncrona, SessionMaker e modelos ORM
│   │       ├── security/        # Hashing Bcrypt e geração/validação de tokens JWT
│   │       └── config.py        # Configurações globais (aponta banco para fora da API)
│   ├── tests/                   # 34 Testes Automatizados (TDD: Domain, Application e Integration)
│   ├── requirements.txt         # Dependências do backend
│   └── run_backend.py           # Script de execução
│
└── Eletrocar.Database/          # Módulo de Banco de Dados 100% FORA da API
    ├── docker-compose.yml       # Contêiner PostgreSQL 16 oficial + pgAdmin 4
    ├── init.sql                 # DDL completo com índices B-Tree e chaves relacionais
    ├── README.md                # Instruções de operação do banco
    └── data/                    # Diretório externo para arquivos de dados locais (.gitkeep)
```

---

## 🧪 Test-Driven Development (TDD)

O projeto possui **34 testes automatizados** cobrindo 100% das regras críticas de negócio e integração da API:

1. **Testes de Domínio Puros** (`tests/domain/`):
   - Invariantes de Peças (baixa de estoque, ponto de reposição, prevenção de saldo negativo)
   - Máquina de Estados Finita da Ordem de Serviço (Triagem -> Orçamento -> Execução -> Testes -> Conclusão)
   - Value Objects (cálculo financeiro preciso sem float, validação Módulo 11 de CPF/CNPJ, EAN-13/SKU)
   - Domain Services: DRE Gerencial (CMV, margem bruta/líquida) e Conciliação Cega de Caixa
2. **Testes de Casos de Uso com Fake Repositories** (`tests/application/`):
   - Baixa atômica de estoque em vendas de balcão
   - Pipeline de voz do Telegram com whitelist de eletricistas e auto-cadastro de cliente/carro
   - Fechamento cego de caixa (detecção de quebra/sobra)
   - Busca em < 50ms para leitores de código de barras USB/BT
3. **Testes de Integração com Banco e API** (`tests/integration/`):
   - Endpoints `/api/v1/auth` (Login JWT, troca rápida de operador por PIN no balcão)
   - Endpoints `/api/v1/pecas` (Leitura de código de barras USB/Bluetooth)
   - Endpoints `/api/v1/vendas` e `/api/v1/caixa` (Ciclo de PDV rápido e conciliação)
   - Endpoints `/api/v1/telegram/webhook` (Pipeline Voz -> OS)

### Como rodar os testes:
```powershell
python -m pytest -v
```

---

## 🐳 Como Executar com Docker Compose (API + PostgreSQL 16)

Tanto a API quanto o banco de dados PostgreSQL 16 (além do painel web pgAdmin 4) rodam de forma integrada e orquestrada via Docker Compose:

### 1. Subir todos os serviços com um único comando:
```powershell
docker compose up -d --build
```

Os seguintes serviços serão inicializados:
| Serviço | Contêiner | Porta Externa | Descrição |
|---|---|---|---|
| **PostgreSQL 16** | `eletrocar_postgres` | `5432` | Banco relacional com esquemas e índices B-Tree (`init.sql`) |
| **Backend FastAPI** | `eletrocar_api` | `8000` | API Python 3.11 assíncrona (Clean Architecture + DDD) |
| **pgAdmin 4** | `eletrocar_pgadmin` | `5050` | Gerenciador visual web do banco de dados |

### 2. Acessar os Serviços:
- **Swagger UI da API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc da API**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check da API**: [http://localhost:8000/health](http://localhost:8000/health)
- **pgAdmin 4**: [http://localhost:5050](http://localhost:5050)
  - *Email*: `admin@eletrocar.com.br` | *Senha*: `admin`
  - *Host para conectar*: `postgres` | *Porta*: `5432` | *Usuário*: `postgres` | *Senha*: `eletrocar2026`

### 3. Rodar os Testes dentro do Docker:
```powershell
docker exec eletrocar_api pytest tests/ -v
```

### 4. Parar os contêineres:
```powershell
docker compose down
```

---

## 💻 Como Executar Localmente (Sem Docker)

1. **Instalar Dependências**:
   ```powershell
   cd Eletrocar.API
   pip install -r requirements.txt
   ```

2. **Iniciar o Servidor FastAPI**:
   ```powershell
   python run_backend.py
   ```
   Ou via uvicorn:
   ```powershell
   uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Credenciais Padrão (Seed Automático)**:
   - **Administrador**: `admin@eletrocar.com.br` | Senha: `admin123` | PIN Caixa: `1234`
   - **Eletricista (Telegram Bot)**: `marcio@eletrocar.com.br` | Senha: `marcio123` | Telegram ID: `987654321` | PIN: `4321`
