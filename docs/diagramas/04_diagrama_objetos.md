# 4. Diagrama de Objetos (Runtime Snapshot)

> **Categoria**: Instâncias em Tempo de Execução • UML  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`04_diagrama_objetos.mmd`](./src/04_diagrama_objetos.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Instantâneo concreto de objetos em memória: instâncias ativas de Usuário Multi-Papel (Admin+Balconista+Eletricista), Cliente, Veículo, OS em andamento e Peça Bosch alocada.

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![4. Diagrama de Objetos (Runtime Snapshot)](./img/04_diagrama_objetos.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/04_diagrama_objetos.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
classDiagram
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
    OSExemplo -- PecaExemplo : alocada
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
