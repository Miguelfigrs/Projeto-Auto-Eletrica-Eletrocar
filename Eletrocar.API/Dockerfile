# ==============================================================================
# Dockerfile: Backend FastAPI da Auto Elétrica Eletrocar
# Python 3.11 Slim - Otimizado e Seguro
# ==============================================================================

FROM python:3.11-slim

# Variáveis de ambiente Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instala dependências de compilação essenciais e utilitários de rede/saúde
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /app

# Instala dependências do backend diretamente no contêiner (100% Dockerizado)
RUN pip install --no-cache-dir \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.34.0" \
    "sqlalchemy>=2.0.0" \
    "greenlet>=3.1.0" \
    "aiosqlite>=0.20.0" \
    "psycopg2-binary>=2.9.0" \
    "bcrypt>=4.2.0" \
    "pyjwt>=2.10.0" \
    "python-jose>=3.3.0" \
    "pydantic>=2.10.0" \
    "websockets>=13.0" \
    "pytest>=8.0.0" \
    "pytest-asyncio>=0.24.0" \
    "httpx>=0.28.0" \
    "python-multipart>=0.0.9" \
    "python-dotenv>=1.0.1" \
    "asyncpg>=0.30.0"

# Copia código-fonte da API
COPY . /app/

# Porta de execução
EXPOSE 8000

# Healthcheck do contêiner da API
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando de inicialização
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
