"""
Configuração global dos testes: ambiente de teste isolado e hash bcrypt de baixo custo (somente testes).
Executado antes da importação da aplicação.
"""
import os

os.environ.setdefault("BCRYPT_CUSTO", "4")
os.environ.setdefault("AMBIENTE", "teste")
os.environ.setdefault("TELEGRAM_WEBHOOK_SECRET", "segredo-telegram-teste")
os.environ.setdefault("PIX_WEBHOOK_SECRET", "segredo-pix-teste")
os.environ.setdefault("SECRET_KEY", "chave-de-testes-com-mais-de-32-caracteres")
