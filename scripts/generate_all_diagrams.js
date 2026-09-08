import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_DIR = path.resolve('docs/diagramas');
const IMG_DIR = path.join(BASE_DIR, 'img');
const SRC_DIR = path.join(BASE_DIR, 'src');

if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
if (!fs.existsSync(SRC_DIR)) fs.mkdirSync(SRC_DIR, { recursive: true });

const diagrams = [
  {
    id: '01_diagrama_casos_de_uso',
    title: '1. Diagrama de Casos de Uso (UML)',
    category: 'Análise de Requisitos • UML • RBAC',
    description: 'Atores do sistema com RBAC multi-perfil: Administrador com acúmulo flexível de papéis (1. Somente Administrador, 2. Administrador + Balconista, 3. Administrador + Balconista + Eletricista / Dono da Oficina), além de Balconista e Eletricista dedicados.',
    mermaid: `flowchart LR
    subgraph Atores ["👥 Atores do Sistema & RBAC Multi-Papel"]
        direction TB
        
        Admin["👑 <b>Administrador (Gestor / Dono)</b><br/>• Gestão Geral & DRE Financeiro<br/>───────────────────────<br/><b>Modos Operacionais:</b><br/>1️⃣ Somente Administrador<br/>2️⃣ Admin + Balconista<br/>3️⃣ Admin + Balconista + Eletricista"]
        
        Balconista["👤 <b>Balconista</b><br/>• Atendimento Balcão & PDV"]
        Eletricista["👤 <b>Eletricista</b><br/>• Oficina, Baia & Diagnóstico"]

        Admin -.->|Herda / Acumula Funções| Balconista
        Admin -.->|Herda / Acumula Funções| Eletricista
    end

    subgraph Sistema ["⚡ Casos de Uso - Auto Elétrica Eletrocar"]
        direction TB
        
        subgraph ModuloGestao ["📊 Gestão & Retaguarda"]
            direction LR
            UC01(["🔐 UC01: Autenticar com Multi-Perfis"])
            UC07(["📊 UC07: Emitir DRE e Relatórios"])
            UC04(["🏷️ UC04: Autorizar Desconto"])
        end

        subgraph ModuloBalcao ["🛒 Balcão & PDV Ágil"]
            direction LR
            UC02(["🛒 UC02: Realizar Venda no Balcão"])
            UC03(["📟 UC03: Ler Código de Barras"])
            UC02 -.->|<<include>>| UC03
            UC04 -.->|<<extend>>| UC02
        end

        subgraph ModuloOficina ["🔧 Oficina & Pátio"]
            direction LR
            UC06(["🎙️ UC06: Enviar Áudio Telegram / IA"])
            UC05(["📋 UC05: Abrir Ordem de Serviço"])
            UC06 -.->|<<include>>| UC05
        end
    end

    Balconista ==>|Opera Balcão| UC02
    Eletricista ==>|Abre OS na Baia| UC06
    Admin ==>|Emite Relatórios| UC07
    Admin ==>|Aprova| UC04

    classDef actorAdmin fill:#fef3c7,stroke:#d97706,stroke-width:2.5px,color:#78350f,font-weight:bold;
    classDef actorStyle fill:#eef2ff,stroke:#4f46e5,stroke-width:2.5px,color:#1e1b4b,font-weight:bold;
    classDef ucStyle fill:#ffffff,stroke:#0284c7,stroke-width:2px,color:#0f172a,font-weight:bold;

    class Admin actorAdmin;
    class Balconista,Eletricista actorStyle;
    class UC01,UC02,UC03,UC04,UC05,UC06,UC07 ucStyle;`
  },
  {
    id: '02_diagrama_classes',
    title: '2. Diagrama de Classes de Domínio (DDD / UML)',
    category: 'Estrutura Estática • Domínio',
    description: 'Entidades puras de domínio com suporte a múltiplos papéis (RBAC flexível para Administrador/Balconista/Eletricista), tipos de dados, métodos e agregações.',
    mermaid: `classDiagram
    direction TB
    class Usuario {
        +UUID id
        +String nome
        +String email
        +String senhaHash
        +List~Papel~ papeis
        +autenticar(senha) bool
        +adicionarPapel(Papel papel)
        +possuiPapel(Papel papel) bool
        +ehAdmin() bool
        +podeOperarBalcao() bool
        +podeExecutarServico() bool
    }

    class Papel {
        <<enumeration>>
        ADMINISTRADOR
        BALCONISTA
        ELETRICISTA
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

    Usuario "1" --> "1..*" Papel : possui perfis
    Cliente "1" *-- "1..*" Carro : possui
    Cliente "1" o-- "0..*" OrdemServico : solicita
    OrdemServico "1" *-- "1..*" ItemOS : contem
    ItemOS "1" --> "1" Peca : referencia`
  },
  {
    id: '03_diagrama_der',
    title: '3. Diagrama Entidade-Relacionamento (DER Relacional)',
    category: 'Banco de Dados • PostgreSQL 16',
    description: 'Esquema relacional no PostgreSQL 16 com suporte a RBAC multi-perfil (tabela associativa USUARIOS_PAPEIS N:N), integridade referencial e chaves estrangeiras.',
    mermaid: `erDiagram
    CLIENTES ||--|{ CARROS : possui
    CLIENTES ||--o{ ORDENS_SERVICO : solicita
    ORDENS_SERVICO ||--|{ ITENS_OS : contem
    PECAS ||--o{ ITENS_OS : referencia
    USUARIOS ||--o{ ORDENS_SERVICO : abre
    USUARIOS ||--|{ USUARIOS_PAPEIS : possui
    PAPEIS ||--|{ USUARIOS_PAPEIS : atribui

    CLIENTES {
        uuid id PK "Identificador Único"
        varchar nome "Nome do Cliente"
        varchar cpf_cnpj "Documento Fiscal"
        timestamp created_at "Data Cadastro"
    }

    CARROS {
        uuid id PK "Identificador Veículo"
        uuid cliente_id FK "Vínculo Cliente"
        varchar modelo "Modelo do Veículo"
        varchar marca "Fabricante"
        varchar ano "Ano Fabricação"
    }

    ORDENS_SERVICO {
        uuid id PK "Identificador da OS"
        uuid cliente_id FK "Cliente"
        uuid carro_id FK "Veículo"
        uuid usuario_id FK "Atendente/Mecânico"
        varchar status "Status da Máquina de Estados"
        text sintomas "Diagnóstico / Sintomas"
        decimal valor_total "Valor Fechado"
        timestamp created_at "Abertura"
    }

    ITENS_OS {
        uuid id PK "Item de Serviço"
        uuid ordem_servico_id FK "OS Vinculada"
        uuid peca_id FK "Peça Utilizada"
        int quantidade "Qtd Baixada"
        decimal preco_unitario "Preço Unitário"
    }

    PECAS {
        uuid id PK "Código Peça"
        varchar codigo_barras "EAN-13 / Barcode"
        varchar sku "Código Interno / Fabricante"
        varchar descricao "Nome do Produto"
        decimal preco_venda "Preço no Balcão"
        int estoque_atual "Saldo em Estoque"
    }

    USUARIOS {
        uuid id PK "ID Operador"
        varchar nome "Nome do Usuário"
        varchar email "Login de Acesso"
        varchar senha_hash "Bcrypt Hash"
        boolean is_active "Status Ativo"
    }

    PAPEIS {
        int id PK "ID Perfil"
        varchar codigo "ADMIN | BALCONISTA | ELETRICISTA"
        varchar descricao "Nome do Perfil"
    }

    USUARIOS_PAPEIS {
        uuid usuario_id PK,FK "ID Usuário"
        int papel_id PK,FK "ID Papel (N:N Multi-Perfil)"
        timestamp atribuido_em "Data Atribuição"
    }`
  },
  {
    id: '04_diagrama_objetos',
    title: '4. Diagrama de Objetos (Runtime Snapshot)',
    category: 'Instâncias em Tempo de Execução • UML',
    description: 'Instantâneo concreto de objetos em memória: instâncias ativas de Usuário Multi-Papel (Admin+Balconista+Eletricista), Cliente, Veículo, OS em andamento e Peça Bosch alocada.',
    mermaid: `classDiagram
    class UsuarioDonoExemplo {
        id = "usr-001-admin"
        nome = "Roberto Mello"
        perfil = "Dono Multi-Papel"
        email = "roberto@eletrocar.com"
        papeis = "ADMIN, BALCAO, ELETRICISTA"
    }

    class ClienteExemplo {
        id = "c1a2-9901"
        nome = "Carlos Silva"
        cpfCnpj = "123.456.789-00"
    }

    class CarroExemplo {
        id = "ca01-8812"
        modelo = "Gol 1.6 MSI"
        marca = "Volkswagen"
        ano = "2019"
    }

    class OSExemplo {
        id = "os-2026-0042"
        status = EM_ANDAMENTO
        sintomas = "Alternador não carrega bateria"
    }

    class PecaExemplo {
        id = "p-10492"
        codigoBarras = "7891049281023"
        sku = "ALT-BOSCH-12V"
        descricao = "Regulador de Voltagem Bosch 12V"
        precoVenda = "R$ 185,00"
    }

    UsuarioDonoExemplo -- OSExemplo : abriu e executa
    ClienteExemplo -- CarroExemplo : vinculado
    ClienteExemplo -- OSExemplo : titular
    OSExemplo -- PecaExemplo : alocada`
  },
  {
    id: '05_diagrama_estados_os',
    title: '5. Diagrama de Estados - Ciclo de Vida da OS',
    category: 'Máquina de Estados • Comportamento',
    description: 'Fluxo completo de estados da Ordem de Serviço, desde a triagem por voz/balcão até o teste elétrico e entrega final do veículo.',
    mermaid: `stateDiagram-v2
    [*] --> Triagem : 1. Criada (Balcão ou Voz Telegram)
    Triagem --> OrcamentoPendente : 2. Dados Iniciais Preenchidos
    OrcamentoPendente --> Aprovado : 3. Cliente Aprova Orçamento
    OrcamentoPendente --> Cancelado : Orçamento Recusado
    
    Aprovado --> EmExecucao : 4. Eletricista Inicia Serviço
    EmExecucao --> AguardandoPeca : 5. Falta Peça no Estoque
    AguardandoPeca --> EmExecucao : Peça Recebida / Alocada
    
    EmExecucao --> TestesEletricos : 6. Montagem Concluída
    TestesEletricos --> Finalizado : 7. Aprovado no Checklist
    TestesEletricos --> EmExecucao : Falha no Teste de Voltagem
    
    Finalizado --> Entregue : 8. Pagamento Confirmado & Veículo Liberado
    
    Entregue --> [*]
    Cancelado --> [*]`
  },
  {
    id: '06_diagrama_bce',
    title: '6. Diagrama Boundary-Control-Entity (BCE)',
    category: 'Padrão Arquitetural • Design Robusto',
    description: 'Separação estrutural de responsabilidades entre Interfaces/Fronteira (Boundary), Casos de Uso/Orquestração (Control) e Entidades de Domínio (Entity).',
    mermaid: `flowchart LR
    subgraph Boundary ["🌐 Camada de Fronteira (Boundary)"]
        direction TB
        B1["📱 <b>TelegramWebhookController</b><br/>Recepção de Áudio e Comandos"]
        B2["💻 <b>BalcaoPDVController</b><br/>Interface Web e Atalhos F1-F9"]
        B3["📡 <b>BarcodeReaderListener</b><br/>Interceptador HID / Serial (<25ms)"]
    end

    subgraph Control ["⚙️ Camada de Controle (Use Cases)"]
        direction TB
        C1["⚙️ <b>CriarOSPorVozUseCase</b><br/>Orquestração de IA & OS"]
        C2["⚙️ <b>RealizarVendaBalcaoUseCase</b><br/>Transação Atômica ACID"]
        C3["⚙️ <b>BaixarEstoqueUseCase</b><br/>Atualização em Tempo Real"]
    end

    subgraph Entity ["📦 Camada de Entidade (Domain Model)"]
        direction TB
        E1[("📦 <b>Peca</b><br/>Estoque e Preços")]
        E2[("📋 <b>OrdemServico</b><br/>Máquina de Estados")]
        E3[("👤 <b>Cliente</b><br/>Cadastro & Veículos")]
    end

    B1 ==>|Aciona| C1
    B2 ==>|Aciona| C2
    B3 ==>|Aciona| C3

    C1 --> E2
    C1 --> E3
    C2 --> E1
    C2 --> E2
    C3 --> E1

    classDef boundStyle fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef ctrlStyle fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#581c87;
    classDef entStyle fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#064e3b;

    class B1,B2,B3 boundStyle;
    class C1,C2,C3 ctrlStyle;
    class E1,E2,E3 entStyle;`
  },
  {
    id: '07_diagrama_sequencia_voz',
    title: '7. Diagrama de Sequência - Pipeline de IA por Voz',
    category: 'Inteligência Artificial • Automação por Áudio',
    description: 'Fluxo síncrono/assíncrono da abertura de OS: Gravação no Telegram → Whisper ASR → LLM JSON Extraction → Persistência e WebSocket em tempo real.',
    mermaid: `sequenceDiagram
    autonumber
    actor Mecanico as 👤 Eletricista (Baia)
    participant Webhook as 📱 Telegram Webhook
    participant ASR as 🎙️ Whisper ASR Engine
    participant LLM as 🧩 LLM Extractor (JSON)
    participant UseCase as ⚙️ CriarOSPorVozUseCase
    participant DB as 🗄️ PostgreSQL 16
    participant WS as ⚡ WebSocket Server (Balcão)

    Mecanico->>Webhook: 1. Grava áudio de 15s ("Gol do Carlos, alternador em curto")
    Webhook->>Webhook: 2. Valida User ID na Whitelist de Segurança
    Webhook->>ASR: 3. Transmite stream de áudio (.ogg)
    ASR-->>Webhook: 4. Retorna texto: "Gol do Carlos, alternador em curto"
    Webhook->>LLM: 5. Prompt com Dicionário Elétrico + JSON Schema rígido
    LLM-->>Webhook: 6. Retorna {cliente: "Carlos", carro: "Gol", sintomas: "Alternador"}
    Webhook->>UseCase: 7. Executa caso de uso com dados estruturados
    UseCase->>DB: 8. Localiza/Cria Cliente e Carro
    DB-->>UseCase: 9. Retorna IDs vinculados
    UseCase->>DB: 10. Salva Ordem de Serviço (Status: Triagem)
    DB-->>UseCase: 11. OS gravada com sucesso (#OS-2026-0042)
    UseCase->>WS: 12. Emite evento Realtime para painel do balcão
    UseCase-->>Webhook: 13. Retorna confirmação estruturada
    Webhook-->>Mecanico: 14. Exibe Card Interativo no Telegram [✅ Confirmar] [✏️ Editar]`
  },
  {
    id: '08_diagrama_atividades_balcao',
    title: '8. Diagrama de Atividades - Operação de Balcão e PDV',
    category: 'Processo Operacional • PDV Ágil',
    description: 'Fluxo de decisão do balconista: leitura óptica, busca alternativa, validação de saldo, venda sob encomenda e baixa atômica de estoque.',
    mermaid: `flowchart TD
    Inicio([🟢 Início: Leitura de Peça no Balcão]) --> Leitura[📟 Disparo do Leitor de Código de Barras]
    Leitura --> Validacao{🔍 Peça Cadastrada<br/>no Sistema?}
    
    Validacao -- Não --> BuscaFuzzy[⌨️ Busca Manual por Nome / SKU / Aplicação]
    BuscaFuzzy --> ItemEncontrado{Item Encontrado?}
    ItemEncontrado -- Não --> AlertaErro[❌ Alerta: Produto Não Cadastrado] --> Fim([🔴 Fim do Processo])
    ItemEncontrado -- Sim --> VerificaSaldo
    
    Validacao -- Sim --> VerificaSaldo{📦 Saldo de Estoque<br/>Disponível > 0?}
    
    VerificaSaldo -- Não --> AlertaSemEstoque[⚠️ Alerta: Estoque Zerado / Solicitar Fornecedor]
    AlertaSemEstoque --> PermiteVendaSemEstoque{Permite Venda<br/>sob Encomenda?}
    PermiteVendaSemEstoque -- Não --> Fim
    PermiteVendaSemEstoque -- Sim --> AdicionaItem
    
    VerificaSaldo -- Sim --> AdicionaItem[🛒 Adiciona Item ao Carrinho / OS + Bip Sonoro]
    AdicionaItem --> FinalizaVenda{Finalizar Atendimento?}
    
    FinalizaVenda -- Não (Mais Peças) --> Leitura
    FinalizaVenda -- Sim --> FormaPagamento[💳 Seleciona Meio: PIX / Cartão / Dinheiro]
    FormaPagamento --> ProcessaPagamento[⚡ Transação ACID: Baixa Estoque + Registra no Caixa]
    ProcessaPagamento --> EmiteComprovante[📄 Emite Cupom / Envia Comprovante WhatsApp]
    EmiteComprovante --> Concluido([✅ Venda Concluída em < 2 Segundos])

    classDef actionStyle fill:#f8fafc,stroke:#3b82f6,stroke-width:2px,color:#0f172a,font-weight:bold;
    classDef decisionStyle fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#78350f,font-weight:bold;
    classDef startEndStyle fill:#dcfce7,stroke:#16a34a,stroke-width:2.5px,color:#14532d,font-weight:bold;
    classDef errorStyle fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#7f1d1d,font-weight:bold;

    class Leitura,BuscaFuzzy,AdicionaItem,FormaPagamento,ProcessaPagamento,EmiteComprovante actionStyle;
    class Validacao,ItemEncontrado,VerificaSaldo,PermiteVendaSemEstoque,FinalizaVenda decisionStyle;
    class Inicio,Concluido startEndStyle;
    class AlertaErro,AlertaSemEstoque,Fim errorStyle;`
  },
  {
    id: '09_diagrama_componentes_clean_arch',
    title: '9. Diagrama de Componentes (Clean Architecture)',
    category: 'Arquitetura de Software • Clean Architecture',
    description: 'As 4 camadas da Clean Architecture respeitando a Regra de Dependência invertida (Dependency Inversion Principle).',
    mermaid: `flowchart TD
    subgraph Camada4 ["🌐 Camada 4: Frameworks & Drivers (Infraestrutura)"]
        direction LR
        FastAPIWeb["🚀 FastAPI HTTP & WebSockets"]
        PostgresDB["🐘 PostgreSQL 16 Engine"]
        TelegramAPI["🤖 Telegram Bot API"]
        SerialWedge["📟 Web Serial / HID Service"]
    end

    subgraph Camada3 ["🔌 Camada 3: Interface Adapters (Controladores e Repositórios)"]
        direction LR
        AuthController["🔐 AuthController"]
        VendaController["🛒 VendaController"]
        OSController["📋 OSController"]
        PecaRepoImpl["💾 PecaRepositoryPostgres"]
        OSRepoImpl["💾 OSRepositoryPostgres"]
    end

    subgraph Camada2 ["⚙️ Camada 2: Application (Casos de Uso)"]
        direction LR
        UC_Auth["🔐 AutenticarUsuarioUseCase"]
        UC_Venda["🛒 RealizarVendaBalcaoUseCase"]
        UC_Voz["🎙️ CriarOSPorVozUseCase"]
        UC_DRE["📊 GerarDREUseCase"]
    end

    subgraph Camada1 ["🏛️ Camada 1: Domain (Entidades e Regras de Negócio)"]
        direction LR
        Ent_Peca["📦 Entidade: Peça"]
        Ent_OS["📋 Entidade: Ordem de Serviço"]
        Ent_Cliente["👤 Entidade: Cliente"]
        Repo_Interfaces["📐 Interfaces: PecaRepository, OSRepository"]
    end

    Camada4 ==>|Injeta Controladores| Camada3
    Camada3 ==>|Executa Casos de Uso| Camada2
    Camada2 ==>|Acessa Domínio Puro| Camada1
    Camada3 -.->|Implementa Interfaces de Repositório| Repo_Interfaces

    classDef c4 fill:#f1f5f9,stroke:#64748b,stroke-width:2.5px,color:#0f172a,font-weight:bold;
    classDef c3 fill:#e0f2fe,stroke:#0284c7,stroke-width:2.5px,color:#0369a1,font-weight:bold;
    classDef c2 fill:#ede9fe,stroke:#7c3aed,stroke-width:2.5px,color:#5b21b6,font-weight:bold;
    classDef c1 fill:#dcfce7,stroke:#16a34a,stroke-width:2.5px,color:#15803d,font-weight:bold;

    class FastAPIWeb,PostgresDB,TelegramAPI,SerialWedge c4;
    class AuthController,VendaController,OSController,PecaRepoImpl,OSRepoImpl c3;
    class UC_Auth,UC_Venda,UC_Voz,UC_DRE c2;
    class Ent_Peca,Ent_OS,Ent_Cliente,Repo_Interfaces c1;`
  },
  {
    id: '10_diagrama_arquitetura_geral',
    title: '10. Visão Geral da Arquitetura do Sistema (Ponta a Ponta)',
    category: 'Arquitetura de Solução • Visão Executiva',
    description: 'Visão integrada completa: Atores e Hardware → Borda e Gateways → FastAPI & IA de Voz → Domínio DDD → Persistência ACID no PostgreSQL 16.',
    mermaid: `flowchart TD
    subgraph S1 ["👥 1. Camada de Atores e Dispositivos de Entrada"]
        direction LR
        Balconista["👤 Balconista<br/><b>(Terminal Balcão)</b>"]
        Leitor["📟 Leitor de Código de Barras<br/><b>(USB HID / Web Serial)</b>"]
        Eletricista["👤 Eletricista / Mecânico<br/><b>(Baia da Oficina)</b>"]
        Admin["👤 Administrador / Dono<br/><b>(Gestão, Balcão e/ou Oficina)</b>"]
    end

    subgraph S2 ["💻 2. Interfaces Frontend & Canais de Atendimento"]
        direction LR
        PDV["💻 PDV Web PWA<br/><b>(React + Offline First)</b>"]
        Telegram["📱 Telegram App<br/><b>(Voice Bot Oficial)</b>"]
        Painel["📊 Painel Admin Web<br/><b>(Gestão Financeira & DRE)</b>"]
    end

    S1 ==>|Interação e Leitura de Hardware| S2

    subgraph S3 ["🌐 3. Camada de Borda, Proxy Reverso e Webhooks"]
        direction LR
        Nginx["🛡️ Nginx Reverse Proxy<br/><b>(HTTPS / TLS 1.3 / WSS)</b>"]
        Webhook["🤖 Telegram Webhook Receiver<br/><b>(Recepção de Áudios)</b>"]
        WS["⚡ WebSocket Realtime Server<br/><b>(Notificação Push Instantânea)</b>"]
    end

    S2 ==>|Requisições REST & Webhooks| S3

    subgraph S4 ["⚙️ 4. Backend FastAPI & Pipeline de Inteligência Artificial"]
        direction TB
        subgraph Pipeline_IA ["🧠 Pipeline de IA de Voz"]
            direction LR
            Whisper["🎙️ Whisper ASR Engine<br/><b>(Transcrição de Áudio PT-BR)</b>"]
            LLM["🧩 LLM Entity Extractor<br/><b>(JSON Schema + Dicionário Elétrico)</b>"]
            Whisper ==>|Áudio Transcrito| LLM
        end
        
        subgraph UseCases ["📦 Casos de Uso (Application Layer)"]
            direction LR
            UC_Venda["🛒 Realizar Venda Balcão"]
            UC_OS["📋 Criar OS por Voz"]
            UC_Estoque["📦 Baixar Estoque"]
            UC_Financeiro["💰 Fechar Caixa & DRE"]
        end

        Pipeline_IA ==>|JSON Estruturado| UC_OS
    end

    S3 ==>|Roteamento Seguro & WebSockets| S4

    subgraph S5 ["🏛️ 5. Camada de Domínio Puro (DDD)"]
        direction LR
        Ent_Cliente["👤 Aggregate: Cliente & Carro"]
        Ent_Peca["📦 Aggregate: Peça & SKU"]
        Ent_OS["📋 Aggregate: Ordem de Serviço"]
        Ent_Caixa["💵 Aggregate: Caixa & Fechamento"]
    end

    S4 ==>|Executa Regras de Negócio| S5

    subgraph S6 ["🗄️ 6. Persistência, Auditoria e Armazenamento (PostgreSQL 16)"]
        direction LR
        Postgres[(🐘 PostgreSQL 16 ACID<br/><b>Banco Relacional Principal</b>)]
        Audit[(📜 Logs de Auditoria Imutáveis<br/><b>Rastreabilidade Total</b>)]
        Backup[(💾 Rotina de Backups Diários<br/><b>Segurança & Tolerância a Falhas</b>)]
    end

    S5 ==>|SQLAlchemy Async ORM| Postgres
    S4 -.->|Auditoria Imutável Automática| Audit
    Postgres -.-> Backup

    classDef s1Style fill:#eef2ff,stroke:#6366f1,stroke-width:2.5px,color:#1e1b4b,font-weight:bold;
    classDef s2Style fill:#f0fdf4,stroke:#22c55e,stroke-width:2.5px,color:#14532d,font-weight:bold;
    classDef s3Style fill:#f8fafc,stroke:#475569,stroke-width:2.5px,color:#0f172a,font-weight:bold;
    classDef s4Style fill:#faf5ff,stroke:#a855f7,stroke-width:2.5px,color:#581c87,font-weight:bold;
    classDef s5Style fill:#fffbeb,stroke:#f59e0b,stroke-width:2.5px,color:#78350f,font-weight:bold;
    classDef s6Style fill:#f0f9ff,stroke:#0284c7,stroke-width:2.5px,color:#0369a1,font-weight:bold;

    class Balconista,Leitor,Eletricista,Admin s1Style;
    class PDV,Telegram,Painel s2Style;
    class Nginx,Webhook,WS s3Style;
    class Whisper,LLM,UC_Venda,UC_OS,UC_Estoque,UC_Financeiro s4Style;
    class Ent_Cliente,Ent_Peca,Ent_OS,Ent_Caixa s5Style;
    class Postgres,Audit,Backup s6Style;`
  },
  {
    id: '11_diagrama_sequencia_fluxo_operacional',
    title: '11. Sequência Operacional Balcão e Oficina (Ponta a Ponta)',
    category: 'Fluxos Integrados • Operação Diária',
    description: 'Visão cronológica dos 3 processos simultâneos: 1. Abertura de OS por voz na oficina, 2. Leitura e consulta rápida no balcão, 3. Fechamento de venda com baixa atômica.',
    mermaid: `sequenceDiagram
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
    API-->>SPA: Venda concluída em < 2s com recibo pronto para impressão`
  },
  {
    id: '12_diagrama_fluxo_leitor_barcode',
    title: '12. Diagrama de Fluxo I/O - Leitor de Código de Barras',
    category: 'Hardware & I/O • Cunha de Teclado e Serial',
    description: 'Mecanismo de captura global sem foco de cursor: Modo HID (análise de delta temporal < 25ms para diferenciar humano de máquina) e Modo Web Serial direto.',
    mermaid: `flowchart TD
    Inicio[📟 Disparo do Leitor Óptico / Barcode] --> ModoOperacao{⚙️ Modo de Conexão<br/>do Dispositivo}
    
    ModoOperacao -->|Modo 1: HID - Teclado Emulado| ListenerHID[⚡ Global Keydown Event Listener no Window]
    ListenerHID --> AnaliseTiming[⏱️ Análise de Delta Temporal entre Caracteres]
    AnaliseTiming --> ValidaCadencia{Cadência de Entrada<br/>< 25ms por Caractere?}
    
    ValidaCadencia -- Não (> 80ms) --> IgnoraHumano[👤 Digitação Humana Normal:<br/>Ignora Interceptador]
    ValidaCadencia -- Sim (< 25ms) --> CapturaBuffer[🤖 Dispositivo Óptico Detectado:<br/>Captura Buffer & Cancela Enter Final com e.preventDefault]
    
    ModoOperacao -->|Modo 2: Serial - Web Serial API| PortaSerial[🔌 Navigator Serial Port / WebHID Nativo]
    PortaSerial --> StreamBytes[📡 Leitura de Stream Assíncrono de Bytes na Porta COM]
    
    CapturaBuffer ==> DespachoPDV[🛒 Despacho Imediato ao Carrinho / API sem Depender do Cursor]
    StreamBytes ==> DespachoPDV
    
    DespachoPDV --> BaixaBanco[⚡ Baixa Instantânea no PostgreSQL em < 50ms + Bip Sonoro de Sucesso]

    classDef hardwareStyle fill:#e0e7ff,stroke:#4338ca,stroke-width:2.5px,color:#1e1b4b,font-weight:bold;
    classDef decisionStyle fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f,font-weight:bold;
    classDef actionStyle fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d,font-weight:bold;
    classDef neutralStyle fill:#f1f5f9,stroke:#64748b,stroke-width:2px,color:#334155,font-weight:bold;

    class Inicio,PortaSerial hardwareStyle;
    class ModoOperacao,ValidaCadencia decisionStyle;
    class ListenerHID,AnaliseTiming,CapturaBuffer,StreamBytes,DespachoPDV,BaixaBanco actionStyle;
    class IgnoraHumano neutralStyle;`
  }
];

async function generateAll() {
  console.log('🎬 Starting Presentation-Grade diagram generation and rendering...');
  console.log(`Target directories:`);
  console.log(`- Markdown: ${BASE_DIR}`);
  console.log(`- Images: ${IMG_DIR}`);
  console.log(`- Raw Sources: ${SRC_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // Ultra-HD presentation resolution (Device Scale Factor 3 for crystal clear slides and zoom)
  await page.setViewport({ width: 2800, height: 1800, deviceScaleFactor: 3 });

  // Presentation-ready HTML layout with high-contrast typography, crisp borders, and bold badges
  const baseHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 48px;
        background: #0f172a;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        display: inline-block;
      }

      /* Slide Card Container */
      .slide-card {
        background: #ffffff;
        padding: 44px 52px;
        border-radius: 24px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        display: inline-block;
        min-width: 1000px;
        max-width: 2200px;
      }

      /* Header styling */
      .header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2.5px solid #e2e8f0;
        position: relative;
      }
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 6px 14px;
        border-radius: 9999px;
        background: #4f46e5;
        color: #ffffff;
      }
      .system-tag {
        font-size: 13px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.04em;
      }
      h1 {
        margin: 0 0 10px 0;
        font-size: 32px;
        color: #0f172a;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      p.subtitle {
        margin: 0;
        font-size: 17px;
        color: #334155;
        font-weight: 500;
        max-width: 1200px;
        line-height: 1.6;
      }

      /* Diagram Render Box */
      #render-box {
        display: flex;
        justify-content: center;
        align-items: center;
        background: #ffffff;
        padding: 20px 10px;
        border-radius: 16px;
      }
      #render-box svg {
        max-width: 100%;
        height: auto;
      }

      /* High-Contrast SVG Overrides for Presentation Visibility */
      .mermaid svg {
        font-family: 'Inter', system-ui, sans-serif !important;
      }
      .node text, .actor text, .label text {
        font-weight: 600 !important;
        font-size: 16px !important;
      }
      .node rect, .node circle, .node polygon {
        stroke-width: 2.5px !important;
      }
      .edgePath path {
        stroke-width: 2.8px !important;
        stroke: #334155 !important;
      }
      .edgeLabel {
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-weight: 700 !important;
        font-size: 14px !important;
        padding: 4px 8px !important;
        border-radius: 6px !important;
        border: 1px solid #cbd5e1 !important;
      }
      .cluster rect {
        stroke-width: 2.5px !important;
        rx: 12px !important;
        ry: 12px !important;
      }
      .cluster text {
        font-size: 18px !important;
        font-weight: 800 !important;
        fill: #1e1b4b !important;
      }
      .actor-line {
        stroke-width: 2px !important;
        stroke-dasharray: 4, 4 !important;
        stroke: #94a3b8 !important;
      }
      .messageLine0, .messageLine1 {
        stroke-width: 2.8px !important;
        stroke: #1e293b !important;
      }
      .messageText {
        font-size: 15px !important;
        font-weight: 600 !important;
        fill: #0f172a !important;
      }
      .noteText {
        font-size: 15px !important;
        font-weight: 700 !important;
      }

      /* Slide Footer */
      .footer {
        margin-top: 32px;
        padding-top: 20px;
        border-top: 2px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
      }
      .footer .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #0f172a;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="slide-card" id="diagram-container">
      <div class="header">
        <div class="header-top">
          <div class="badge" id="diag-badge">CATEGORIA</div>
          <div class="system-tag">AUTO ELÉTRICA ELETROCAR • ARQUITETURA DE SOFTWARE</div>
        </div>
        <h1 id="diag-title">Título</h1>
        <p class="subtitle" id="diag-desc">Descrição</p>
      </div>
      <div id="render-box"></div>
      <div class="footer">
        <div class="brand">⚡ Auto Elétrica Eletrocar • Especificação Técnica de Engenharia</div>
        <div id="diag-id">Diagrama ID: 01</div>
      </div>
    </div>
    <script>
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: { curve: 'basis', htmlLabels: true, nodeSpacing: 50, rankSpacing: 50 },
        themeVariables: {
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '16px',
          primaryColor: '#e0e7ff',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#4f46e5',
          lineColor: '#334155',
          secondaryColor: '#f8fafc',
          tertiaryColor: '#ffffff',
          clusterBkg: '#f8fafc',
          clusterBorder: '#94a3b8',
          edgeLabelBackground: '#ffffff',
          actorBkg: '#e0e7ff',
          actorBorder: '#4338ca',
          actorTextColor: '#1e1b4b',
          signalColor: '#1e293b',
          signalTextColor: '#0f172a',
          labelBoxBkgColor: '#f1f5f9',
          labelBoxBorderColor: '#64748b',
          labelTextColor: '#0f172a',
          noteBkgColor: '#fef3c7',
          noteBorderColor: '#f59e0b',
          noteTextColor: '#78350f',
          activationBkgColor: '#e0e7ff',
          activationBorderColor: '#4f46e5'
        }
      });
    </script>
  </body>
  </html>
  `;

  await page.setContent(baseHtml, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.mermaid !== 'undefined');
  console.log('✅ Presentation rendering engine initialized.');

  for (let i = 0; i < diagrams.length; i++) {
    const item = diagrams[i];
    console.log(`\n[${i + 1}/${diagrams.length}] Rendering 4K Slide: ${item.title}`);

    // 1. Save raw .mmd file
    const mmdPath = path.join(SRC_DIR, `${item.id}.mmd`);
    fs.writeFileSync(mmdPath, item.mermaid.trim(), 'utf8');

    // 2. Save Markdown documentation file
    const mdPath = path.join(BASE_DIR, `${item.id}.md`);
    const mdContent = `# ${item.title}

> **Categoria**: ${item.category}  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [\`${item.id}.mmd\`](./src/${item.id}.mmd)

---

## 📌 Descrição e Contexto para Apresentação

${item.description}

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![${item.title}](./img/${item.id}.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/${item.id}.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

\`\`\`mermaid
${item.mermaid.trim()}
\`\`\`

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
`;
    fs.writeFileSync(mdPath, mdContent, 'utf8');

    // 3. Render directly via in-memory mermaid.render
    const renderResult = await page.evaluate(async (diag) => {
      document.getElementById('diag-badge').textContent = diag.category;
      document.getElementById('diag-title').textContent = diag.title;
      document.getElementById('diag-desc').textContent = diag.description;
      document.getElementById('diag-id').textContent = `Diagrama ID: ${diag.id}`;

      const renderBox = document.getElementById('render-box');
      renderBox.innerHTML = '';

      try {
        const { svg } = await window.mermaid.render(`svg_${diag.id}_${Date.now()}`, diag.mermaid);
        renderBox.innerHTML = svg;
        return { success: true, svg };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    }, item);

    if (!renderResult.success) {
      console.error(`❌ Error rendering diagram ${item.id}:`, renderResult.error);
      continue;
    }

    // Save SVG vector file
    const svgPath = path.join(IMG_DIR, `${item.id}.svg`);
    fs.writeFileSync(svgPath, renderResult.svg, 'utf8');

    // Screenshot container element for ultra-high-definition PNG
    const containerElement = await page.$('#diagram-container');
    const pngPath = path.join(IMG_DIR, `${item.id}.png`);
    await containerElement.screenshot({
      path: pngPath,
      omitBackground: false
    });

    console.log(`  🌟 4K Slide Generated: ${pngPath}`);
  }

  await browser.close();

  // 4. Generate README.md index for all diagrams
  console.log('\n📝 Generating Presentation Catalog README.md in docs/diagramas/ ...');
  let readmeContent = `# 📐 Catálogo de Diagramas de Arquitetura e Engenharia (Slides de Apresentação)
## Auto Elétrica Eletrocar

Este diretório contém a separação individual de cada diagrama de software, arquitetura e fluxo operacional do sistema da **Auto Elétrica Eletrocar**, renderizados em **alta definição (4K Ultra-HD)** e otimizados para **slides de apresentação, relatórios executivos e projetores**.

---

## 📑 Sumário de Diagramas para Apresentação

| # | Diagrama | Categoria | Documento | Slide PNG (4K) | Vetor SVG |
| :-: | :--- | :--- | :--- | :--- | :--- |
`;

  diagrams.forEach((d, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    readmeContent += `| **${num}** | [${d.title.replace(/^\d+\.\s*/, '')}](./${d.id}.md) | \`${d.category}\` | [\`${d.id}.md\`](./${d.id}.md) | [🖼️ Ver Foto PNG](./img/${d.id}.png) | [📐 Vetor SVG](./img/${d.id}.svg) |\n`;
  });

  readmeContent += `\n---\n\n## 🖼️ Galeria Visual dos Slides de Apresentação\n\n`;

  diagrams.forEach(d => {
    readmeContent += `### 📌 [${d.title}](./${d.id}.md)\n\n`;
    readmeContent += `> **Categoria**: \`${d.category}\`  \n> ${d.description}\n\n`;
    readmeContent += `[![${d.title}](./img/${d.id}.png)](./${d.id}.md)\n\n---\n\n`;
  });

  readmeContent += `*Documentação gerada com design de apresentação para a Auto Elétrica Eletrocar.*\n`;

  fs.writeFileSync(path.join(BASE_DIR, 'README.md'), readmeContent, 'utf8');
  console.log(`✅ Presentation Index generated at: ${path.join(BASE_DIR, 'README.md')}`);
  console.log('🎉 All Presentation-Grade diagrams and 4K images successfully generated!');
}

generateAll().catch(err => {
  console.error('Fatal error generating diagrams:', err);
  process.exit(1);
});
