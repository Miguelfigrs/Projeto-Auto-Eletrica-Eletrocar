# Implantação — Neon (PostgreSQL) + Docker Hub + Render (API) + Vercel (UI)

```
GitHub (push na main)
   │  .github/workflows/ci-cd.yml
   ├─ 1. Testes da API  (imagem Docker + PostgreSQL 16, cobertura ≥ 80%)
   ├─ 2. Testes da UI   (Vitest + npm audit + next build)
   ├─ 3. Imagem da API  → Docker Hub   (eletrocar-api:sha-xxxx e :latest)
   ├─ 4. Deploy da API  → Render       (exatamente a imagem testada)
   └─ 5. Deploy da UI   → Vercel       (Next.js; /api/v1/* é repassado ao Render)

Navegador ──HTTPS──► Vercel (Eletrocar.UI) ──/api/v1/*──► Render (Eletrocar.API) ──SSL──► Neon (PostgreSQL)
```

| Peça | Pasta no repositório | Onde roda |
|---|---|---|
| API FastAPI | `Eletrocar.API/` (Dockerfile) | Render — serviço web a partir de imagem do Docker Hub |
| Banco | migrações Alembic em `Eletrocar.API/src/infra/database/migracoes` | Neon — PostgreSQL serverless |
| Interface Next.js 16 | `Eletrocar.UI/` | Vercel |
| CI/CD | `.github/workflows/ci-cd.yml` | GitHub Actions |

A UI chama a API sempre pelo mesmo domínio (`/api/v1/...`) e o Next.js repassa ao Render
(`rewrites` em `Eletrocar.UI/next.config.mjs`). Assim o cookie de sessão é do próprio domínio da UI e
não há chamadas entre domínios no navegador.

---

## 1. Neon — banco de dados

1. Crie um projeto em <https://neon.tech> na região **AWS US East 1 (N. Virginia)**. O Render não tem região no Brasil;
   banco e API precisam ficar na mesma região (cada tela faz várias consultas ao banco).
2. Em **Connection Details**, copie a string de conexão **direta** (sem `-pooler` no host), por exemplo:
   `postgresql://neondb_owner:SENHA@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
3. Pode colar exatamente como o Neon entrega: a API converte para o driver `asyncpg` (troca `sslmode` por `ssl`
   e descarta `channel_binding`). A string do pooler também funciona (o cache de prepared statements é desligado),
   mas a conexão direta é a recomendada para a API.

Não é preciso criar tabelas: na primeira subida a API roda as migrações (`alembic upgrade head`), que também criam
as extensões `pg_trgm` e `pgcrypto`.

## 2. Docker Hub — imagem da API

1. Em <https://hub.docker.com>, crie o repositório **`eletrocar-api`** (pode ser privado; veja o passo 3.4).
2. Em **Account Settings → Personal access tokens**, gere um token com permissão **Read & Write**.
   Ele será o secret `DOCKERHUB_TOKEN` no GitHub.

## 3. Render — API

1. **New → Web Service → Existing Image**, imagem `docker.io/SEU_USUARIO/eletrocar-api:latest`.
   (Faça o primeiro push na `main` antes, para a imagem existir — ou envie uma manualmente, ver "Primeira publicação".)
2. Região: **Virginia (US East)** — a mesma do banco no Neon.
3. **Health Check Path**: `/health`. A porta vem da variável `PORT` do Render (a imagem já a respeita).
4. Se o repositório do Docker Hub for privado, cadastre a credencial em **Settings → Registry Credential**.
5. **Environment** — variáveis de produção:

| Variável | Valor |
|---|---|
| `AMBIENTE` | `producao` |
| `DATABASE_URL` | string do Neon (passo 1) |
| `SECRET_KEY` | 64 caracteres aleatórios (ex.: `python -c "import secrets; print(secrets.token_urlsafe(48))"`) |
| `TELEGRAM_WEBHOOK_SECRET` | outro valor aleatório |
| `PIX_WEBHOOK_SECRET` | outro valor aleatório |
| `CORS_ORIGINS` | `https://SEU-PROJETO.vercel.app` (e o domínio próprio, separado por vírgula) |
| `URL_PAINEL` | `https://SEU-PROJETO.vercel.app` |
| `REFRESH_COOKIE_SECURE` | `true` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` (sessão de 8 horas; é o padrão — se a variável existir no Render com outro valor, é ela que vale) |
| `FORWARDED_ALLOW_IPS` | `*` (confia no proxy do Render para registrar o IP real na auditoria) |
| `MIGRAR_NA_INICIALIZACAO` | `true` |
| `SEED_DADOS_DEMO` | `false` (a API se recusa a subir em produção com a carga de demonstração) |
| `ADMIN_EMAIL` | e-mail do dono |
| `ADMIN_SENHA_INICIAL` | senha forte — cria o primeiro administrador (usuário `admin`) **só se o banco estiver vazio**; troque-a no primeiro acesso |
| `FUSO_HORARIO` | `America/Sao_Paulo` |
| `PIX_CHAVE` | chave PIX real da oficina |
| `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `WHISPER_API_KEY` | opcionais (bot de voz das OS) |

A API **recusa iniciar** em produção se `SECRET_KEY` (≥ 32 caracteres), `TELEGRAM_WEBHOOK_SECRET` ou
`PIX_WEBHOOK_SECRET` estiverem com valores de desenvolvimento, se `CORS_ORIGINS` contiver `*`,
se `SEED_DADOS_DEMO` estiver ativo ou se `DATABASE_URL` não for PostgreSQL.

6. Em **Settings → Deploy Hook**, copie a URL. Ela será o secret `RENDER_DEPLOY_HOOK_URL` (o pipeline acrescenta
   `&imgURL=...` para publicar exatamente a imagem testada). Desligue o **Auto-Deploy** do Render para que só o
   pipeline publique.

> **Plano gratuito do Render:** o serviço "dorme" após ~15 min sem acesso e leva até ~1 min para acordar.
> Nesse primeiro acesso a Vercel pode responder 504 (tempo esgotado no repasse) — basta recarregar.
> Para uso diário na oficina, use o plano pago *Starter* (sempre ligado).

## 4. Vercel — interface

1. **Add New → Project**, importe o repositório do GitHub.
2. **Root Directory**: `Eletrocar.UI`. Framework: Next.js (detectado).
3. **Environment Variables** (Production): `ELETROCAR_API_URL` = URL pública do Render, ex.: `https://eletrocar-api.onrender.com`
   (sem `/api/v1` no final).
4. O arquivo `Eletrocar.UI/vercel.json` desliga o deploy automático por Git: quem publica é o pipeline, **depois**
   que os testes passam e a API nova já está no ar.
5. Para os secrets do GitHub:
   - `VERCEL_TOKEN`: **Account Settings → Tokens**.
   - `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`: rode `npx vercel link` na raiz do repositório e copie de `.vercel/project.json`
     (ou veja em **Project Settings → General**). Não faça commit da pasta `.vercel/`.

## 5. GitHub — secrets e variáveis do pipeline

Em **Settings → Secrets and variables → Actions**:

| Tipo | Nome | Valor |
|---|---|---|
| Variable | `DOCKERHUB_USERNAME` | seu usuário do Docker Hub |
| Variable | `API_URL` | URL do Render (o pipeline espera `/health` responder após o deploy) |
| Secret | `DOCKERHUB_TOKEN` | token do passo 2 |
| Secret | `RENDER_DEPLOY_HOOK_URL` | deploy hook do passo 3.6 |
| Secret | `VERCEL_TOKEN` | token da Vercel |
| Secret | `VERCEL_ORG_ID` | ID da conta/time da Vercel |
| Secret | `VERCEL_PROJECT_ID` | ID do projeto da Vercel |

Os jobs de deploy usam o *environment* `production` do GitHub: em **Settings → Environments → production** você pode
exigir aprovação manual antes de cada publicação.

## Primeira publicação

1. Configure os passos 1, 2, 4 e 5 (o Render precisa da imagem para ser criado).
2. Faça push na `main` (ou rode o workflow manualmente em **Actions → CI/CD → Run workflow**).
   Os jobs 1–3 passam e publicam a imagem; os jobs de deploy falham na primeira vez porque o Render ainda não existe.
3. Crie o serviço no Render (passo 3) com a imagem `:latest`, preencha `RENDER_DEPLOY_HOOK_URL` e `API_URL`
   e rode o workflow de novo — agora a esteira completa publica API e UI.
4. Acesse a URL da Vercel e entre com `admin` / `ADMIN_SENHA_INICIAL`. Cadastre os usuários da equipe em **Usuários (F8)**
   e troque a senha inicial.

## Rodar localmente a imagem como no Render

```powershell
docker build -t eletrocar-api:local Eletrocar.API
docker run --rm -p 8000:10000 -e PORT=10000 -e AMBIENTE=producao `
  -e DATABASE_URL="postgresql://USUARIO:SENHA@HOST/neondb?sslmode=require" `
  -e SECRET_KEY="<64 caracteres>" -e TELEGRAM_WEBHOOK_SECRET="<x>" -e PIX_WEBHOOK_SECRET="<y>" `
  -e CORS_ORIGINS="http://localhost:3000" eletrocar-api:local
```

## Backup e manutenção

- O Neon guarda histórico para restauração por ponto no tempo (*branches/restore*); no plano gratuito a janela é curta —
  para dados de produção, agende também um `pg_dump` periódico.
- Atualizações chegam pelo pipeline: todo push na `main` testa, publica a imagem `sha-…` e faz o deploy.
  Para voltar uma versão, rode o deploy hook do Render com `&imgURL=docker.io/SEU_USUARIO/eletrocar-api:sha-<anterior>`.
