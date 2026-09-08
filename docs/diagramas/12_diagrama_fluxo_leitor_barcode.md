# 12. Diagrama de Fluxo I/O - Leitor de Código de Barras

> **Categoria**: Hardware & I/O • Cunha de Teclado e Serial  
> **Sistema**: Auto Elétrica Eletrocar  
> **Arquivo Fonte**: [`12_diagrama_fluxo_leitor_barcode.mmd`](./src/12_diagrama_fluxo_leitor_barcode.mmd)

---

## 📌 Descrição e Contexto para Apresentação

Mecanismo de captura global sem foco de cursor: Modo HID (análise de delta temporal < 25ms para diferenciar humano de máquina) e Modo Web Serial direto.

---

## 🖼️ Foto / Slide em Alta Resolução (4K Ultra-HD)

![12. Diagrama de Fluxo I/O - Leitor de Código de Barras](./img/12_diagrama_fluxo_leitor_barcode.png)

> 💡 *Dica de Apresentação: Você também pode usar o arquivo vetorial editável em [SVG](./img/12_diagrama_fluxo_leitor_barcode.svg) ou inserir o PNG direto no PowerPoint / Google Slides.*

---

## 💻 Código Fonte Mermaid

```mermaid
flowchart TD
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
    class IgnoraHumano neutralStyle;
```

---

*Documentação oficial e slides de engenharia da Auto Elétrica Eletrocar.*
