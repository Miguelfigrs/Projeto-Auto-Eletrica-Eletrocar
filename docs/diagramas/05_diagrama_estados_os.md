# 5. Diagrama de Estados - Ciclo de Vida da OS

> **Categoria**: Máquina de Estados • Comportamento  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`05_diagrama_estados_os.mmd`](./src/05_diagrama_estados_os.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Fluxo completo de estados da Ordem de Serviço, desde a triagem por voz/balcão até o teste elétrico e entrega final do veículo.

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![5. Diagrama de Estados - Ciclo de Vida da OS](./img/05_diagrama_estados_os.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/05_diagrama_estados_os.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
stateDiagram-v2
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
    Cancelado --> [*]
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
