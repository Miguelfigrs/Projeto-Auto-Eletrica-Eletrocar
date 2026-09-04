# Especificação Técnica e Proposta Comercial Consolidada
## Sistema de Gestão e Balcão Operacional – Auto Elétrica Eletrocar

---

## 1. Sumário Executivo e Diretrizes Operacionais

O presente documento consolida a arquitetura técnica, os requisitos operacionais rígidos, a proposta comercial e o cronograma executivo para a implantação do sistema integrado da **Auto Elétrica Eletrocar**.

O objetivo primordial é entregar uma solução de alta performance, sem latência em balcão de atendimento, com tolerância a falhas, conciliação financeira rigorosa e integração direta com leitores de código de barras (USB e Bluetooth), reduzindo o tempo de atendimento e eliminando divergências de estoque e caixa.

---

## 2. Pilha Tecnológica e Restrições de Engenharia

Para garantir disponibilidade operacional, tempo de resposta inferior a **150ms** nas operações de balcão e total integridade transacional (ACID), a pilha tecnológica foi padronizada sem dependências desnecessárias:

| Camada | Tecnologia Adotada | Justificativa Técnica e de Custo |
| :--- | :--- | :--- |
| **Frontend / PDV** | **React + TypeScript + TailwindCSS / Vanilla CSS** | Tipagem estática reduz bugs em tempo de execução; SPA leve com renderização instantânea de componentes de balcão. |
| **PWA / Offline Resilience** | **Service Workers + IndexedDB** | Permite registrar itens e consultas de produtos mesmo com instabilidade temporária de rede local. |
| **Backend / API** | **Node.js (Fastify/Express) + TypeScript** | Alto throughput de requisições concorrentes, baixo consumo de memória e fácil integração via WebSockets. |
| **Banco de Dados** | **PostgreSQL 16** | Suporte nativo a transações ACID rigorosas (crítico para financeiro e estoque), índices GIN para busca rápida por placa/chassi/código. |
| **Hardware I/O** | **USB HID / Bluetooth HID (Keyboard Wedge Emulation)** | Compatibilidade universal sem necessidade de instalação de drivers proprietários em terminais Windows/Linux. |
| **Infraestrutura** | **Docker + Nginx (Hospedagem Híbrida: VPS Cloud + Cache Local)** | Baixo custo operacional mensal, deploys automatizados e redundância de dados diária com backup automatizado. |

---

## 3. Escopo Funcional Detalhado

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AUTO ELÉTRICA ELETROCAR                            │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ 1. Balcão & PDV   │ 2. Ordens de      │ 3. Estoque & Peças              │
│    Rápido         │    Serviço (OS)   │    - Leitor USB/Bluetooth       │
│    - Venda rápida │    - Diagnósticos │    - Baixa automática           │
│    - Atalhos (F1) │    - Mão de obra  │    - Ponto de reposição         │
├───────────────────┴───────────────────┴─────────────────────────────────┤
│ 4. Módulo Financeiro & Fluxo de Caixa (DRE, Conciliação, PIX/Cartão)   │
├─────────────────────────────────────────────────────────────────────────┤
│ 5. Cadastro de Clientes, Frotas & Histórico por Placa/Chassi            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Tabela de Módulos e Funcionalidades

| Módulo | Funcionalidades Principais | Requisitos de Desempenho / Usabilidade |
| :--- | :--- | :--- |
| **Módulo 1: Balcão & PDV Rápido** | • Abertura e fechamento de venda em menos de 10 segundos.<br>• Consulta instantânea por código de barras, SKU interno, nome ou aplicação do veículo.<br>• Teclas de atalho para todas as ações (`F2` Nova Venda, `F4` Buscar Peça, `F9` Finalizar, `ESC` Cancelar). | • Operação 100% por teclado, dispensando uso de mouse na digitação de itens. |
| **Módulo 2: Ordens de Serviço (OS)** | • Abertura por Placa do Veículo com auto-preenchimento dos dados do cliente e histórico.<br>• Registro de sintomas relatados e checklist elétrico (Bateria, Alternador, Motor de Partida, Iluminação, Injeção).<br>• Discriminação de serviços (mão de obra) e peças alocadas.<br>• Status de fluxo: *Orçamento -> Aprovado -> Em Execução -> Aguardando Peça -> Testes -> Finalizado -> Entregue*. | • Impressão térmica (80mm/58mm) e envio de PDF/orçamento via WhatsApp em 1 clique. |
| **Módulo 3: Estoque Inteligente & Hardware** | • Cadastro com Código de Barras (EAN-13, Code 128) e código original/fabricante (Bosch, Magneti Marelli, etc.).<br>• Baixa automática em tempo real na finalização da OS ou venda no balcão.<br>• Alerta de estoque mínimo e sugestão de compra baseada no giro médio. | • Prevenção de concorrência: bloqueio otimista de registro durante a adição no carrinho. |
| **Módulo 4: Gestão Financeira** | • **Fluxo de Caixa Diário**: controle de sangrias, suprimentos e fechamento de turno.<br>• **DRE Gerencial Simplificado**: Receita bruta, Custo de Mercadorias Vendidas (CMV), Custos de Mão de Obra, Despesas Fixas/Variáveis e Lucro Líquido.<br>• Multi-meios de pagamento: PIX com QR Code dinâmico, Cartão de Crédito/Débito, Boleto e Faturado (para frotas parceiras).<br>• Contas a Pagar e a Receber com controle de inadimplência. | • Auditoria total: todas as alterações de preço ou descontos exigem permissão e geram log imutável. |
| **Módulo 5: Clientes & Veículos** | • Cadastro unificado de Pessoa Física (CPF) e Jurídica (CNPJ).<br>• Vínculo de N veículos por cliente (Placa, Renavam, Chassi, Ano/Modelo, KM atual).<br>• Linha do tempo completa de revisões e manutenções elétricas executadas. | • Busca indexada por Placa com resposta em tempo real (< 50ms). |

---

## 4. Arquitetura de Integração com Hardware (Leitor de Código de Barras)

### 4.1. Protocolo de Comunicação
Os leitores (USB e Bluetooth) operam no modo **HID Keyboard Emulation (Cunha de Teclado)**. O leitor decodifica o código óptico e injeta uma rajada de caracteres ASCII seguida de um terminador configurável (`CR` - Enter, `ASCII 13`).

### 4.2. Tratamento de Conflitos e Prevenção de Foco
Para evitar que a leitura dependa de o usuário estar com o cursor focado exatamente no campo de texto de busca:

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador / Balcão
    participant Leitor as Leitor (USB / Bluetooth)
    participant Buffer as Global Keydown Buffer (Frontend)
    participant Validador as Regex & Timing Validator
    participant API as Backend API / PostgreSQL

    Operador->>Leitor: Dispara gatilho do leitor na peça
    Leitor->>Buffer: Emite sequência de KeyEvents (< 50ms entre chars) + Enter
    Buffer->>Validador: Intercepta evento globalmente
    Note over Validador: Verifica cadência (<30ms/char) e tamanho (>5 chars)<br/>Diferencia leitor de digitação humana
    Validador->>API: GET /api/v1/produtos/barcode/:code
    API->>API: Baixa / Vincula produto na transação ativa
    API-->>Buffer: Retorna item adicionado + som sonoro de sucesso (Bip)
```

#### Regras de Implementação do Listener:
1. **Diferenciação por Delta Temporal**: A digitação humana ocorre em média a cada 80–200ms por tecla. O leitor injeta caracteres a intervalos de 5 a 25ms.
2. **Prevenção de Submit Indevido**: O caractere `Enter` final disparado pelo leitor é capturado pelo interceptador (`e.preventDefault()`), impedindo a submissão de formulários inacabados.
3. **Validação de Padrões**: Suporte nativo para EAN-13, EAN-8, Code 128 e QR Code interno com SKU prefixado (ex: `ELC-10492`).

---

## 5. Requisitos de Usabilidade em Ambiente de Oficina

1. **Ergonomia Visual e Iluminação**:
   - Tema com contraste otimizado (UI Dark/Light com alta visibilidade sob luz fluorescente ou solar de galpão).
   - Tipografia com fontes de alta legibilidade (ex: *Inter*, *Roboto Mono* para valores monetários e códigos de peças).
2. **Operação "Zero Mouse" no Balcão**:
   - Fluxo completo de venda e abertura de OS realizável exclusivamente por teclado.
   - Destaque visual evidente (foco ativo) no elemento selecionado.
3. **Resiliência a Erros Operacionais**:
   - Confirmações modais críticas via atalhos simples (`Enter` para confirmar, `ESC` para voltar).
   - Sistema de rascunho automático: fechamento acidental da aba não perde os dados da OS em preenchimento.

---

## 6. Segurança, Governança e Conformidade Financeira

| Pilar | Requisito Técnico e Operacional |
| :--- | :--- |
| **Controle de Acesso (RBAC)** | • **Admin/Gestor**: Acesso total, relatórios DRE, cancelamento de vendas e alteração de estoque.<br>• **Atendente/Balcão**: Abertura de OS, emissão de vendas, consulta de peças e recebimento de caixa.<br>• **Eletricista/Oficina**: Visualização de OS atribuída, checklist técnico e requisição de peças. |
| **Auditoria e Logs Imutáveis** | Registro estruturado em tabela de auditoria (`logs_auditoria`) contendo: `user_id`, `action`, `payload_before`, `payload_after`, `timestamp`, `ip_address`. |
| **Privacidade (LGPD)** | Criptografia de senhas com bcrypt (custo 12), tráfego 100% via HTTPS/TLS 1.3, anonimização de dados de contato em relatórios públicos. |
| **Fechamento Cego de Caixa** | O operador informa os valores contados fisicamente no fechamento sem visualizar o saldo teórico do sistema; o relatório de quebra de caixa é emitido exclusivamente para a gerência. |

---

## 7. Cronograma Executivo de Entrega (10 Semanas)

```
Semana 01-02: [Sprint 1] Modelagem de Dados, Autenticação e Gestão de Cadastros Base
Semana 03-04: [Sprint 2] Módulo de Estoque com Leitor de Código de Barras (USB/BT)
Semana 05-06: [Sprint 3] Módulo de Balcão (PDV Rápido) e Ordens de Serviço (OS)
Semana 07-08: [Sprint 4] Módulo Financeiro, Fluxo de Caixa, DRE e Meios de Pagamento
Semana 09:    [Sprint 5] Testes de Carga, Homologação em Balcão e Treinamento da Equipe
Semana 10:    [Go-Live] Entrada em Produção, Monitoramento de Estabilidade e Suporte Assistido
```

---

## 8. Orçamento, Custos e Retorno sobre o Investimento (ROI)

### 8.1. Estrutura de Custos

| Item | Descrição | Investimento Estimado |
| :--- | :--- | :--- |
| **Desenvolvimento e Customização** | Engenharia de software, integração de hardware, testes de balcão e homologação. | R$ 12.000,00 a R$ 18.000,00 *(ou plano SaaS mensal proporcional)* |
| **Infraestrutura em Nuvem (VPS + Backup)** | Servidor Linux dedicado, banco de dados gerenciado, certificado SSL e backups diários. | R$ 90,00 a R$ 180,00 / mês |
| **Hardware Recomendado (Opcional)** | Leitores de código de barras 1D/2D USB/Bluetooth (ex: Honeywell / Zebra / Elgin). | R$ 250,00 a R$ 450,00 por terminal |

### 8.2. Análise de Retorno sobre o Investimento (ROI)

1. **Redução no Tempo de Atendimento no Balcão**:
   - Queda de ~65% no tempo de busca de peças e lançamento de itens com leitor de código de barras (de 4 min para menos de 90 segundos por atendimento).
2. **Eliminação de Perdas de Estoque**:
   - Controle rígido de baixa automática e identificação de divergências elimina extravios e compras duplicadas de peças elétricas de alto valor (alternadores, reguladores de voltagem, sensores).
3. **Prevenção de Furos de Caixa**:
   - Fechamento cego e conciliação por método de pagamento eliminam erros manuais de troco e conferência de cartões/PIX.

---

## 9. Matriz de Riscos e Planos de Mitigação

| Risco Identificado | Severidade | Probabilidade | Estratégia de Mitigação |
| :--- | :---: | :---: | :--- |
| **Queda de Internet na Oficina** | Alta | Média | Arquitetura PWA/Cache Local que mantém o balcão operando e sincroniza lotes assim que a conexão restabelece. |
| **Falha ou Desconexão do Leitor USB/Bluetooth** | Média | Baixa | Fallback instantâneo para digitação inteligente com busca aproximada (*fuzzy search*) por SKU ou nome da peça. |
| **Resistência da Equipe à Mudança de Processo** | Alta | Média | Interface focada em atalhos intuitivos e 2 semanas de homologação com treinamento prático no balcão. |
| **Inconsistência em Cadastros Legados** | Média | Alta | Script automatizado de higienização, normalização de planilhas e deduplicação antes da migração final. |

---

*Documento técnico aprovado para execução e desenvolvimento da Auto Elétrica Eletrocar.*
