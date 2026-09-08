# 8. Diagrama de Atividades - Operação de Balcão e PDV

> **Categoria**: Processo Operacional • PDV Ágil  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`08_diagrama_atividades_balcao.mmd`](./src/08_diagrama_atividades_balcao.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Fluxo de decisão do balconista: leitura óptica, busca alternativa, validação de saldo, venda sob encomenda e baixa atômica de estoque.

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![8. Diagrama de Atividades - Operação de Balcão e PDV](./img/08_diagrama_atividades_balcao.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/08_diagrama_atividades_balcao.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
flowchart TD
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
    class AlertaErro,AlertaSemEstoque,Fim errorStyle;
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
