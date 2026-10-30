# Eletrocar.API - Backend de Gestão & Balcão Operacional
Auto Elétrica Eletrocar

Backend em **Python 3.12 (FastAPI)** com **Clean Architecture**, **DDD** e **TDD**, executado 100% no Docker.

---

## 🏛️ Camadas

| Camada | Pasta | Conteúdo |
|---|---|---|
| Domain | `src/domain` | Entidades, Value Objects, Domain Services, interfaces de repositórios e gateways |
| Application | `src/application` | Casos de uso, DTOs, portas de segurança e serviços de aplicação |
| Adapters | `src/adapters` | Controllers FastAPI, fábricas (composition root), repositórios SQLAlchemy, gateways (Telegram, Whisper, Claude, PIX, PDF) |
| Infra | `src/infra` | Configuração, engine/sessão, modelos ORM, migrações Alembic, Bcrypt/JWT/limitador |

A regra de dependência aponta sempre para dentro: o domínio não importa FastAPI, SQLAlchemy nem SDKs externos.

---

## 🔐 Controle de acesso (RBAC multi-papel)

| Recurso | ADMIN | BALCONISTA | ELETRICISTA |
|---|---|---|---|
| Usuários e papéis, auditoria, DRE, contas a pagar/receber | ✅ | — | — |
| Cadastro de peças, preço, entrada/ajuste de estoque, sugestão de compra | ✅ | — | — |
| Vendas, caixa (fechamento cego), cobrança PIX, faturamento/desconto de OS | ✅ | ✅ | — |
| Consulta de peças, clientes, abertura/atualização de OS, reserva de peças | ✅ | ✅ | ✅ |
| Cancelamento de venda, relatório de quebra de caixa | ✅ | — | — |

Um usuário pode acumular papéis (tabela `usuarios_papeis`); o Administrador tem acesso total.

---

## 🧪 Testes

```powershell
docker exec eletrocar_api pytest
```

- `tests/domain` · `tests/application` (fakes em memória) · `tests/adapters` (HTTP simulado) · `tests/integration` (API + PostgreSQL real)
- O banco de testes (`eletrocar_test`) é criado pelas **migrações Alembic**, garantindo que modelos e migrações estejam alinhados.
- Cobertura mínima de **80%** (`--cov-fail-under=80` no `pytest.ini`).

---

## 🗄️ Migrações

```powershell
docker exec eletrocar_api alembic upgrade head          # aplicada automaticamente na subida
docker exec eletrocar_api alembic revision --autogenerate -m "descricao"
```

---

## 🔌 Integrações

| Integração | Variáveis | Observação |
|---|---|---|
| Telegram Voice Bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Registre o webhook com `secret_token` igual a `TELEGRAM_WEBHOOK_SECRET` apontando para `/api/v1/telegram/webhook` |
| Whisper ASR | `WHISPER_API_URL`, `WHISPER_API_KEY` | Endpoint compatível com `/v1/audio/transcriptions` (nuvem ou self-hosted) |
| Extração por IA | `ANTHROPIC_API_KEY`, `LLM_MODELO` | Saída estruturada por JSON Schema, esforço baixo para respostas rápidas |
| PIX | `PIX_CHAVE`, `PIX_WEBHOOK_SECRET` | O PSP chama `/api/v1/pagamentos/pix/webhook` com header `X-Webhook-Secret` |

Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
