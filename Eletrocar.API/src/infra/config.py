import os
from pathlib import Path
from dotenv import load_dotenv

# Diretórios base
API_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = API_DIR.parent

# Carrega variáveis do arquivo .env (prioriza .env na raiz ou na pasta da API)
if (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")
elif (API_DIR / ".env").exists():
    load_dotenv(API_DIR / ".env")
else:
    load_dotenv()


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Auto Elétrica Eletrocar - API")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    
    # Raiz do projeto: C:\Projetos\Projeto_Eletrocar
    # Garante que o banco de dados fique FORA da pasta da API (Eletrocar.API)
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATABASE_MODULE_DIR: Path = ROOT_DIR / "Eletrocar.Database" / "data"
    DEFAULT_SQLITE_PATH: Path = DATABASE_MODULE_DIR / "eletrocar.db"

    # Permite configuração via variável de ambiente (ex: PostgreSQL 16)
    # ou fallback seguro para o banco local no diretório externo Eletrocar.Database/data/
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
    )
    
    # JWT & Segurança
    SECRET_KEY: str = os.getenv("SECRET_KEY", "eletrocar_secret_key_super_segura_2026_auto_eletrica")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 horas de turno
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_WEBHOOK_SECRET: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", "eletrocar_webhook_secret_2026")


settings = Settings()
