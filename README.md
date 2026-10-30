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
- **Backend**: Python 3.12 (FastAPI) + AsyncIO + SQLAlchemy 2.0 + Alembic (REST + WebSockets)
- **Banco de Dados**: PostgreSQL 16 (UUID, índices B-Tree/GIN trigram e JSONB, CHECKs, auditoria imutável por trigger)
- **Segurança**: Bcrypt (custo 12) + JWT de curta duração + refresh token rotativo em cookie HTTP-Only, RBAC multi-papel, limite de 5 tentativas (login/PIN)
- **Hardware & I/O**: Leitores de Código de Barras USB / Bluetooth (HID Keyboard Wedge + Web Serial API)
- **IA & Voz**: Telegram Bot API (webhook com segredo) + Whisper ASR + Claude (saída estruturada em JSON Schema)
- **Pagamentos**: PIX (BR Code com txid) com webhook de liquidação, cartões, boleto e faturado (contas a receber)
- **Qualidade & Metodologia**: Clean Architecture, DDD e TDD com cobertura mínima de **80%** (pytest-cov)

---

## 🏛️ Arquitetura do Backend (Clean Architecture & DDD)

```
Projeto_Eletrocar/
├── Eletrocar.API/
│   ├── src/
│   │   ├── domain/              # Camada 1: regras puras, sem frameworks
│   │   │   ├── entities/        # Usuario (multi-papel), Peca (reserva), OrdemServico, VendaBalcao, CaixaDiario,
│   │   │   │                    # TituloFinanceiro, CobrancaPix, SessaoRefresh, LogAuditoria
│   │   │   ├── value_objects/   # Dinheiro, CodigoBarras, CpfCnpj, PinOperador, DadosOSExtraidos, Enums
│   │   │   ├── services/        # DRE, Conciliação de caixa, Política de alçada, Sugestão de compra, Termos elétricos
│   │   │   ├── repositories/    # Interfaces (DIP)
│   │   │   └── gateways/        # Interfaces de Telegram, Whisper, extrator LLM e PIX
│   │   ├── application/         # Camada 2: casos de uso, DTOs, portas (hash, token, limitador) e serviços
│   │   ├── adapters/            # Camada 3: controllers FastAPI, repositórios SQLAlchemy e gateways HTTP/IA/PIX/PDF
│   │   └── infra/               # Camada 4: configuração, sessão/engine, modelos ORM, migrações Alembic, segurança
│   ├── tests/                   # domain / application (fakes) / adapters / integration (API + banco real)
│   ├── alembic.ini · pytest.ini # Migrações e configuração dos testes (cobertura mínima de 80%)
│   └── Dockerfile               # Python 3.12 com dependências declaradas (sem requirements.txt)
├── Eletrocar.UI/                # Frontend PWA (React 19 + TypeScript + Clean Architecture)
│   ├── src/
│   │   ├── domain/              # Camada 1: Entities (OS, Venda, Caixa, Peca), Value Objects (Dinheiro, Barcode)
│   │   ├── application/         # Camada 2: Use Cases (AdicionarItem, FinalizarVenda, AvancarStatusOS, OperarCaixa)
│   │   ├── adapters/            # Camada 3: Gateways de Hardware (WebHID, Keyboard Wedge, Web Audio) e ViewModels
│   │   └── presentation/        # Camada 4: UI Balcão PDV, Kanban OS, Estoque, Caixa, DRE e Lock Screen
│   └── package.json
└── Eletrocar.Database/
    ├── init.sql                 # Extensões (pg_trgm, pgcrypto) e banco de testes
    └── seed_completo.sql        # Carga de demonstração (somente desenvolvimento)
```

---

## 🐳 Execução (100% Docker)

```powershell
copy .env.example .env      # ajuste segredos e chaves
docker compose up -d --build
```

Na subida, a API aplica as migrações Alembic e, com `SEED_DADOS_DEMO=true` e banco vazio, a carga de demonstração.

| Serviço | Contêiner | Porta | Descrição |
|---|---|---|---|
| **PostgreSQL 16** | `eletrocar_postgres` | `5432` | Banco `eletrocar_db` (e `eletrocar_test` para os testes) |
| **Backend FastAPI** | `eletrocar_api` | `8000` | API Python 3.12 (Swagger em `/docs`) |
| **Frontend App** | `eletrocar_ui` / local | `3000` | Next.js 16.4 (App Router) + Turbopack + TailwindCSS + Shadcn/UI |
| **pgAdmin 4** | `eletrocar_pgadmin` | `5050` | Gerenciador web do banco |

- **Frontend Next.js 16**: [http://localhost:3000](http://localhost:3000)
- **Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs) · **Health**: [http://localhost:8000/health](http://localhost:8000/health)
- **pgAdmin**: [http://localhost:5050](http://localhost:5050) (`admin@eletrocar.com.br` / `admin`)

### Execução e Testes do Frontend (Next.js 16 + Vitest)
```powershell
cd Eletrocar.UI
npm install
npm run dev      # Inicia Next.js 16 com Turbopack (http://localhost:3000)
npm run test     # Executa bateria de testes unitários TDD com Vitest & React Testing Library
```

### Logins da carga de demonstração (somente desenvolvimento)
| Usuário | Senha | PIN | Papéis |
|---|---|---|---|
| `admin` | `admin123` | 1234 | ADMIN + BALCONISTA + ELETRICISTA (dono) |
| `marcio` | `marcio123` | 4321 | ELETRICISTA (Telegram 987654321) |
| `roberto` | `roberto123` | 5566 | ELETRICISTA (Telegram 987654322) |
| `carlos` | `carlos123` | 1122 | BALCONISTA |
| `juliana` | `juliana123` | 3344 | BALCONISTA + ELETRICISTA |

### Testes (TDD, PostgreSQL real, cobertura mínima de 80%)
```powershell
docker exec eletrocar_api pytest
```

### Recriar o banco do zero
```powershell
docker compose down -v
docker compose up -d --build
```
