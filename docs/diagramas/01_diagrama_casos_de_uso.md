# 1. Diagrama de Casos de Uso (UML)

> **Categoria**: Análise de Requisitos • UML • RBAC  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`01_diagrama_casos_de_uso.mmd`](./src/01_diagrama_casos_de_uso.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Atores do sistema com RBAC multi-perfil: Administrador com acúmulo flexível de papéis (1. Somente Administrador, 2. Administrador + Balconista, 3. Administrador + Balconista + Eletricista / Dono da Oficina), além de Balconista e Eletricista dedicados.

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![1. Diagrama de Casos de Uso (UML)](./img/01_diagrama_casos_de_uso.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/01_diagrama_casos_de_uso.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
flowchart LR
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
    class UC01,UC02,UC03,UC04,UC05,UC06,UC07 ucStyle;
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
