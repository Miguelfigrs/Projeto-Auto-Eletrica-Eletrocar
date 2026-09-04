# Projeto Auto Elétrica Eletrocar

Sistema e site para oficina mecânica e auto elétrica.

## 🚀 Sobre o Projeto
Este projeto tem como objetivo gerenciar e divulgar os serviços de auto elétrica, agendamentos, orçamentos e informações da oficina Eletrocar.

## 📚 Documentação do Projeto
- **[Diagramas de Arquitetura e Fluxo Operacional](docs/DIAGRAMAS_ARQUITETURA.md)**: Diagrama ponta a ponta da solução (Balcão, Leitor de Código de Barras, Telegram Voice Bot, FastAPI, PostgreSQL e DDD) e diagrama de sequência operacional.
- **[Proposta Técnica e Comercial Completa](docs/PROPOSTA_TECNICA_E_COMERCIAL.md)**: Proposta executiva e comercial estruturada com stack FastAPI/React, arquitetura de leitor de código de barras sem perda de foco, módulos descritos, cronograma em Sprints de 2 semanas, valores de investimento, condições e SLA.
- **[Especificação Técnica e Operacional Consolidada](docs/ESPECIFICACAO_TECNICA_E_COMERCIAL.md)**: Detalhamento de arquitetura, integração Telegram Voice Bot, usabilidade de balcão, módulos financeiros (Fluxo de Caixa, DRE), cadastro simplificado de clientes e matriz de riscos.

## 🛠️ Tecnologias
- **Frontend**: React + TypeScript + TailwindCSS (PDV Rápido com suporte Offline/PWA)
- **Backend**: Python 3.12 (FastAPI) + AsyncIO + SQLAlchemy 2.0 (RESTful API + WebSockets)
- **Banco de Dados**: PostgreSQL 16 (Índices B-Tree/GIN + Transações ACID)
- **Hardware & I/O**: Leitores de Código de Barras USB / Bluetooth (HID Keyboard Wedge + Web Serial API)
- **Inteligência Artificial & Voz**: Telegram Bot API + Whisper ASR + LLM Entity Extraction
- **DevOps**: Docker, Nginx, Git & GitHub
