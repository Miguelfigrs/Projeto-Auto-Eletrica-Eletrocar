# 2. Diagrama de Classes de Domínio (DDD / UML)

> **Categoria**: Estrutura Estática • Domínio  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`02_diagrama_classes.mmd`](./src/02_diagrama_classes.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Entidades puras de domínio com suporte a múltiplos papéis (RBAC flexível para Administrador/Balconista/Eletricista), tipos de dados, métodos e agregações.

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![2. Diagrama de Classes de Domínio (DDD / UML)](./img/02_diagrama_classes.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/02_diagrama_classes.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
classDiagram
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
    ItemOS "1" --> "1" Peca : referencia
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
