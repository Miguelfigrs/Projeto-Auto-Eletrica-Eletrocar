"""
Controlador WebSocket: notificações em tempo real (OS por voz, bips do leitor, vendas, PIX liquidado).
A conexão exige access token válido: /api/v1/ws/notificacoes?token=<access_token>
"""
import json
from typing import List
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import async_sessionmaker
from src.infra.database.session import get_fabrica_sessoes
from src.domain.exceptions.domain_exceptions import CredenciaisInvalidasException
from src.adapters.controllers.dependencies import usuario_do_token

router = APIRouter(tags=["WebSockets"])

CODIGO_NAO_AUTORIZADO = 4401


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"evento": event_type, "dados": data}, default=str)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


@router.websocket("/ws/notificacoes")
async def websocket_notificacoes(websocket: WebSocket, fabrica: async_sessionmaker = Depends(get_fabrica_sessoes)):
    try:
        async with fabrica() as session:
            await usuario_do_token(websocket.query_params.get("token"), session)
    except CredenciaisInvalidasException:
        await websocket.close(code=CODIGO_NAO_AUTORIZADO)
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # mantém a conexão viva (pings do cliente)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
