"""
Ponto de entrada da aplicação FastAPI - Auto Elétrica Eletrocar.
Configuração de middlewares, rotas REST, WebSockets, exception handlers de domínio e inicialização de dados base.
"""
from contextlib import asynccontextmanager
from decimal import Decimal
import uuid
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.infra.config import settings
from src.infra.database.session import init_db, AsyncSessionLocal
from src.infra.security.security import BcryptPasswordHasher
from src.adapters.repositories.usuario_repository_sqlalchemy import UsuarioRepositorySQLAlchemy
from src.adapters.repositories.peca_repository_sqlalchemy import PecaRepositorySQLAlchemy
from src.domain.entities.usuario import Usuario
from src.domain.entities.peca import Peca
from src.domain.value_objects.enums import Role
from src.domain.exceptions.domain_exceptions import (
    DomainException,
    EntidadeNaoEncontradaException,
    CredenciaisInvalidasException,
    EstoqueInsuficienteException,
    TransicaoStatusInvalidaException,
    CaixaFechadoException
)

# Controladores
from src.adapters.controllers.auth_controller import router as auth_router
from src.adapters.controllers.pecas_controller import router as pecas_router
from src.adapters.controllers.clientes_controller import router as clientes_router
from src.adapters.controllers.vendas_controller import router as vendas_router
from src.adapters.controllers.os_controller import router as os_router
from src.adapters.controllers.caixa_controller import router as caixa_router
from src.adapters.controllers.dre_controller import router as dre_router
from src.adapters.controllers.telegram_controller import router as telegram_router
from src.adapters.controllers.hardware_controller import router as hardware_router
from src.adapters.controllers.ws_controller import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa tabelas
    await init_db()
    
    # Seed de usuário Admin padrão caso o banco esteja vazio
    async with AsyncSessionLocal() as session:
        user_repo = UsuarioRepositorySQLAlchemy(session)
        admin = await user_repo.buscar_por_email("admin@eletrocar.com.br")
        if not admin:
            hasher = BcryptPasswordHasher()
            novo_admin = Usuario(
                id=uuid.uuid4(),
                nome="Administrador Eletrocar",
                email="admin@eletrocar.com.br",
                senha_hash=hasher.hash("admin123"),
                role=Role.ADMIN,
                pin_caixa="1234"
            )
            await user_repo.salvar(novo_admin)

            eletricista = Usuario(
                id=uuid.uuid4(),
                nome="Marcio Eletricista",
                email="marcio@eletrocar.com.br",
                senha_hash=hasher.hash("marcio123"),
                role=Role.ELETRICISTA,
                telegram_user_id="987654321",
                pin_caixa="4321"
            )
            await user_repo.salvar(eletricista)

            # Seed inicial de peça de exemplo para leitor de código de barras
            peca_repo = PecaRepositorySQLAlchemy(session)
            peca_exemplo = Peca(
                id=uuid.uuid4(),
                codigo_barras="7891049281023",
                sku="REG-BOSCH-12V",
                descricao="Regulador de Voltagem Bosch 12V",
                preco_custo=Decimal("110.00"),
                preco_venda=Decimal("185.00"),
                estoque_atual=15,
                estoque_minimo=3,
                localizacao="Prateleira B3"
            )
            await peca_repo.salvar(peca_exemplo)
            await session.commit()

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend de alta performance para a Auto Elétrica Eletrocar (Clean Architecture, DDD & TDD)",
    lifespan=lifespan
)

# CORS Middleware para acesso local e da rede da oficina
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers do Domínio
@app.exception_handler(EntidadeNaoEncontradaException)
async def entidade_nao_encontrada_handler(request: Request, exc: EntidadeNaoEncontradaException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"erro": exc.mensagem, "tipo": "EntidadeNaoEncontrada"}
    )


@app.exception_handler(CredenciaisInvalidasException)
async def credenciais_invalidas_handler(request: Request, exc: CredenciaisInvalidasException):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"erro": exc.mensagem, "tipo": "CredenciaisInvalidas"}
    )


@app.exception_handler(EstoqueInsuficienteException)
async def estoque_insuficiente_handler(request: Request, exc: EstoqueInsuficienteException):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "erro": exc.mensagem,
            "tipo": "EstoqueInsuficiente",
            "detalhes": {
                "peca": exc.peca_descricao,
                "disponivel": exc.estoque_atual,
                "requisitado": exc.quantidade_requisitada
            }
        }
    )


@app.exception_handler(TransicaoStatusInvalidaException)
async def transicao_invalida_handler(request: Request, exc: TransicaoStatusInvalidaException):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"erro": exc.mensagem, "tipo": "TransicaoStatusInvalida"}
    )


@app.exception_handler(CaixaFechadoException)
async def caixa_fechado_handler(request: Request, exc: CaixaFechadoException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"erro": exc.mensagem, "tipo": "CaixaFechado"}
    )


@app.exception_handler(DomainException)
async def domain_exception_handler(request: Request, exc: DomainException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"erro": exc.mensagem, "tipo": "RegraNegocio"}
    )


# Registro de Rotas da API v1 via APIRouter
from fastapi import APIRouter
api_v1 = APIRouter(prefix=settings.API_V1_PREFIX)
api_v1.include_router(auth_router)
api_v1.include_router(pecas_router)
api_v1.include_router(clientes_router)
api_v1.include_router(vendas_router)
api_v1.include_router(os_router)
api_v1.include_router(caixa_router)
api_v1.include_router(dre_router)
api_v1.include_router(telegram_router)
api_v1.include_router(hardware_router)
api_v1.include_router(ws_router)

app.include_router(api_v1)


@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "servico": settings.PROJECT_NAME,
        "versao": settings.VERSION
    }
