# 9. Diagrama de Componentes (Clean Architecture)

> **Categoria**: Arquitetura de Software • Clean Architecture  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`09_diagrama_componentes_clean_arch.mmd`](./src/09_diagrama_componentes_clean_arch.mmd)

---

## 📌 Descrição e Contexto para Apresentação

As 4 camadas da Clean Architecture respeitando a Regra de Dependência invertida (Dependency Inversion Principle).

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![9. Diagrama de Componentes (Clean Architecture)](./img/09_diagrama_componentes_clean_arch.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/09_diagrama_componentes_clean_arch.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
flowchart TD
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
    class Ent_Peca,Ent_OS,Ent_Cliente,Repo_Interfaces c1;
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
