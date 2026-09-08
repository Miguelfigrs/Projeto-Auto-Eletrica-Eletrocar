# 11. Sequência Operacional Balcão e Oficina (Ponta a Ponta)

> **Categoria**: Fluxos Integrados • Operação Diária  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`11_diagrama_sequencia_fluxo_operacional.mmd`](./src/11_diagrama_sequencia_fluxo_operacional.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Visão cronológica dos 3 processos simultâneos: 1. Abertura de OS por voz na oficina, 2. Leitura e consulta rápida no balcão, 3. Fechamento de venda com baixa atômica.

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![11. Sequência Operacional Balcão e Oficina (Ponta a Ponta)](./img/11_diagrama_sequencia_fluxo_operacional.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/11_diagrama_sequencia_fluxo_operacional.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
sequenceDiagram
    autonumber
    actor Balconista as 👤 Balconista (Balcão)
    actor Mecanico as 👤 Mecânico (Oficina)
    participant Leitor as 📟 Leitor Barcode
    participant SPA as 💻 PDV Web (React)
    participant Bot as 📱 Telegram Bot
    participant API as 🚀 FastAPI Backend
    participant DB as 🗄️ PostgreSQL 16

    %% Fluxo 1: Abertura de OS por Voz
    Note over Mecanico, Bot: 1. Abertura de OS na Baia via Comando de Voz
    Mecanico->>Bot: Grava áudio ("Gol do Seu Carlos, alternador em curto")
    Bot->>API: Envia áudio (.ogg) via Webhook
    API->>API: Whisper ASR + LLM JSON Extraction
    API->>DB: Associa Cliente Carlos, Carro Gol e cria OS (Triagem)
    API-->>SPA: Push WebSocket: 'Nova OS criada na baia'
    API-->>Bot: Card interativo [✅ Confirmar OS]
    Bot-->>Mecanico: Recebe confirmação no celular

    %% Fluxo 2: Baixa de Peças no Balcão
    Note over Balconista, DB: 2. Atendimento Ágil com Leitor de Código de Barras
    Balconista->>Leitor: Dispara gatilho do leitor na peça (EAN-13)
    Leitor->>SPA: Evento Keydown (< 25ms) interceptado sem perda de foco
    SPA->>API: GET /produtos/barcode/:code
    API->>DB: Consulta indexada B-Tree (< 50ms)
    DB-->>API: Retorna 'Regulador de Voltagem Bosch'
    API-->>SPA: Adiciona ao carrinho + Bip sonoro imediato

    %% Fluxo 3: Fechamento da Venda e Baixa Atômica
    Note over Balconista, DB: 3. Finalização e Baixa Atômica de Estoque
    Balconista->>SPA: Pressiona F9 (Finalizar) e seleciona PIX
    SPA->>API: POST /vendas/finalizar (Transação ACID)
    API->>DB: Decrementa Estoque + Registra no Caixa + Gera Log de Auditoria
    DB-->>API: Transação Confirmada
    API-->>SPA: Venda concluída em < 2s com recibo pronto para impressão
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
