"""
Configurações da aplicação (variáveis de ambiente).
Em produção (AMBIENTE=producao) segredos padrão de desenvolvimento são recusados na inicialização.
"""
import os
from decimal import Decimal
from pathlib import Path
from typing import List
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

SECRET_KEY_DESENVOLVIMENTO = "eletrocar_dev_secret_troque_em_producao"
WEBHOOK_SECRET_DESENVOLVIMENTO = "eletrocar_webhook_dev"


def _lista(valor: str) -> List[str]:
    return [item.strip() for item in valor.split(",") if item.strip()]


def _bool(valor: str) -> bool:
    return str(valor).strip().lower() in ("1", "true", "sim", "yes", "on")


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Auto Elétrica Eletrocar - API")
    VERSION: str = os.getenv("VERSION", "1.1.0")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    AMBIENTE: str = os.getenv("AMBIENTE", "desenvolvimento").lower()

    # Banco de dados (PostgreSQL 16 no Docker; SQLite apenas para desenvolvimento leve/testes)
    ROOT_DIR: Path = ROOT_DIR
    DATABASE_MODULE_DIR: Path = ROOT_DIR / "Eletrocar.Database" / "data"
    DEFAULT_SQLITE_PATH: Path = DATABASE_MODULE_DIR / "eletrocar.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")
    MIGRAR_NA_INICIALIZACAO: bool = _bool(os.getenv("MIGRAR_NA_INICIALIZACAO", "true"))
    SEED_DADOS_DEMO: bool = _bool(os.getenv("SEED_DADOS_DEMO", "false"))
    SEED_SQL_PATH: Path = Path(os.getenv("SEED_SQL_PATH", str(ROOT_DIR / "Eletrocar.Database" / "seed_completo.sql")))

    # Administrador inicial (criado somente se o banco não tiver usuários)
    ADMIN_NOME: str = os.getenv("ADMIN_NOME", "Administrador Eletrocar")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_SENHA_INICIAL: str = os.getenv("ADMIN_SENHA_INICIAL", "")

    # JWT & Segurança
    SECRET_KEY: str = os.getenv("SECRET_KEY", SECRET_KEY_DESENVOLVIMENTO)
    ALGORITHM: str = "HS256"
    BCRYPT_CUSTO: int = max(4, int(os.getenv("BCRYPT_CUSTO", "12")))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    MAX_TENTATIVAS_LOGIN: int = int(os.getenv("MAX_TENTATIVAS_LOGIN", "5"))
    BLOQUEIO_LOGIN_MINUTOS: int = int(os.getenv("BLOQUEIO_LOGIN_MINUTOS", "15"))
    CORS_ORIGINS: List[str] = _lista(os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"))
    REFRESH_COOKIE_SECURE: bool = _bool(os.getenv("REFRESH_COOKIE_SECURE", "false"))

    # Regras de negócio parametrizáveis
    LIMITE_DESCONTO_SEM_AUTORIZACAO_PERCENTUAL: Decimal = Decimal(os.getenv("LIMITE_DESCONTO_SEM_AUTORIZACAO_PERCENTUAL", "5"))
    PRAZO_FATURADO_DIAS: int = int(os.getenv("PRAZO_FATURADO_DIAS", "30"))
    PERCENTUAL_CUSTO_MAO_OBRA: Decimal = Decimal(os.getenv("PERCENTUAL_CUSTO_MAO_OBRA", "40"))
    NOME_EMPRESA_COMPROVANTE: str = os.getenv("NOME_EMPRESA_COMPROVANTE", "AUTO ELETRICA ELETROCAR")
    URL_PAINEL: str = os.getenv("URL_PAINEL", "http://localhost:5173")

    # Telegram Voice Bot
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_WEBHOOK_SECRET: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", WEBHOOK_SECRET_DESENVOLVIMENTO)

    # Whisper ASR (API compatível com OpenAI /v1/audio/transcriptions, nuvem ou self-hosted)
    WHISPER_API_URL: str = os.getenv("WHISPER_API_URL", "https://api.openai.com/v1/audio/transcriptions")
    WHISPER_API_KEY: str = os.getenv("WHISPER_API_KEY", "")
    WHISPER_MODELO: str = os.getenv("WHISPER_MODELO", "whisper-1")

    # LLM de extração estruturada (Claude)
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    LLM_MODELO: str = os.getenv("LLM_MODELO", "claude-opus-5-5")
    LLM_ESFORCO: str = os.getenv("LLM_ESFORCO", "low")

    # PIX (BR Code dinâmico) e webhook de liquidação do PSP
    PIX_CHAVE: str = os.getenv("PIX_CHAVE", "")
    PIX_NOME_RECEBEDOR: str = os.getenv("PIX_NOME_RECEBEDOR", "AUTO ELETRICA ELETROCAR")
    PIX_CIDADE_RECEBEDOR: str = os.getenv("PIX_CIDADE_RECEBEDOR", "SAO PAULO")
    PIX_EXPIRACAO_MINUTOS: int = int(os.getenv("PIX_EXPIRACAO_MINUTOS", "30"))
    PIX_WEBHOOK_SECRET: str = os.getenv("PIX_WEBHOOK_SECRET", WEBHOOK_SECRET_DESENVOLVIMENTO)

    @property
    def eh_producao(self) -> bool:
        return self.AMBIENTE in ("producao", "production")

    def validar(self) -> None:
        """Impede subir em produção com segredos de desenvolvimento ou CORS aberto."""
        if not self.eh_producao:
            return
        problemas = []
        if self.SECRET_KEY == SECRET_KEY_DESENVOLVIMENTO or len(self.SECRET_KEY) < 32:
            problemas.append("SECRET_KEY deve ser definida com ao menos 32 caracteres")
        if self.TELEGRAM_WEBHOOK_SECRET == WEBHOOK_SECRET_DESENVOLVIMENTO:
            problemas.append("TELEGRAM_WEBHOOK_SECRET deve ser definida")
        if self.PIX_WEBHOOK_SECRET == WEBHOOK_SECRET_DESENVOLVIMENTO:
            problemas.append("PIX_WEBHOOK_SECRET deve ser definida")
        if self.BCRYPT_CUSTO < 12:
            problemas.append("BCRYPT_CUSTO deve ser no mínimo 12")
        if "*" in self.CORS_ORIGINS:
            problemas.append("CORS_ORIGINS não pode ser '*' em produção")
        if self.SEED_DADOS_DEMO:
            problemas.append("SEED_DADOS_DEMO não pode estar ativo em produção")
        if problemas:
            raise RuntimeError("Configuração insegura para produção: " + "; ".join(problemas))


settings = Settings()
