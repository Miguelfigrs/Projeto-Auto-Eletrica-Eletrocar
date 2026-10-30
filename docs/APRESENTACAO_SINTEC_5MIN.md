# 🎙️ Apresentação SINTEC — Sistema Integrado Auto Elétrica Eletrocar
## Simpósio de Inovação, Tecnologia, Empreendedorismo e Ciências Computacionais
### CEFET-MG — Campus Varginha · Bacharelado em Sistemas de Informação (BSI)

---

## ⏱️ Planejamento Temporal Estruturado (Duração Máxima: 5 Minutos / 300 Segundos)

| # | Slide / Seção | Título do Modelo SINTEC | Tempo Sugerido | Intervalo Acumulado |
|---|---|---|---|---|
| **01** | Slide 1 | **Capa & Identificação** | 30 seg | `00:00 - 00:30` |
| **02** | Slide 2 | **Objetivo** (Geral e Específicos) | 30 seg | `00:30 - 01:00` |
| **03** | Slide 3 | **JUSTIFICATIVA** (Dores e Impacto) | 40 seg | `01:00 - 01:40` |
| **04** | Slide 4 | **METODOLOGIA** (Clean Arch, DDD, TDD, Docker) | 45 seg | `01:40 - 02:25` |
| **05** | Slide 5 | **DESCRIÇÃO DO PROJETO** (Arquitetura e Módulos) | 65 seg | `02:25 - 03:30` |
| **06** | Slide 6 | **Fotos ou prints de tela** (Andamento e Demonstração) | 40 seg | `03:30 - 04:10` |
| **07** | Slide 7 | **CONSIDERAÇÕES FINAIS** (Resultados e Futuro) | 35 seg | `04:10 - 04:45` |
| **08** | Slide 8 | **REFERÊNCIAS BIBLIOGRÁFICAS** & Fechamento | 15 seg | `04:45 - 05:00` |
| **Total** | | **Apresentação Completa** | **300 seg** | **05:00 cravados** |

---

# 📑 Conteúdo dos Slides e Script de Apresentação Oral

---

### SLIDE 1: CAPA

**Cabeçalho:**
> **SINTEC**  
> Simpósio de Inovação, Tecnologia, Empreendedorismo e Ciências Computacionais

**Título do Trabalho:**
> **SISTEMA INTEGRADO DE GESTÃO OPERACIONAL E INTELIGÊNCIA ARTIFICIAL MULTIMODAL PARA OFICINA MECÂNICA E AUTO ELÉTRICA: CASO ELETROCAR**

**Área Temática:**
> Projeto de Extensão / Desenvolvimento Tecnológico

**Autores:**
- **Miguel Figueiredo** (Apresentador / Desenvolvedor)
- **Prof. [Nome do Orientador]** (Orientador)
- Curso: Bacharelado em Sistemas de Informação — CEFET-MG Campus Varginha

**Rodapé Institucional:**
- *Realizadores*: CEFET-MG Campus Varginha | BSI | Semana de Inovação, Tecnologia e Empreendedorismo (SITE)
- *Apoiadores*: DEDC | Porto Inovação | Nascente Incubadora | Trens Dê | SEBRAE

---

#### 🗣️ Roteiro de Fala Oral — Slide 1 (00:00 - 00:30 · 30 segundos)
> *"Olá a todos, membros da banca avaliadora, professores e colegas presentes no SINTEC. Meu nome é Miguel Figueiredo, graduando em Sistemas de Informação aqui pelo CEFET-MG Campus Varginha, e orientado pelo professor [Nome do Orientador].  
> Hoje apresento o desenvolvimento do sistema completo de gestão operacional e inteligência para a oficina Auto Elétrica Eletrocar — uma solução projetada para modernizar de ponta a ponta a rotina de serviços automotivos, integrando computação aplicada, automação de balcão e inteligência artificial."*

---

### SLIDE 2: OBJETIVO

**Título no Modelo:**
> ## Objetivo

**Conteúdo em Tópicos:**
- **Objetivo Geral:**
  - Projetar e implementar um ecossistema de software completo, modular e resiliente para automação dos processos operacionais, comerciais e financeiros da oficina Auto Elétrica Eletrocar.
- **Objetivos Específicos:**
  - **Eliminar registros manuais em papel**: digitalizar o fluxo de Ordens de Serviço (OS) desde a triagem até a entrega do veículo com garantia rastreável;
  - **Acelerar o atendimento de balcão**: integrar leitor de código de barras com tratamento de perda de foco e busca textual ultrarrápida (`pg_trgm`);
  - **Introduzir entrada de dados por voz no pátio**: permitir a abertura e atualização de OS via bot do Telegram com transcrição Whisper e extração semântica com LLM (mãos livres de graxa);
  - **Blindar a gestão financeira**: fornecer controle de Caixa Diário com fechamento cego duplo, DRE gerencial em tempo real, liquidação instantânea via PIX dinâmico e auditoria imutável.

---

#### 🗣️ Roteiro de Fala Oral — Slide 2 (00:30 - 01:00 · 30 segundos)
> *"O nosso objetivo principal foi desenvolver uma solução de software robusta e de alta performance capaz de transformar a operação da Auto Elétrica Eletrocar.  
> Especificamente, buscamos erradicar as fichas em papel que causavam perdas de informações; viabilizar um balcão ágil com leitor de código de barras sem interrupções; implementar um assistente por voz via Telegram e IA para que o mecânico abra ordens de serviço direto do pátio sem sujar telas com graxa; e garantir governança financeira com fechamento de caixa cego e DRE gerencial em tempo real."*

---

### SLIDE 3: JUSTIFICATIVA

**Título no Modelo:**
> ## JUSTIFICATIVA

**Conteúdo em Tópicos:**
- **Dores Críticas do Chão de Oficina:**
  - **Ambiente hostil à digitação**: mecânicos com mãos sujas de graxa e ferramentas não conseguem operar teclados e mouses para preencher cadastros longos;
  - **Furos de estoque e peças perdidas**: peças retiradas do estoque sem reserva prévia geravam orçamentos incompatíveis e desabastecimento;
  - **Lentidão e filas no balcão**: leitores USB tradicionais travam quando a janela perde o foco, além da dificuldade de localizar peças por códigos alternativos ou nomes populares;
  - **Descontrole financeiro e mistura de contas**: ausência de conciliação diária de caixa, inadimplência em faturados e falta de apuração contínua do DRE (lucro real vs. faturamento).
- **Impacto Tecnológico e Econômico:**
  - Aplicação prática de Engenharia de Software Moderna (Clean Architecture + DDD) em uma microempresa real da região, promovendo competitividade, redução de custos e fidelização do cliente.

---

#### 🗣️ Roteiro de Fala Oral — Slide 3 (01:00 - 01:40 · 40 segundos)
> *"A justificativa desse projeto nasce da realidade prática de uma oficina mecânica. O chão de fábrica é um ambiente desafiador: o mecânico lida com graxa e óleo, tornando inviável digitar laudos técnicos detalhados num computador convencional. Isso causava perdas frequentes de informações e peças retiradas sem baixa no estoque.  
> No balcão, a fila aumentava por falhas de leitura de código de barras e buscas lentas. E na gestão, o dono sofria com a falta de visão de lucro e divergências no caixa.  
> Nosso projeto se justifica ao trazer a tecnologia do ambiente acadêmico para resolver dores reais de um negócio local, aplicando padrões de engenharia de ponta para entregar agilidade, rastreabilidade e saúde financeira."*

---

### SLIDE 4: METODOLOGIA

**Título no Modelo:**
> ## METODOLOGIA

**Conteúdo em Tópicos:**
- **Clean Architecture (Arquitetura Limpa em 4 Camadas):**
  - *Domain*: Entidades ricas, Value Objects (`Dinheiro`, `CpfCnpj`, `CodigoBarras`) e Domain Services desacoplados de bibliotecas;
  - *Application*: Casos de uso orquestrados, DTOs e portas de comunicação (Interfaces DIP);
  - *Adapters*: Controllers FastAPI assíncronos, repositórios SQLAlchemy e gateways (IA, PIX, Barcode);
  - *Infra*: PostgreSQL 16, segurança JWT + Refresh rotativo em cookie HTTP-Only e logs imutáveis.
- **Domain-Driven Design (DDD):**
  - Mapeamento da Linguagem Ubíqua automotiva, agregados consistentes (`OrdemServico`, `VendaBalcao`, `CaixaDiario`) e políticas de alçada.
- **TDD (Test-Driven Development) & Qualidade de Código:**
  - Desenvolvimento orientado por testes automatizados com cobertura superior a **80%** (pytest), testando regras de domínio, portas de aplicação e integração contra PostgreSQL real.
- **Conteinerização & DevOps:**
  - Ambiente 100% reproduzível via Docker e Docker Compose (PostgreSQL 16 com extensões `pg_trgm` e `pgcrypto`, API FastAPI Python 3.12 e pgAdmin).

---

#### 🗣️ Roteiro de Fala Oral — Slide 4 (01:40 - 02:25 · 45 segundos)
> *"Para garantir confiabilidade e manutenibilidade a longo prazo, adotamos a Clean Architecture aliada ao Domain-Driven Design. A arquitetura divide o sistema em quatro camadas estritas: o Domínio isola as regras do negócio automotivo sem qualquer dependência de frameworks; a Aplicação define os casos de uso; e Adaptadores e Infraestrutura conectam a web e o banco de dados.  
> Trabalhamos com TDD rigoroso: todos os fluxos críticos foram desenvolvidos a partir de testes automatizados, superando 80% de cobertura de código executada contra um PostgreSQL real.  
> Além disso, toda a infraestrutura é orquestrada em contêineres Docker, garantindo um ambiente ágil, seguro e pronto para produção."*

---

### SLIDE 5: DESCRIÇÃO DO PROJETO (O Sistema Completo)

**Título no Modelo:**
> ## DESCRIÇÃO DO PROJETO (a descrição pode ter mais de um slide)

**Conteúdo em Tópicos:**
- **1. Módulo Oficina & Ordens de Serviço (OS):**
  - Ciclo de estados formal: `TRIAGEM` ➔ `EM DIAGNÓSTICO` ➔ `AGUARDANDO APROVAÇÃO` ➔ `EM EXECUÇÃO` ➔ `FINALIZADA` ➔ `ENTREGUE`;
  - Reserva automática de peças no estoque físico no momento da aprovação do orçamento, impedindo duplicidade de venda.
- **2. Módulo Balcão / PDV de Alta Velocidade:**
  - Leitor de código de barras USB/Bluetooth com listener global (Keyboard Wedge / Web Serial), capturando leituras instantâneas mesmo sem foco no input;
  - Busca fonética e trigramas (`pg_trgm`), e política de descontos protegida por autorização rápida com **PIN de 4 dígitos**.
- **3. Inovação: Pipeline de IA por Voz no Telegram:**
  - Mecânico grava áudio no Telegram ➔ Webhook autenticado ➔ Transcrição técnica via **Whisper ASR** ➔ Extração semântica com **LLM (Claude)** via JSON Schema ➔ Abertura automática da OS estruturada em segundos.
- **4. Módulo Financeiro & Compliance:**
  - Caixa com fechamento cego duplo (operador não vê saldo do sistema antes de contar);
  - Cobrança PIX dinâmica com QR Code BR Code e liquidação automática por Webhook;
  - DRE gerencial, Fluxo de Caixa contínuo e trilha de auditoria imutável por triggers no banco de dados.

---

#### 🗣️ Roteiro de Fala Oral — Slide 5 (02:25 - 03:30 · 65 segundos)
> *"Apresento agora a visão geral do sistema completo, composto por quatro pilares integrados:  
> Primeiro, o Módulo de Oficina gerencia o ciclo de vida da Ordem de Serviço com uma máquina de estados rigorosa. Ao aprovar um serviço, o sistema faz a reserva atômica das peças no estoque, eliminando furos de inventário.  
> Segundo, a Frente de Caixa no balcão conta com um mecanismo para leitores de código de barras que não perde leituras se a janela estiver fora de foco, além de busca por similaridade textual e liberação de descontos via PIN de supervisor.  
> Terceiro, o nosso diferencial inovador: um bot no Telegram com Inteligência Artificial. O eletricista grava um áudio na oficina dizendo 'Onix prata placa ABC-1234 falhando na partida'. O pipeline transcreve o áudio com Whisper, extrai os dados estruturados via LLM e abre a OS automaticamente no sistema em segundos, sem tocar no computador.  
> Por fim, o Módulo Financeiro oferece fechamento cego de caixa, conciliação instantânea de PIX dinâmico e emissão de DRE em tempo real com trilha de auditoria imutável."*

---

### SLIDE 6: FOTOS OU PRINTS DE TELA (Andamento do Projeto)

**Título no Modelo:**
> ## Fotos ou prints de tela (referente ao andamento do projeto)

**Conteúdo Visual Integrado:**
- **Painel 1 · Documentação Interativa da API (FastAPI / Swagger):**
  - Autenticação JWT, endpoints de ordens de serviço, balcão, caixa e finanças 100% documentados e testáveis;
- **Painel 2 · Pipeline de IA por Voz (Telegram + Whisper + LLM):**
  - Demonstração do áudio enviado pelo mecânico e a geração automática do JSON da OS preenchida;
- **Painel 3 · Arquitetura Geral e Diagramas de Engenharia:**
  - Diagrama de arquitetura em 4 camadas, DER relacional e máquina de estados da OS;
- **Painel 4 · Qualidade & Suíte de Testes Automatizados (TDD):**
  - Relatório do pytest com dezenas de testes unitários e de integração passando com cobertura superior a 80%.

---

#### 🗣️ Roteiro de Fala Oral — Slide 6 (03:30 - 04:10 · 40 segundos)
> *"Aqui apresentamos as evidências do andamento e execução prática do projeto.  
> À esquerda, vemos a API REST assíncrona documentada via Swagger, demonstrando todos os endpoints operacionais, desde autenticação segura por token até a emissão de cobranças.  
> No centro, ilustramos o pipeline de IA por voz em ação: o mecânico envia a mensagem de áudio pelo Telegram e o sistema gera a entidade de Ordem de Serviço com os campos técnicos devidamente extraídos.  
> E à direita, exibimos os diagramas estruturais da Engenharia de Software e o terminal com a suíte de testes do pytest com 100% de sucesso e cobertura acima de 80%, comprovando a robustez e maturidade técnica do sistema."*

---

### SLIDE 7: CONSIDERAÇÕES FINAIS

**Título no Modelo:**
> ## CONSIDERAÇÕES FINAIS

**Conteúdo em Tópicos:**
- **Resultados e Contribuições Alcançadas:**
  - **Eficiência Operacional**: redução drástica do tempo de cadastro e triagem com auxílio da entrada por voz;
  - **Fidelidade de Estoque**: erradicação de perdas por peças não faturadas através da reserva atômica;
  - **Governança & Segurança**: auditoria completa de transações, prevenção de desvios no caixa com fechamento cego e controle de acesso RBAC multi-papel;
  - **Excelência de Engenharia**: arquitetura desacoplada e testada, garantindo manutenibilidade e baixo custo de evolução.
- **Trabalhos Futuros:**
  - Desenvolvimento da interface PWA Mobile offline-first com sincronização assíncrona;
  - Integração com telemetria e scanner automotivo OBD-II via Bluetooth para diagnóstico elétrico em tempo real.

---

#### 🗣️ Roteiro de Fala Oral — Slide 7 (04:10 - 04:45 · 35 segundos)
> *"Como considerações finais, o projeto consolida uma entrega completa e de alto impacto para a Auto Elétrica Eletrocar. Conseguimos aliar conceitos acadêmicos rigorosos de Clean Architecture, DDD e TDD a uma aplicação prática de mercado.  
> Os resultados mostram um ganho substancial de produtividade na oficina, eliminação de erros de inventário e transparência financeira para o gestor.  
> Como próximos passos, planejamos avançar no aplicativo PWA mobile com suporte offline e a integração direta com scanners automotivos OBD-II via Bluetooth para leitura automática de códigos de falha do veículo."*

---

### SLIDE 8: REFERÊNCIAS BIBLIOGRÁFICAS

**Título no Modelo:**
> ## REFERÊNCIAS BIBLIOGRÁFICAS

**Conteúdo em Citações ABNT:**
- **MARTIN, Robert C.** *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
- **EVANS, Eric.** *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Boston: Addison-Wesley, 2003.
- **PRESSMAN, Roger S.; MAXIM, Bruce R.** *Engenharia de Software: Uma Abordagem Profissional*. 9ª ed. Porto Alegre: McGraw-Hill, 2021.
- **SOMMERVILLE, Ian.** *Engenharia de Software*. 10ª ed. São Paulo: Pearson Education do Brasil, 2019.
- **TIENGO, Walter; et al.** *Documentação de Arquitetura e Engenharia de Software — Projeto Auto Elétrica Eletrocar*. CEFET-MG, 2026.

**Mensagem Final:**
> **Obrigado a todos pela atenção!**  
> *Estamos abertos a perguntas e contribuições da banca examinadora.*

---

#### 🗣️ Roteiro de Fala Oral — Slide 8 (04:45 - 05:00 · 15 segundos)
> *"Estas foram as principais referências teóricas e metodológicas que fundamentaram nosso trabalho.  
> Encerro aqui minha fala, agradecendo ao CEFET-MG, aos organizadores do SINTEC e à banca pela oportunidade. Estou à disposição para as perguntas e considerações. Muito obrigado!"*

---

## 🎯 Dicas de Ouro para Não Ultrapassar os 5 Minutos

1. **Olho no Cronômetro**: Use o cronômetro visual embutido na apresentação interativa HTML (`docs/apresentacao/sintec_5min.html`). Se chegar aos 3 minutos e ainda estiver no Slide 4, resuma a metodologia e avance imediatamente para a Descrição e Telas.
2. **Não leia o slide**: Os slides possuem tópicos e diagramas claros para a banca ler com os olhos. Sua voz deve conduzir o raciocínio e explicar o *porquê* e o *como*, e não apenas soletrar as palavras da tela.
3. **Mantenha ritmo constante e respiração**: 300 segundos passam rápido se você divagar, mas são suficientes quando cada frase tem um propósito claro.
4. **Destaque os diferenciais**: Ao falar da Descrição (Slide 5), enfatize a IA por voz (Telegram + Whisper + LLM) e o Caixa Cego com PIX — esses são os pontos que mais chamam a atenção da banca!
5. **Expansão Interativa dos Diagramas**:
   - No **Slide 6**, clique em qualquer diagrama ou no botão **🔍 Expandir** para abrir o visualizador em tela cheia com zoom em 4K.
   - Durante o zoom, você pode usar a **roda do mouse** ou os botões `[+]` e `[-]`, além de **arrastar com o mouse** para navegar pelo diagrama.
   - Pressione **`ESC`** para fechar o visualizador e voltar ao slide.
   - Você também pode alternar entre todos os 8 diagramas principais (Arquitetura, Pipeline de Voz, Casos de Uso, Ciclo da OS, Modelo DER, Classes DDD, Fluxo de Balcão e Componentes) usando as setas laterais ou a barra de botões superior.

