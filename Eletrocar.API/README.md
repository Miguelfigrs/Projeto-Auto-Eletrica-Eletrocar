# Eletrocar.API - Backend de Gestão & Balcão Operacional
Auto Elétrica Eletrocar

Backend de alta performance construído com **Python 3.11/3.12 (FastAPI)**, **Clean Architecture**, **Domain-Driven Design (DDD)** e **Test-Driven Development (TDD)**.

---

## 🏛️ Estrutura Arquitetural

```
Eletrocar.API/
├── src/
│   ├── domain/                  # Camada 1: Domain (Zero dependências externas, regras puras)
│   │   ├── entities/            # Peca, OrdemServico, Cliente, Carro, VendaBalcao, CaixaDiario, Usuario
│   │   ├── value_objects/       # Dinheiro, CodigoBarras, CpfCnpj, Enums (Role, StatusOS, FormaPagamento...)
│   │   ├── exceptions/          # Exceções de Domínio (EstoqueInsuficiente, TransicaoStatusInvalida...)
│   │   ├── services/            # Domain Services: CalculadoraDREService, ConciliadorCaixaService
│   │   └── repositories/        # Interfaces Abstratas (ABCs) - Inversão de Dependência (DIP)
│   ├── application/             # Camada 2: Application (Casos de Uso e DTOs)
│   │   ├── use_cases/           # RealizarVendaBalcao, CriarOSPorVozTelegram, BuscarPecaBarcode, OperarCaixa...
│   │   └── dtos/                # Schemas de Entrada e Saída
│   ├── adapters/                # Camada 3: Interface Adapters
│   │   ├── controllers/         # Endpoints FastAPI REST e WebSockets em tempo real
│   │   └── repositories/        # Implementações assíncronas SQLAlchemy 2.0 dos repositórios
│   └── infra/                   # Camada 4: Frameworks & Drivers
│       ├── database/            # Conexão Async, SessionMaker e Modelos ORM com índices B-Tree
│       ├── security/            # Hashing Bcrypt e emissão/validação de Tokens JWT
│       └── config.py            # Variáveis de ambiente e configurações da aplicação
├── tests/                       # 34 Testes Automatizados (TDD: Domain, Application e Integration)
├── requirements.txt             # Dependências do backend
├── run_backend.py               # Script de inicialização local
└── .env.example                 # Modelo de variáveis de ambiente
```

---

## 🧪 Testes Automatizados (TDD)

Para rodar todos os testes unitários e de integração:
```powershell
python -m pytest -v
```

---

## 🚀 Como Executar o Servidor

1. Instalar dependências:
   ```powershell
   pip install -r requirements.txt
   ```

2. Executar o servidor:
   ```powershell
   python run_backend.py
   ```

3. Acessar a documentação interativa:
   - Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
   - Health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
