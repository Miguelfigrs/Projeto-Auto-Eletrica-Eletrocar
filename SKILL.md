---
name: especificacao-software
description: Orienta a criação do documento de especificação de software com IA — levantamento de requisitos (funcionais e não funcionais), diagrama de casos de uso (include, extend, herança de ator), diagrama de classes (composição, agregação, herança, persistência), diagrama entidade-relacionamento (DER), diagrama de objetos, diagrama de estados (entidades com ciclo de vida complexo), classes de fronteira/controle/entidade (boundary-control-entity), diagrama de sequência, diagrama de atividades, diagrama de componentes, e orientação de implementação usando DDD, Clean Architecture e TDD. Use quando o usuário pedir para elaborar, revisar ou completar documentação de análise/projeto de software, UML, requisitos de sistema, ou quando for implementar o software a partir desse documento (camadas, entidades de domínio, testes).
---

# Documento de Software (Análise e Projeto)

Guia para produção de documento de software completo. Sempre seguir a ordem abaixo — cada seção alimenta a próxima (requisito → ator/caso de uso → classe → diagrama de atividade).

> **Atenção**: Perguntar ao usuário o domínio do sistema (o que o software faz) antes de começar, se ainda não souber. Sem domínio claro, não inventar requisitos genéricos demais — pedir contexto mínimo (usuários, principais funcionalidades, restrições).

Entregar o documento final como arquivo Markdown no repositório (ex: `docs/documento-software.md`) ou artifact, conforme pedido do usuário. Diagramas em Mermaid (renderizam nativo em artifacts e no GitHub).

---

## 1. Levantamento de Requisitos

Tabela de requisitos funcionais (RF) e não funcionais (RNF), numerados e rastreáveis.

* **Requisito Funcional (RF)**: comportamento/função que o sistema deve executar. Formato: `RFxx` — *Verbo + objeto + condição*.
* **Requisito Não Funcional (RNF)**: qualidade, restrição, atributo (desempenho, segurança, usabilidade, disponibilidade, portabilidade, escalabilidade, conformidade legal). Formato: `RNFxx` — *categoria: descrição + critério mensurável*.

### Template de Requisitos:

| ID | Descrição | Prioridade | Ator / Origem |
| :--- | :--- | :--- | :--- |
| **RF01** | O sistema deve permitir que o Balconista registre vendas via leitor de código de barras | Alta | Balconista |
| **RF02** | O sistema deve permitir que o Mecânico crie OS via comando de voz no Telegram | Alta | Mecânico |
| **RNF01** | O tempo de resposta na leitura do código de barras e baixa deve ser < 200ms | Alta | Desempenho |
| **RNF02** | Todas as operações de cancelamento e desconto devem gerar logs imutáveis | Alta | Segurança / Auditoria |

* **Categorias RNF comuns**: Desempenho, Segurança, Usabilidade, Confiabilidade, Manutenibilidade, Portabilidade, Escalabilidade, Compliance/Legal.
* *Rastreabilidade*: Cada RF vira candidato a caso de uso na Seção 2. Cada RNF vira restrição de arquitetura/design.

---

## 2. Diagrama de Casos de Uso

### Elementos Obrigatórios:
* **Atores**: Papéis externos (pessoa, sistema externo, tempo/cron). Ator primário inicia caso de uso; secundário participa.
* **Herança de Ator**: Ator especializado herda casos de uso do ator geral (ex: `Administrador --|> Usuario`).
* **`<<include>>`**: Comportamento obrigatório, sempre executado, fatorado de múltiplos casos de uso (seta tracejada, caso-base → caso incluído).
* **`<<extend>>`**: Comportamento opcional/condicional, insere-se em ponto de extensão do caso base (seta tracejada, caso-extensão → caso-base).

### Representação em Mermaid:

```mermaid
flowchart LR
    subgraph Atores
        Operador["👤 Balconista"]
        Mecanico["👤 Eletricista"]
        Admin["👤 Administrador"]
        Admin -->|Herda| Operador
    end

    subgraph Sistema Auto Elétrica
        UC01(["UC01: Autenticar no Sistema"])
        UC02(["UC02: Realizar Venda no Balcão"])
        UC03(["UC03: Ler Código de Barras"])
        UC04(["UC04: Aplicar Desconto Gerencial"])
        UC05(["UC05: Abrir Ordem de Serviço"])
        UC06(["UC06: Enviar Áudio Telegram"])
        UC07(["UC07: Emitir DRE Gerencial"])

        Operador --> UC02
        UC02 -.->|<<include>>| UC03
        UC04 -.->|<<extend>>| UC02
        
        Mecanico --> UC06
        UC06 -.->|<<include>>| UC05
        
        Admin --> UC07
    end
```

### Descrição Textual de Casos de Uso:
Para cada caso de uso relevante:
* **Ator Principal**: Quem dispara.
* **Pré-condições**: Estado necessário antes da execução.
* **Fluxo Principal**: Passo a passo do caminho feliz.
* **Fluxos Alternativos / Exceções**: Tratamento de desvios e erros.
* **Pós-condições**: Estado garantido após a execução.

---

## 3. Diagrama de Classes

Extrair classes candidatas dos substantivos dos casos de uso e requisitos. Definir atributos, métodos, visibilidade (`+` public, `-` private, `#` protected) e multiplicidade.

### Relações a Diferenciar:
* **Herança / Generalização**: `ClasseFilha --|> ClasseMae` ("É um").
* **Composição**: Parte não existe sem o todo (`*--`). Ciclo de vida dependente.
* **Agregação**: Parte pode existir independente do todo (`o--`). Vínculo fraco.
* **Associação Simples**: Relação de uso com multiplicidade.

### Representação em Mermaid:

```mermaid
classDiagram
    class Usuario {
        +UUID id
        +String nome
        +String email
        +String senhaHash
        +Role role
        +autenticar(senha) bool
    }

    class Cliente {
        +UUID id
        +String nome
        +String cpfCnpj
        +adicionarCarro(carro)
    }

    class Carro {
        +UUID id
        +String modelo
        +String marca
        +String ano
    }

    class OrdemServico {
        +UUID id
        +String numeroOS
        +DateTime dataAbertura
        +StatusOS status
        +adicionarItem(peca, qtd)
        +finalizarOS()
    }

    class ItemOS {
        +UUID id
        +int quantidade
        +Decimal precoUnitario
        +subtotal() Decimal
    }

    class Peca {
        +UUID id
        +String codigoBarras
        +String sku
        +String descricao
        +Decimal precoVenda
        +int estoqueAtual
        +baixarEstoque(qtd)
    }

    Cliente "1" *-- "1..*" Carro : possui
    Cliente "1" o-- "0..*" OrdemServico : solicita
    OrdemServico "1" *-- "1..*" ItemOS : contem
    ItemOS "1" --> "1" Peca : referencia
```

### Tabela de Persistência:

| Classe | Persistente? | Estratégia | Observação |
| :--- | :---: | :--- | :--- |
| **Usuario** | Sim | Tabela `usuarios`, PK `id` | Criptografia Bcrypt na senha |
| **Cliente** | Sim | Tabela `clientes`, PK `id` | CPF/CNPJ opcional |
| **Carro** | Sim | Tabela `carros`, FK `cliente_id` | Composição com Cliente |
| **OrdemServico** | Sim | Tabela `ordens_servico`, PK `id` | Ciclo de vida controlado por State Machine |
| **ItemOS** | Sim | Tabela `itens_os`, FK `ordem_servico_id` | Composição com OrdemServico |
| **Peca** | Sim | Tabela `pecas`, PK `id` | Índices B-Tree em `codigo_barras` e `sku` |
| **StatusOS** | Não (Enum) | Coluna `status` (VARCHAR/ENUM) | Valor embutido |

---

## 3.1. Diagrama Entidade-Relacionamento (DER)

Derivado diretamente da tabela de persistência. Mostra chaves primárias (PK), chaves estrangeiras (FK) e tipos relacionais.

```mermaid
erDiagram
    CLIENTES ||--|{ CARROS : possui
    CLIENTES ||--o{ ORDENS_SERVICO : solicita
    ORDENS_SERVICO ||--|{ ITENS_OS : contem
    PECAS ||--o{ ITENS_OS : referencia
    USUARIOS ||--o{ ORDENS_SERVICO : abre

    CLIENTES {
        uuid id PK
        varchar nome
        varchar cpf_cnpj
        timestamp created_at
    }

    CARROS {
        uuid id PK
        uuid cliente_id FK
        varchar modelo
        varchar marca
        varchar ano
    }

    ORDENS_SERVICO {
        uuid id PK
        uuid cliente_id FK
        uuid carro_id FK
        uuid usuario_id FK
        varchar status
        text sintomas
        decimal valor_total
        timestamp created_at
    }

    ITENS_OS {
        uuid id PK
        uuid ordem_servico_id FK
        uuid peca_id FK
        int quantidade
        decimal preco_unitario
    }

    PECAS {
        uuid id PK
        varchar codigo_barras
        varchar sku
        varchar descricao
        decimal preco_venda
        int estoque_atual
    }

    USUARIOS {
        uuid id PK
        varchar nome
        varchar email
        varchar senha_hash
        varchar role
    }
```

---

## 4. Diagrama de Objetos

Instantâneo (*snapshot*) de tempo de execução exemplificando instâncias reais, valores e relacionamentos:

```mermaid
classDiagram
    class ClienteExemplo {
        id = "c1a2-9901"
        nome = "Carlos Silva"
        cpfCnpj = null
    }

    class CarroExemplo {
        id = "ca01-8812"
        modelo = "Gol 1.6"
        marca = "Volkswagen"
        ano = "2019"
    }

    class OSExemplo {
        id = "os-2026-0042"
        status = EM_ANDAMENTO
        sintomas = "Alternador não carrega"
    }

    class PecaExemplo {
        id = "p-10492"
        codigoBarras = "7891049281023"
        sku = "ALT-BOSCH-12V"
        descricao = "Regulador de Voltagem Bosch 12V"
        precoVenda = 185.00
    }

    ClienteExemplo -- CarroExemplo : vinculado
    ClienteExemplo -- OSExemplo : titular
    OSExemplo -- PecaExemplo : alocada
```

---

## 5. Diagrama de Estados (Ciclo de Vida Complexo)

Obrigatório para entidades com máquina de estados finitos e regras de transição.

### Ciclo de Vida da Ordem de Serviço (`OrdemServico`):

```mermaid
stateDiagram-v2
    [*] --> Triagem : Criada (Balcão ou Voz Telegram)
    Triagem --> OrcamentoPendente : Dados Iniciais Preenchidos
    OrcamentoPendente --> Aprovado : Cliente Aprova Orçamento
    OrcamentoPendente --> Cancelado : Orçamento Recusado
    
    Aprovado --> EmExecucao : Eletricista Inicia Serviço
    EmExecucao --> AguardandoPeca : Falta Peça no Estoque
    AguardandoPeca --> EmExecucao : Peça Recebida / Alocada
    
    EmExecucao --> TestesEletricos : Montagem Concluída
    TestesEletricos --> Finalizado : Aprovado no Checklist
    TestesEletricos --> EmExecucao : Falha no Teste
    
    Finalizado --> Entregue : Pagamento Confirmado & Veículo Liberado
    
    Entregue --> [*]
    Cancelado --> [*]
```

---

## 6. Classes de Fronteira, Controle e Entidade (BCE)

Separação conceitual precursora da Clean Architecture:
* **Boundary (Fronteira)**: Telas, interfaces REST, listeners de leitor, webhooks do Telegram (`XxxController`, `XxxView`, `XxxWebhook`).
* **Control (Controle)**: Casos de uso e orquestração de regras (`XxxUseCase`, `XxxService`).
* **Entity (Entidade)**: Modelos puros de domínio persistentes (`Cliente`, `Peca`, `OrdemServico`).

```mermaid
flowchart LR
    subgraph Boundary
        B1["📱 TelegramWebhookController"]
        B2["💻 BalcaoPDVController"]
        B3["📡 BarcodeReaderListener"]
    end

    subgraph Control
        C1["⚙️ CriarOSPorVozUseCase"]
        C2["⚙️ RealizarVendaBalcaoUseCase"]
        C3["⚙️ BaixarEstoqueUseCase"]
    end

    subgraph Entity
        E1[("📦 Peca")]
        E2[("📋 OrdemServico")]
        E3[("👤 Cliente")]
    end

    B1 --> C1
    B2 --> C2
    B3 --> C3

    C1 --> E2
    C1 --> E3
    C2 --> E1
    C2 --> E2
    C3 --> E1
```

---

## 7. Diagrama de Sequência

Detalha a ordem temporal de mensagens, validações, chamadas assíncronas e retornos.

### Caso de Uso: Abertura de OS via Telegram Voice Bot

```mermaid
sequenceDiagram
    autonumber
    actor Mecanico as Eletricista
    participant Webhook as TelegramWebhookController (Boundary)
    participant ASR as WhisperEngine (Service)
    participant LLM as LLMExtractor (Service)
    participant UseCase as CriarOSPorVozUseCase (Control)
    participant DB as PostgresRepository (Infra/Entity)
    participant WS as WebSocketNotifier (Boundary)

    Mecanico->>Webhook: Envia áudio (.ogg)
    Webhook->>Webhook: Valida Telegram ID na Whitelist
    Webhook->>ASR: Transcrever áudio
    ASR-->>Webhook: Texto: "Gol do Carlos, alternador com defeito"
    Webhook->>LLM: Extrair JSON estruturado
    LLM-->>Webhook: {cliente: "Carlos", carro: "Gol", sintomas: "Alternador"}
    Webhook->>UseCase: executar(dadosExtraidos)
    UseCase->>DB: findOrCreateClienteECarro("Carlos", "Gol")
    DB-->>UseCase: clienteId, carroId
    UseCase->>DB: salvarNovaOS(OrdemServico)
    DB-->>UseCase: osCriada (Status: Triagem)
    UseCase->>WS: notificarNovoAtendimento(osCriada)
    UseCase-->>Webhook: confirmação com dados da OS
    Webhook-->>Mecanico: Card interativo [Confirmar] [Editar]
```

---

## 8. Diagrama de Atividades

Mapeia o fluxo de processo de negócio com bifurcações, validações e decisões.

```mermaid
flowchart TD
    Inicio([Início: Leitura de Peça no Balcão]) --> Leitura[Leitor lê Código de Barras / EAN-13]
    Leitura --> Validacao{Código Existe no Estoque?}
    
    Validacao -- Não --> BuscaFuzzy[Busca Manual por SKU / Descrição]
    BuscaFuzzy --> ItemEncontrado{Encontrou Item?}
    ItemEncontrado -- Não --> AlertaErro[Notifica Produto Não Encontrado] --> Fim([Fim])
    ItemEncontrado -- Sim --> VerificaSaldo
    
    Validacao -- Sim --> VerificaSaldo{Estoque Atual > 0?}
    
    VerificaSaldo -- Não --> AlertaSemEstoque[Alerta: Estoque Zerado / Solicitar Reposição]
    AlertaSemEstoque --> PermiteVendaSemEstoque{Permite Venda sob Encomenda?}
    PermiteVendaSemEstoque -- Não --> Fim
    PermiteVendaSemEstoque -- Sim --> AdicionaItem
    
    VerificaSaldo -- Sim --> AdicionaItem[Adiciona Item ao Carrinho / OS]
    AdicionaItem --> FinalizaVenda{Finalizar Atendimento?}
    
    FinalizaVenda -- Não --> Leitura
    FinalizaVenda -- Sim --> FormaPagamento[Seleciona Meio: PIX / Cartão / Dinheiro]
    FormaPagamento --> ProcessaPagamento[Registra Baixa Atômica no Estoque e no Caixa]
    ProcessaPagamento --> EmiteComprovante[Emite Comprovante Térmico / WhatsApp]
    EmiteComprovante --> Concluido([Venda Concluída])
```

---

## 9. Diagrama de Componentes (Clean Architecture)

Estruturação das camadas respeitando a Regra de Dependência (camadas externas dependem das internas).

```mermaid
flowchart TD
    subgraph UI_Frameworks ["Camada 4: Frameworks & Drivers (Infraestrutura)"]
        FastAPIWeb["FastAPI Router / WebSockets"]
        PostgresDB["PostgreSQL 16 Engine"]
        TelegramAPI["Telegram Bot Webhook"]
        SerialWedge["Web Serial / HID Listener"]
    end

    subgraph Interface_Adapters ["Camada 3: Interface Adapters (Controladores e Repositórios)"]
        AuthController["AuthController"]
        VendaController["VendaController"]
        OSController["OSController"]
        PecaRepoImpl["PecaRepositoryPostgres"]
        OSRepoImpl["OSRepositoryPostgres"]
    end

    subgraph Application_Layer ["Camada 2: Application (Casos de Uso)"]
        UC_Auth["AutenticarUsuarioUseCase"]
        UC_Venda["RealizarVendaBalcaoUseCase"]
        UC_Voz["CriarOSPorVozUseCase"]
        UC_DRE["GerarDREUseCase"]
    end

    subgraph Domain_Layer ["Camada 1: Domain (Entidades e Regras de Negócio)"]
        Ent_Peca["Entidade: Peca"]
        Ent_OS["Entidade: OrdemServico"]
        Ent_Cliente["Entidade: Cliente"]
        Repo_Interfaces["Interfaces: PecaRepository, OSRepository"]
    end

    FastAPIWeb --> AuthController
    FastAPIWeb --> VendaController
    FastAPIWeb --> OSController
    TelegramAPI --> OSController
    SerialWedge --> VendaController

    AuthController --> UC_Auth
    VendaController --> UC_Venda
    OSController --> UC_Voz

    UC_Venda --> Repo_Interfaces
    UC_Voz --> Repo_Interfaces
    PecaRepoImpl -.->|Implementa| Repo_Interfaces
    OSRepoImpl -.->|Implementa| Repo_Interfaces
    PostgresDB --> PecaRepoImpl
    PostgresDB --> OSRepoImpl

    UC_Venda --> Ent_Peca
    UC_Voz --> Ent_OS
    UC_Voz --> Ent_Cliente
```

---

## 10. Implementação: DDD, Clean Architecture e TDD

### 10.1. Domain-Driven Design (DDD)
* **Aggregate Root**: `OrdemServico` (gerencia seus `ItensOS`), `Cliente` (gerencia seus `Carros`).
* **Value Objects**: `Dinheiro`, `CPF_CNPJ`, `CodigoBarras`, `PeriodoDRE`.
* **Domain Services**: `CalculadoraMargemLucroService`, `ConciliadorCaixaService`.
* **Repository Interfaces**: Declaradas no domínio (`peca_repository.py`), implementadas na infraestrutura.

### 10.2. Estrutura de Diretórios Padronizada
```
src/
├── domain/                  # Camada mais interna (Zero dependências externas)
│   ├── entities/            # Peca, OrdemServico, Cliente, Usuario
│   ├── value_objects/       # Dinheiro, CodigoBarras
│   └── repositories/        # Interfaces abstratas de persistência
├── application/             # Casos de uso e orquestração
│   ├── use_cases/           # RealizarVendaUseCase, CriarOSPorVozUseCase
│   └── dtos/                # Schemas de entrada e saída (Pydantic DTOs)
├── adapters/                # Controladores, gateways e adaptadores
│   ├── controllers/         # Endpoints FastAPI, Handlers Telegram
│   └── repositories/        # Implementações SQLAlchemy / Postgres
└── infra/                   # Configurações de banco, drivers e integrações
    ├── database/            # Conexão assíncrona Postgres
    └── integrations/        # Whisper Engine, Telegram Bot API
```

### 10.3. Test-Driven Development (TDD)
* **Ciclo Red → Green → Refactor**:
  1. **Teste de Domínio**: Testar regras de negócio puras (ex: cálculo de desconto, transição de estado da OS) sem instanciar banco de dados.
  2. **Teste de Caso de Uso**: Testar fluxos de aplicação usando repositórios em memória (*Fake Repository*).
  3. **Teste de Integração**: Testar endpoints HTTP e consultas reais do PostgreSQL.
* **Rastreabilidade Obrigatória**: Cada Requisito Funcional (`RFxx`) deve possuir ao menos uma suíte de testes unitários ou de integração vinculada.

---

## Checklist Final de Qualidade

- [x] Requisitos Funcionais e Não Funcionais tabulados e mensuráveis.
- [x] Diagrama de Casos de Uso com herança de atores e include/extend.
- [x] Diagrama de Classes com multiplicidades, composição, agregação e tabela de persistência.
- [x] Diagrama Entidade-Relacionamento (DER) rigoroso.
- [x] Diagrama de Objetos exemplificando cenário concreto.
- [x] Diagrama de Estados para ciclo de vida de OS.
- [x] Classes Boundary-Control-Entity (BCE) mapeadas por caso de uso.
- [x] Diagrama de Sequência detalhando fluxo síncrono/assíncrono.
- [x] Diagrama de Atividades com forks, joins e decisões de balcão.
- [x] Diagrama de Componentes alinhado à Clean Architecture.
- [x] Mapeamento DDD, diretórios e plano de testes TDD.
