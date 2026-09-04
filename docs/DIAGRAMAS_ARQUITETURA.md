# Diagramas de Arquitetura e Fluxo Operacional
## Auto Elétrica Eletrocar

---

## 1. Visão Geral da Arquitetura do Sistema (Ponta a Ponta)

Este diagrama ilustra a integração completa entre os terminais de atendimento, os dispositivos móveis da oficina, o pipeline de inteligência artificial por voz (Telegram), a API em FastAPI e a persistência relacional em PostgreSQL.

```mermaid
flowchart TB
    %% ==========================================
    %% CAMADA DE ATORES E DISPOSITIVOS
    %% ==========================================
    subgraph Atores_Dispositivos ["👥 Atores, Dispositivos e Entradas de Hardware"]
        direction LR
        subgraph Balcao ["Terminal de Balcão (PDV)"]
            Balconista["👤 Balconista"]
            Leitor["📟 Leitor de Código de Barras<br/>(USB / Bluetooth HID & Web Serial)"]
            Balconista -->|Opera por Teclado F1-F9| TelaPDV["💻 PDV PWA (React + Service Workers Offline)"]
            Leitor -->|Leitura Contínua < 25ms| TelaPDV
        end

        subgraph Baia_Oficina ["Baia de Trabalho / Elevador"]
            Mecanico["👤 Eletricista / Mecânico"]
            Mecanico -->|Grava Áudio de 15s| TelegramApp["📱 Telegram App (Mobile)"]
        end

        subgraph Gestao ["Administração & Retaguarda"]
            Admin["👤 Gestor / Admin"]
            Admin -->|Acessa DRE e Caixa| PainelAdmin["📊 Painel Administrativo Web"]
        end
    end

    %% ==========================================
    %% CAMADA DE FRONTEIRA E SEGURANÇA
    %% ==========================================
    subgraph Gateway ["🌐 Borda & Gateways de Comunicação"]
        Nginx["🛡️ Nginx Reverse Proxy (HTTPS / WSS / TLS 1.3)"]
        TelegramWebhook["🤖 Telegram Webhook Receiver"]
        WebSocketServer["⚡ WebSocket Event Server (Tempo Real)"]
    end

    TelaPDV -->|HTTPS REST| Nginx
    PainelAdmin -->|HTTPS REST| Nginx
    TelegramApp -->|Telegram Bot API| TelegramWebhook
    TelegramWebhook --> Nginx
    Nginx --> WebSocketServer
    WebSocketServer -.->|Push de Nova OS / Notificações| TelaPDV

    %% ==========================================
    %% CAMADA DE APLICAÇÃO E IA (FASTAPI)
    %% ==========================================
    subgraph Backend_FastAPI ["⚙️ Camada de Aplicação (Python FastAPI)"]
        direction TB
        
        subgraph Pipeline_IA ["🧠 Pipeline de IA e Processamento de Voz"]
            Whisper["🎙️ Whisper ASR Engine<br/>(Transcrição de Áudio PT-BR)"]
            LLMExtractor["🧩 LLM Entity Extractor<br/>(JSON Schema + Dicionário Elétrico)"]
            Whisper --> LLMExtractor
        end

        subgraph UseCases ["📦 Casos de Uso (Application Layer)"]
            UC_Auth["🔐 AutenticarUsuarioUseCase (JWT / RBAC)"]
            UC_Venda["🛒 RealizarVendaBalcaoUseCase"]
            UC_Estoque["📦 BaixarEstoqueAutomaticoUseCase"]
            UC_OS["📋 CriarOSPorVozUseCase"]
            UC_Financeiro["💰 FecharCaixaCegoUseCase & GerarDREUseCase"]
        end
    end

    Nginx --> UC_Auth
    Nginx --> UC_Venda
    Nginx --> UC_Estoque
    Nginx --> UC_Financeiro
    TelegramWebhook --> Pipeline_IA
    Pipeline_IA -->|JSON Estruturado| UC_OS

    %% ==========================================
    %% CAMADA DE DOMÍNIO (DDD)
    %% ==========================================
    subgraph Domain_Layer ["🏛️ Camada de Domínio Puro (DDD)"]
        Ent_Cliente["👤 Aggregate: Cliente & Carro(s)"]
        Ent_Peca["📦 Aggregate: Peça & SKU/EAN-13"]
        Ent_OS["📋 Aggregate: Ordem de Serviço & Máquina de Estados"]
        Ent_Caixa["💵 Aggregate: Fluxo de Caixa & Lançamentos"]

        UC_Venda --> Ent_Peca
        UC_Venda --> Ent_Caixa
        UC_Estoque --> Ent_Peca
        UC_OS --> Ent_Cliente
        UC_OS --> Ent_OS
        UC_Financeiro --> Ent_Caixa
    end

    %% ==========================================
    %% CAMADA DE PERSISTÊNCIA (POSTGRESQL)
    %% ==========================================
    subgraph Storage ["🗄️ Persistência e Auditoria (PostgreSQL 16)"]
        Postgres[(🐘 PostgreSQL 16 ACID)]
        AuditLog[(📜 Tabela de Auditoria Imutável)]
        BackupStorage[(💾 Rotina de Backups Diários)]

        Domain_Layer -->|SQLAlchemy Async ORM| Postgres
        UC_Venda -->|Gera Log| AuditLog
        UC_OS -->|Gera Log| AuditLog
        UC_Financeiro -->|Gera Log| AuditLog
        Postgres -.-> BackupStorage
    end
```

---

## 2. Diagrama de Fluxo Operacional de Balcão e Oficina

```mermaid
sequenceDiagram
    autonumber
    actor Balconista as Balconista (Balcão)
    actor Mecanico as Mecânico (Oficina)
    participant Leitor as Leitor de Código
    participant SPA as Web SPA (React)
    participant Bot as Telegram Bot
    participant API as FastAPI Backend
    participant DB as PostgreSQL 16

    %% Fluxo 1: Abertura de OS por Voz
    Note over Mecanico, Bot: 1. Abertura de OS na Baia via Voz
    Mecanico->>Bot: Grava áudio ("Gol do Seu Carlos, alternador em curto")
    Bot->>API: Webhook com áudio .ogg
    API->>API: Whisper ASR + LLM JSON Extraction
    API->>DB: Associa Cliente Carlos, Carro Gol e cria OS (Triagem)
    API-->>SPA: Notificação WebSocket 'Nova OS criada'
    API-->>Bot: Card interativo [✅ Confirmar OS]
    Bot-->>Mecanico: Recebe confirmação no celular

    %% Fluxo 2: Baixa de Peças no Balcão
    Note over Balconista, DB: 2. Atendimento Ágil de Balcão
    Balconista->>Leitor: Dispara gatilho do leitor na peça (EAN-13)
    Leitor->>SPA: Evento Keydown (< 25ms) interceptado sem foco de cursor
    SPA->>API: GET /produtos/barcode/:code
    API->>DB: Consulta indexada B-Tree (< 50ms)
    DB-->>API: Retorna Regulador de Voltagem Bosch
    API-->>SPA: Adiciona ao carrinho + Bip sonoro

    %% Fluxo 3: Fechamento da Venda e Baixa Atômica
    Note over Balconista, DB: 3. Finalização e Baixa Atômica
    Balconista->>SPA: Pressiona F9 (Finalizar) e seleciona PIX
    SPA->>API: POST /vendas/finalizar (Transação ACID)
    API->>DB: Decrementa Estoque + Registra no Caixa + Gera Log de Auditoria
    DB-->>API: Transação Confirmada
    API-->>SPA: Venda concluída em < 2s com recibo pronto
```

---

*Diagramas consolidados de acordo com o padrão de engenharia e especificações da Auto Elétrica Eletrocar.*
