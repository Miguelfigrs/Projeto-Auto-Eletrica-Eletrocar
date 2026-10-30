"""
Ponto de entrada da aplicação FastAPI - Auto Elétrica Eletrocar.
Configuração de middlewares, rotas REST/WebSocket, tratamento de exceções de domínio e inicialização do banco.
"""
from contextlib import asynccontextmanager
import logging
from fastapi import APIRouter, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from src.infra.config import settings
from src.infra.database.session import engine, AsyncSessionLocal
from src.infra.database.inicializacao import inicializar_banco
from src.infra.web.contexto_requisicao import ip_requisicao
from src.domain.exceptions.domain_exceptions import (
    DomainException,
    EntidadeNaoEncontradaException,
    CredenciaisInvalidasException,
    EstoqueInsuficienteException,
    TransicaoStatusInvalidaException,
    CaixaFechadoException,
    AcessoNegadoException,
    AutorizacaoGerencialNecessariaException,
    LimiteTentativasExcedidoException,
    ConflitoConcorrenciaException,
    IntegracaoExternaException,
)
from src.adapters.controllers.auth_controller import router as auth_router
from src.adapters.controllers.usuarios_controller import router as usuarios_router
from src.adapters.controllers.pecas_controller import router as pecas_router
from src.adapters.controllers.clientes_controller import router as clientes_router
from src.adapters.controllers.vendas_controller import router as vendas_router
from src.adapters.controllers.os_controller import router as os_router
from src.adapters.controllers.caixa_controller import router as caixa_router
from src.adapters.controllers.financeiro_controller import router as financeiro_router
from src.adapters.controllers.dre_controller import router as relatorios_router
from src.adapters.controllers.telegram_controller import router as telegram_router
from src.adapters.controllers.hardware_controller import router as hardware_router
from src.adapters.controllers.ws_controller import router as ws_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await inicializar_banco(engine, AsyncSessionLocal, settings)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend da Auto Elétrica Eletrocar (Clean Architecture, DDD & TDD)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials="*" not in settings.CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def registrar_ip_origem(request: Request, call_next):
    """Disponibiliza o IP de origem para os logs de auditoria (respeita proxy reverso Nginx)."""
    encaminhado = request.headers.get("x-forwarded-for")
    ip = encaminhado.split(",")[0].strip() if encaminhado else (request.client.host if request.client else None)
    token = ip_requisicao.set(ip)
    try:
        return await call_next(request)
    finally:
        ip_requisicao.reset(token)


def _erro(status_code: int, exc: DomainException, tipo: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"erro": exc.mensagem, "tipo": tipo, **extra})


MAPA_EXCECOES = [
    (EntidadeNaoEncontradaException, status.HTTP_404_NOT_FOUND, "EntidadeNaoEncontrada"),
    (CredenciaisInvalidasException, status.HTTP_401_UNAUTHORIZED, "CredenciaisInvalidas"),
    (AcessoNegadoException, status.HTTP_403_FORBIDDEN, "AcessoNegado"),
    (AutorizacaoGerencialNecessariaException, status.HTTP_403_FORBIDDEN, "AutorizacaoGerencialNecessaria"),
    (TransicaoStatusInvalidaException, 422, "TransicaoStatusInvalida"),
    (CaixaFechadoException, status.HTTP_409_CONFLICT, "CaixaFechado"),
    (ConflitoConcorrenciaException, status.HTTP_409_CONFLICT, "ConflitoConcorrencia"),
    (IntegracaoExternaException, status.HTTP_502_BAD_GATEWAY, "IntegracaoExterna"),
]


@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    if isinstance(exc, LimiteTentativasExcedidoException):
        resposta = _erro(status.HTTP_429_TOO_MANY_REQUESTS, exc, "LimiteTentativasExcedido")
        resposta.headers["Retry-After"] = str(exc.segundos_restantes)
        return resposta
    if isinstance(exc, EstoqueInsuficienteException):
        return _erro(422, exc, "EstoqueInsuficiente", detalhes={
            "peca": exc.peca_descricao, "disponivel": exc.estoque_atual, "requisitado": exc.quantidade_requisitada
        })
    for classe, codigo, tipo in MAPA_EXCECOES:
        if isinstance(exc, classe):
            resposta = _erro(codigo, exc, tipo)
            if codigo == status.HTTP_401_UNAUTHORIZED:
                resposta.headers["WWW-Authenticate"] = "Bearer"
            return resposta
    return _erro(status.HTTP_400_BAD_REQUEST, exc, "RegraNegocio")


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"erro": "Registro duplicado ou em uso por outro cadastro.", "tipo": "ViolacaoIntegridade"},
    )


api_v1 = APIRouter(prefix=settings.API_V1_PREFIX)
for router in (
    auth_router, usuarios_router, pecas_router, clientes_router, vendas_router, os_router, caixa_router,
    financeiro_router, relatorios_router, telegram_router, hardware_router, ws_router,
):
    api_v1.include_router(router)
app.include_router(api_v1)


@app.get("/", tags=["Status"])
async def root():
    return {
        "status": "online",
        "servico": settings.PROJECT_NAME,
        "versao": settings.VERSION,
        "documentacao_swagger": "/docs",
        "documentacao_redoc": "/redoc",
        "health_check": "/health",
        "rotas_api": settings.API_V1_PREFIX,
    }


@app.get("/health", tags=["Status"])
async def health_check():
    return {"status": "online", "servico": settings.PROJECT_NAME, "versao": settings.VERSION}
