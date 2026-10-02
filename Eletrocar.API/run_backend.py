"""
Script utilitário para inicialização do servidor backend FastAPI da Eletrocar.
"""
import uvicorn

if __name__ == "__main__":
    print("Iniciando servidor backend da Auto Elétrica Eletrocar...")
    print("API disponível em: http://127.0.0.1:8000")
    print("Documentação Swagger Interativa: http://127.0.0.1:8000/docs")
    print("Documentação Redoc: http://127.0.0.1:8000/redoc")
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
