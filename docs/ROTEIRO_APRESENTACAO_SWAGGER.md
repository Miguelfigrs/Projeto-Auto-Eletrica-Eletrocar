# 🎬 Roteiro de Apresentação no Swagger: Backend Eletrocar

Roteiro passo a passo para demonstrar, pelo Swagger, que o backend está funcionando de ponta a ponta:
segurança, oficina, bot do Telegram, balcão/PDV, PIX, caixa com fechamento cego e gestão financeira.

> Todos os passos foram executados contra a API real (PostgreSQL 16 no Docker) com a carga de demonstração.
> Os resultados esperados abaixo são os obtidos nessa execução, em **13/10/2026**. Valores que dependem da data
> (dias em atraso, sugestão de compra) podem variar se a apresentação ocorrer em outro dia.

---

## 0. Preparação (antes da apresentação)

1. Recriar o banco com a carga de demonstração limpa (o roteiro altera dados, então rode isto antes de cada ensaio):
   ```powershell
   docker compose down -v
   docker compose up -d --build
   ```
2. Aguardar o contêiner `eletrocar_api` ficar **healthy** (`docker ps`).
3. Abrir o Swagger: **http://localhost:8000/docs**
4. Descobrir o segredo do webhook do Telegram (usado na Parte 3):
   ```powershell
   docker exec eletrocar_api printenv TELEGRAM_WEBHOOK_SECRET
   ```
   O segredo do webhook PIX, se não estiver no `.env`, é `eletrocar_webhook_dev`.

### Como trocar de usuário no Swagger
Clique em **Authorize** (cadeado, canto superior direito), preencha só **username** e **password** e clique em *Authorize*.
Para trocar de usuário: **Authorize → Logout** e repita com o próximo login.

### Usuários da demonstração
| Login | Senha | PIN | Papéis | Tela inicial |
|---|---|---|---|---|
| `admin` | `admin123` | 1234 | ADMIN + BALCONISTA + ELETRICISTA (dono) | Dashboard financeiro |
| `carlos` | `carlos123` | 1122 | BALCONISTA | Balcão/PDV |
| `marcio` | `marcio123` | 4321 | ELETRICISTA (Telegram 987654321) | Fila de OS |
| `roberto` | `roberto123` | 5566 | ELETRICISTA (Telegram 987654322) | Fila de OS |
| `juliana` | `juliana123` | 3344 | BALCONISTA + ELETRICISTA | Balcão/PDV |

### IDs fixos da carga de demonstração (copie e cole)
| Registro | ID |
|---|---|
| OS-2026-0002 (Onix, FINALIZADA) | `f0000000-0000-4000-8000-000000000002` |
| OS-2026-0004 (Corolla, APROVADA) | `f0000000-0000-4000-8000-000000000004` |
| OS-2026-0007 (Guincho, TRIAGEM, aberta por voz) | `f0000000-0000-4000-8000-000000000007` |
| Caixa aberto do turno | `e0000000-0000-4000-8000-000000000003` |
| Cliente João Paulo / carro Gol | `c0000000-0000-4000-8000-000000000001` / `d0000000-0000-4000-8000-000000000001` |
| Cliente Transportadora TransRápido | `c0000000-0000-4000-8000-000000000003` |
| Usuária Juliana | `a0000000-0000-4000-8000-000000000005` |
| Peça Alternador Bosch 90A | `b0000000-0000-4000-8000-000000000002` |
| Peça Bateria Moura 60Ah | `b0000000-0000-4000-8000-000000000003` |
| Peça Bobina de Ignição Bosch (R$ 250,00) | `b0000000-0000-4000-8000-000000000008` |
| Peça Relé Auxiliar 4 Pinos (R$ 25,00) | `b0000000-0000-4000-8000-000000000011` |
| Peça Lâmpada H7 Osram (R$ 55,00) | `b0000000-0000-4000-8000-000000000016` |
| Peça Sonda Lambda Bosch | `b0000000-0000-4000-8000-000000000019` |
| Peça Chave Geral de Bateria | `b0000000-0000-4000-8000-000000000023` |
| Peça Sirene de Marcha Ré | `b0000000-0000-4000-8000-000000000025` |
| Título a receber vencido (TransRápido) | `80000000-0000-4000-8000-000000000004` |
| Título a pagar (Energia elétrica) | `80000000-0000-4000-8000-000000000002` |

---

## Parte 1: Status e segurança (sem Authorize)

**1.1 · `GET /health`**: a API está no ar.
✅ `200` → `{"status": "online", ...}`

**1.2 · `GET /api/v1/pecas/barcode/{code}`** com `code` = `7891049281023`, sem login.
✅ `401` → `"Autenticação requerida."` (nenhuma rota de negócio é pública).

**1.3 · Proteção contra força bruta: `POST /api/v1/auth/login`**. Execute **5 vezes** com a senha errada:
```json
{ "username": "juliana", "password": "senha-errada" }
```
✅ Cada tentativa retorna `401`. Agora envie a **senha correta**:
```json
{ "username": "juliana", "password": "juliana123" }
```
✅ `429` → `"Muitas tentativas incorretas. Tente novamente em 900 segundos."` A conta fica bloqueada por 15 minutos; a Juliana não é usada para login no resto do roteiro.

**1.4 · Redirecionamento por perfil: `POST /api/v1/auth/login`**
```json
{ "username": "marcio", "password": "marcio123" }
```
✅ `usuario.tela_inicial = "FILA_OS"` e `modulos = ["FILA_OS", "ORDENS_SERVICO", "CLIENTES", "ESTOQUE"]`.

**1.5 ·** Repita com `{ "username": "carlos", "password": "carlos123" }`.
✅ `tela_inicial = "BALCAO_PDV"`, mais `access_token`, `refresh_token` e `expira_em_segundos`. O refresh também vai em cookie HTTP-Only.

**1.6 ·** Repita com `{ "username": "admin", "password": "admin123" }`.
✅ `papeis = ["ADMIN", "BALCONISTA", "ELETRICISTA"]` (dono multi-perfil) e `tela_inicial = "DASHBOARD_FINANCEIRO"`.

---

## Parte 2: Oficina (🔐 Authorize como `marcio` / `marcio123`)

**2.1 · `GET /api/v1/ordens-servico`** com `status` = `APROVADO`.
✅ Retorna a **OS-2026-0004**: *Toyota Corolla 2.0 XEi DirectShift (2020) [COR9H12]*.

**2.2 · `GET /api/v1/pecas/barcode/{code}`** com `code` = `7893049581035` (motor de partida Denso, alocado nessa OS).
✅ `estoque_atual: 4`, `estoque_reservado: 1`, `estoque_disponivel: 3`. A peça da OS fica **reservada**, fora do saldo do balcão.

**2.3 · `PATCH /api/v1/ordens-servico/{os_id}/status`** com `os_id` = `f0000000-0000-4000-8000-000000000004`. Execute em sequência:
```json
{ "novo_status": "EM_EXECUCAO" }
```
```json
{ "novo_status": "TESTES_ELETRICOS" }
```
```json
{ "novo_status": "FINALIZADO" }
```
✅ Cada chamada retorna `200` com o novo status.

**2.4 ·** Repita o passo **2.2**.
✅ `estoque_atual: 3`, `estoque_reservado: 0`: a **baixa automática** acontece na finalização da OS.

**2.5 · Máquina de estados:** `PATCH .../status` na mesma OS com:
```json
{ "novo_status": "TRIAGEM" }
```
✅ `422` → `"Transição de status inválida na Ordem de Serviço: 'FINALIZADO' -> 'TRIAGEM'."`

**2.6 · RBAC: `POST /api/v1/vendas`** (o eletricista tenta vender)
```json
{ "itens": [ { "peca_id": "b0000000-0000-4000-8000-000000000011", "quantidade": 1 } ] }
```
✅ `403` → `"Acesso restrito aos perfis: ADMIN, BALCONISTA."`

**2.7 · Abrir OS no balcão: `POST /api/v1/ordens-servico`**
```json
{
  "cliente_id": "c0000000-0000-4000-8000-000000000001",
  "carro_id": "d0000000-0000-4000-8000-000000000001",
  "sintomas": "Alternador com ruído e luz da bateria piscando em marcha lenta",
  "hipotese_diagnostica": "Rolamento do alternador e regulador desgastados",
  "checklist_eletrico": { "bateria": "12.3V", "alternador": "13.1V oscilando" },
  "prioridade": "ALTA"
}
```
✅ `201` → **OS-2026-0009** em `TRIAGEM` (numeração sequencial atômica). **Copie o `id`.**

**2.8 · Reservar peça: `POST /api/v1/ordens-servico/{os_id}/pecas`** (id da OS-2026-0009)
```json
{ "peca_id": "b0000000-0000-4000-8000-000000000002", "quantidade": 1 }
```
✅ `valor_pecas: "680.00"`; o alternador fica reservado.

**2.9 · Mão de obra: `POST /api/v1/ordens-servico/{os_id}/servicos`**
```json
{ "descricao": "Substituição do alternador e teste de carga", "valor": "180.00" }
```
✅ `valor_total: "860.00"`.

**2.10 · Orçamento térmico: `GET /api/v1/ordens-servico/{os_id}/orcamento`**
- `formato` = `texto` → orçamento formatado para bobina de 80 mm (*ORCAMENTO DE SERVICO*).
- `formato` = `pdf` → link **Download file** com o PDF térmico.

---

## Parte 3: Telegram Voice Bot (sem Authorize: o bot usa segredo de webhook)

> Sem `TELEGRAM_BOT_TOKEN`, `WHISPER_API_KEY` e `ANTHROPIC_API_KEY` configurados, a API roda em **modo simulado**:
> as mensagens do bot aparecem no log (`docker logs eletrocar_api`, linhas `[Telegram simulado]`).
> O pipeline completo áudio → Whisper → IA → OS é coberto pelos testes automatizados (Parte 6).

**3.1 · `POST /api/v1/telegram/webhook`** sem preencher o header, com o corpo:
```json
{
  "update_id": 1001,
  "callback_query": {
    "id": "cb-demo-1",
    "from": { "id": 987654322 },
    "message": { "chat": { "id": 987654322 } },
    "data": "confirmar:f0000000-0000-4000-8000-000000000007"
  }
}
```
✅ `401` → `"Webhook do Telegram não autorizado."`

**3.2 ·** Mesmo corpo, preenchendo **x-telegram-bot-api-secret-token** com o segredo da preparação (passo 0.4).
✅ `200` → `"✅ OS OS-2026-0007 confirmada e enviada para orçamento."` (botão **[Confirmar]** apertado pelo eletricista Roberto).
Confira com `GET /api/v1/ordens-servico/{os_id}` (Authorize como `marcio`): status `ORCAMENTO_PENDENTE`.

**3.3 · Áudio de alguém fora da whitelist:** mesmo header, corpo:
```json
{
  "update_id": 1002,
  "message": {
    "message_id": 1,
    "from": { "id": 555000111 },
    "chat": { "id": 555000111 },
    "voice": { "file_id": "AwACAgEAAxkBAAIBdemo", "duration": 12 }
  }
}
```
✅ `200` → `"Usuário do Telegram '555000111' não autorizado a abrir Ordens de Serviço."` O áudio nem é baixado.

**3.4 ·** Repita com `"from": { "id": 987654321 }` e `"chat": { "id": 987654321 }` (Márcio, autorizado).
✅ Em modo simulado: `"TELEGRAM_BOT_TOKEN não configurado: não é possível baixar o áudio."`. Com as chaves configuradas, a OS é criada e o card com **[Confirmar] [Editar] [Ver no Sistema]** chega no Telegram.

---

## Parte 4: Balcão / PDV (🔐 Authorize como `carlos` / `carlos123`)

**4.1 · `GET /api/v1/caixa/status`**
✅ Caixa `ABERTO` com `saldo_inicial` e `quantidade_movimentacoes`, **sem saldo teórico**: o operador não vê quanto deveria ter no caixa (fechamento cego).

**4.2 · Busca por aplicação: `GET /api/v1/pecas/search`** com `q` = `alternador gol 1.6`
✅ Apenas `ALT-BOSCH-12V`, com `estoque_disponivel: 4` (1 reservado para a OS-2026-0009).
Experimente também `q` = `F000BL0662` (código original Bosch).

**4.3 · Venda rápida: `POST /api/v1/vendas`**
```json
{
  "itens": [
    { "peca_id": "b0000000-0000-4000-8000-000000000011", "quantidade": 2 },
    { "peca_id": "b0000000-0000-4000-8000-000000000016", "quantidade": 1 }
  ],
  "desconto": "5.00",
  "forma_pagamento": "DINHEIRO"
}
```
✅ `201` → **VB-2026-0007**, `valor_total: "100.00"` (2 × 25 + 55 − 5; desconto de 4,76%, dentro da alçada de 5% do balconista). **Copie o `id`.**

**4.4 · Desconto acima da alçada: `POST /api/v1/vendas`**
```json
{
  "itens": [ { "peca_id": "b0000000-0000-4000-8000-000000000003", "quantidade": 1 } ],
  "desconto_percentual": "15",
  "forma_pagamento": "CARTAO_CREDITO"
}
```
✅ `403` → `AutorizacaoGerencialNecessaria`.

**4.5 ·** Mesmo pedido com o **PIN do gestor**:
```json
{
  "itens": [ { "peca_id": "b0000000-0000-4000-8000-000000000003", "quantidade": 1 } ],
  "desconto_percentual": "15",
  "forma_pagamento": "CARTAO_CREDITO",
  "autorizacao": { "identificador_gestor": "admin", "pin": "1234" }
}
```
✅ `201` → **VB-2026-0008**, `valor_total: "415.65"`, com `autorizado_por_id` do administrador (fica na auditoria).

**4.6 · Estoque insuficiente: `POST /api/v1/vendas`**
```json
{ "itens": [ { "peca_id": "b0000000-0000-4000-8000-000000000025", "quantidade": 999 } ] }
```
✅ `422` → `"Estoque insuficiente para a peça 'Sirene de Marcha Ré Bivolt 12V/24V DNI'. Disponível: 15, Requisitado: 999."`

**4.7 · Cobrança PIX: `POST /api/v1/pagamentos/pix/cobrancas`**
```json
{ "valor": "250.00", "descricao": "Bobina de ignição" }
```
✅ `201` → `status: "PENDENTE"` e `copia_e_cola` iniciando em `000201...br.gov.bcb.pix` (BR Code com CRC). **Copie o `id` e o `txid`.**

**4.8 · Tentar vender antes da confirmação: `POST /api/v1/vendas`**
```json
{
  "itens": [ { "peca_id": "b0000000-0000-4000-8000-000000000008", "quantidade": 1 } ],
  "forma_pagamento": "PIX",
  "cobranca_pix_id": "COLE_O_ID_DA_COBRANCA"
}
```
✅ `400` → `"O pagamento PIX ainda não foi confirmado pelo banco."`

**4.9 · Banco confirma o PIX: `POST /api/v1/pagamentos/pix/webhook`**, com header **x-webhook-secret** = `eletrocar_webhook_dev`:
```json
{ "txid": "COLE_O_TXID", "valor": "250.00", "end_to_end_id": "E18236120202610131200s0DEMO01" }
```
✅ `status: "LIQUIDADA"` (e o evento `PIX_LIQUIDADO` vai por WebSocket para o balcão).

**4.10 ·** Repita o passo **4.8**.
✅ `201` → **VB-2026-0009** paga por PIX; a cobrança fica vinculada e não pode ser usada de novo.

**4.11 · Venda faturada para frota: `POST /api/v1/vendas`**
```json
{
  "itens": [ { "peca_id": "b0000000-0000-4000-8000-000000000011", "quantidade": 4 } ],
  "forma_pagamento": "FATURADO",
  "cliente_id": "c0000000-0000-4000-8000-000000000003"
}
```
✅ `201` → **VB-2026-0010**, `valor_total: "100.00"`. Não entra no caixa: gera **conta a receber** para 30 dias. **Copie o `id`.**

**4.12 · Recibo: `GET /api/v1/vendas/{venda_id}/recibo`**
- Venda da 4.11 com `formato` = `whatsapp` → `link_whatsapp: "https://wa.me/551134567890?text=..."` (telefone do cliente).
- Venda da 4.3 com `largura` = `58` e `formato` = `pdf` → PDF para bobina de 58 mm.

**4.13 · Faturar OS e liberar o veículo: `POST /api/v1/ordens-servico/{os_id}/faturar`** com `os_id` = `f0000000-0000-4000-8000-000000000002`
```json
{ "forma_pagamento": "CARTAO_DEBITO" }
```
✅ `status: "ENTREGUE"`, `valor_total: "730.00"` (peças 530 + mão de obra 220 − desconto 20). O valor entra no caixa.

**4.14 · Troca rápida de operador (Lock Screen): `POST /api/v1/auth/pin-switch`**
```json
{ "usuario_id": "a0000000-0000-4000-8000-000000000005", "pin": "3344" }
```
✅ Novo token da **Juliana Vendas e Caixa**, sem digitar senha e sem fechar o caixa.

**4.15 · RBAC: `GET /api/v1/relatorios/dre`**
✅ `403`: o balconista não acessa o DRE.

**4.16 · Fechamento cego: `POST /api/v1/caixa/fechamento-cego`** (o operador informa o que contou)
```json
{
  "valores_contados": {
    "DINHEIRO": "300.00",
    "PIX": "2021.00",
    "CARTAO_CREDITO": "685.65",
    "CARTAO_DEBITO": "798.00"
  }
}
```
✅ Apenas a confirmação: `"Caixa fechado. Valores informados registrados para conferência da gerência."`, **sem quebra/sobra** para o operador.

**4.17 · Novo turno: `POST /api/v1/caixa/abrir`**
```json
{ "saldo_inicial": "200.00" }
```
✅ `201`: novo caixa aberto (só pode existir um aberto por vez).

---

## Parte 5: Gestão (🔐 Authorize como `admin` / `admin123`)

**5.1 · Relatório de quebra de caixa: `GET /api/v1/caixa/{caixa_id}/relatorio-fechamento`** com `caixa_id` = `e0000000-0000-4000-8000-000000000003`
✅ `status: "QUEBRA_DE_CAIXA"`, `diferenca_total: "-9.00"`:

| Forma | Teórico | Contado | Diferença |
|---|---|---|---|
| DINHEIRO | 309.00 | 300.00 | **−9.00** |
| PIX | 2021.00 | 2021.00 | 0.00 |
| CARTAO_CREDITO | 685.65 | 685.65 | 0.00 |
| CARTAO_DEBITO | 798.00 | 798.00 | 0.00 |

**5.2 · Cancelar venda: `POST /api/v1/vendas/{venda_id}/cancelar`** (id da VB-2026-0007, passo 4.3)
```json
{ "motivo": "Cliente desistiu da compra" }
```
✅ `status: "CANCELADA"`: o estoque volta e o valor é estornado no caixa aberto.

**5.3 · `GET /api/v1/caixa/gerencial`**
✅ `saldo_teorico_dinheiro: "100.00"` (200 de abertura − 100 do estorno). Só o administrador vê o saldo teórico.

**5.4 · Alterar preço: `PATCH /api/v1/pecas/{peca_id}`** com `peca_id` = `b0000000-0000-4000-8000-000000000002`
```json
{ "preco_venda": "699.90" }
```
✅ `preco_venda: "699.90"`, com log `PRECO_ALTERADO` registrando o antes e o depois.

**5.5 · Entrada de mercadoria: `POST /api/v1/pecas/{peca_id}/entrada`** com `peca_id` = `b0000000-0000-4000-8000-000000000019`
```json
{ "quantidade": 10, "custo_unitario": "185.00", "observacao": "NF 4521 - Distribuidora Bosch" }
```
✅ `estoque_atual: 18`.

**5.6 · Ajuste de inventário: `POST /api/v1/pecas/{peca_id}/ajuste`** com `peca_id` = `b0000000-0000-4000-8000-000000000023`
```json
{ "novo_saldo": 2, "motivo": "Inventário: 7 unidades avariadas" }
```
✅ `estoque_atual: 2`, `abaixo_minimo: true`.

**5.7 · `GET /api/v1/pecas/baixo-estoque`**
✅ Lista `CHV-GERAL-BAT`.

**5.8 · Sugestão de compra por giro médio: `GET /api/v1/pecas/sugestao-compra`** com `dias_analise` = `7` e `dias_cobertura` = `30`
✅ Resultado de 13/10/2026: `BAT-MOURA-60AH` → 6 un., `CHV-GERAL-BAT` → 5 un., `MOT-PART-DENSO` → 4 un.

**5.9 · Cadastrar colaborador: `POST /api/v1/usuarios`**
```json
{
  "nome": "Patrícia Atendente",
  "email": "patricia@eletrocar.com.br",
  "username": "patricia",
  "senha": "patricia123",
  "papeis": ["BALCONISTA"],
  "pin": "7788"
}
```
✅ `201`. **Copie o `id`.** Senha e PIN são gravados apenas como hash bcrypt.

**5.10 · Acumular papéis: `PUT /api/v1/usuarios/{usuario_id}/papeis`**
```json
{ "papeis": ["BALCONISTA", "ELETRICISTA"] }
```
✅ A Patrícia passa a ser balconista e eletricista. Teste `POST /api/v1/auth/login` com `patricia` / `patricia123`: `tela_inicial = "BALCAO_PDV"`.

**5.11 · Inadimplência: `GET /api/v1/financeiro/inadimplencia`**
✅ 1 título vencido de **R$ 1.450,00** (Transportadora TransRápido), com os dias em atraso. A venda faturada da 4.11 ainda não venceu.

**5.12 · Receber o título: `POST /api/v1/financeiro/titulos/{titulo_id}/baixa`** com `titulo_id` = `80000000-0000-4000-8000-000000000004` (use a data do dia):
```json
{ "data_pagamento": "2026-10-13", "forma_pagamento": "PIX" }
```
✅ `status: "PAGO"`; o recebimento entra no caixa aberto.

**5.13 · Pagar a conta de energia:** mesmo endpoint, `titulo_id` = `80000000-0000-4000-8000-000000000002`, mesmo corpo.
✅ `status: "PAGO"`; vira despesa variável no DRE.

**5.14 · DRE gerencial: `GET /api/v1/relatorios/dre`** com `data_inicio` = `2026-10-01` e `data_fim` = `2026-10-31`
✅ Resultado da execução de referência (CMV calculado com o **custo real** de cada item vendido):

| Linha | Valor |
|---|---|
| Receita bruta | 3.817,00 |
| (−) Descontos | 103,35 |
| Receita líquida | 3.713,65 |
| (−) CMV | 2.001,00 |
| (−) Mão de obra | 260,00 |
| Lucro bruto | 1.452,65 |
| (−) Despesas (aluguel + energia) | 4.180,00 |
| **Lucro líquido** | **−2.727,35** |
| Vendas / OS no período | 9 / 2 (a venda cancelada não entra) |

**5.15 · Auditoria imutável: `GET /api/v1/auditoria`**
- `acao` = `PRECO_ALTERADO` → `payload_antes.preco_venda = "680.00"`, `payload_depois.preco_venda = "699.90"`, com IP e usuário.
- sem filtro (`limite` = `100`) → trilha completa: `LOGIN_REALIZADO`, `OPERADOR_TROCADO_POR_PIN`, `DESCONTO_APLICADO`, `VENDA_CANCELADA`, `CAIXA_FECHAMENTO_CEGO`, `PIX_LIQUIDADO`, `OS_FATURADA`, `ESTOQUE_AJUSTADO`, `USUARIO_PAPEIS_ALTERADOS` etc.
  No PostgreSQL um trigger impede `UPDATE`/`DELETE` nesta tabela.

---

## Parte 6: Testes automatizados (terminal)

```powershell
docker exec eletrocar_api pytest
```
✅ **196 testes passando** contra o PostgreSQL real, com **cobertura de ~90%** (mínimo obrigatório: 80%), incluindo:
- pipeline completo de voz (Telegram → Whisper → IA → OS) com gateways simulados;
- vendas simultâneas da última unidade (bloqueio `SELECT ... FOR UPDATE` + bloqueio otimista);
- rollback ACID (falha no último passo desfaz estoque, venda e caixa);
- migrações Alembic idênticas aos modelos e trigger de auditoria imutável.

---

> Para repetir a apresentação do zero: `docker compose down -v` e `docker compose up -d --build`.
