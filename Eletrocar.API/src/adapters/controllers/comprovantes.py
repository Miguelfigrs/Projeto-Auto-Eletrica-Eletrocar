"""
Apresentação de comprovantes térmicos: PDF (bobina 80/58 mm), texto puro ou link do WhatsApp.
"""
from fastapi import Response
from fastapi.responses import PlainTextResponse
from src.application.use_cases.emitir_comprovante_use_case import ComprovanteDTO
from src.adapters.gateways.pdf_termico import renderizar_pdf_termico


def responder_comprovante(comprovante: ComprovanteDTO, formato: str, nome_arquivo: str):
    if formato == "texto":
        return PlainTextResponse(comprovante.texto)
    if formato == "whatsapp":
        return {"titulo": comprovante.titulo, "link_whatsapp": comprovante.link_whatsapp, "texto": comprovante.texto}
    return Response(
        content=renderizar_pdf_termico(comprovante.linhas, comprovante.largura_mm),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nome_arquivo}.pdf"'},
    )
