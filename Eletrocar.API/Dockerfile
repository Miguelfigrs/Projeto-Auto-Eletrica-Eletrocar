# ==============================================================================
# Dockerfile: Backend FastAPI da Auto Elétrica Eletrocar
# Python 3.12 Slim - dependências declaradas aqui (sem requirements.txt)
# ==============================================================================

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependências da aplicação
RUN pip install --no-cache-dir \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.34.0" \
    "sqlalchemy>=2.0.36" \
    "alembic>=1.13.0" \
    "asyncpg>=0.30.0" \
    "aiosqlite>=0.20.0" \
    "greenlet>=3.1.0" \
    "pydantic>=2.10.0" \
    "bcrypt>=4.2.0" \
    "pyjwt>=2.10.0" \
    "httpx>=0.28.0" \
    "anthropic>=1.13.0,<2" \
    "python-multipart>=0.0.9" \
    "python-dotenv>=1.0.1"

# Dependências de testes (TDD) - a suíte roda dentro do contêiner com cobertura mínima de 80%
RUN pip install --no-cache-dir \
    "pytest>=8.3.0" \
    "pytest-asyncio>=1.0.0" \
    "pytest-cov>=5.0.0"

COPY . /app/

# Usuário sem privilégios de root
RUN useradd --create-home --uid 1000 eletrocar && chown -R eletrocar /app
USER eletrocar

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# As migrações Alembic rodam na inicialização (MIGRAR_NA_INICIALIZACAO=true)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
