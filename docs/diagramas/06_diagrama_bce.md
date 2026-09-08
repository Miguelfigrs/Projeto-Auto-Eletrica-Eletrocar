# 6. Diagrama Boundary-Control-Entity (BCE)

> **Categoria**: Padrão Arquitetural • Design Robusto  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`06_diagrama_bce.mmd`](./src/06_diagrama_bce.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Separação estrutural de responsabilidades entre Interfaces/Fronteira (Boundary), Casos de Uso/Orquestração (Control) e Entidades de Domínio (Entity).

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![6. Diagrama Boundary-Control-Entity (BCE)](./img/06_diagrama_bce.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/06_diagrama_bce.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
flowchart LR
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
    class E1,E2,E3 entStyle;
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
