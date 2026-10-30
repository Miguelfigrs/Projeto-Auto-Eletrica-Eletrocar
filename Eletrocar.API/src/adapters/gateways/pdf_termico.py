"""
Renderizador de PDF para bobina térmica (80 mm / 58 mm) sem dependências externas.
Gera um PDF de uma página com fonte monoespaçada (Courier, WinAnsi) e altura proporcional ao conteúdo.
"""
from typing import List

MM_PARA_PONTOS = 72 / 25.4
TAMANHO_FONTE = {80: 8.0, 58: 7.0}
MARGEM_MM = 3


def _escapar(texto: str) -> bytes:
    bruto = texto.encode("cp1252", errors="replace")
    return bruto.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def renderizar_pdf_termico(linhas: List[str], largura_mm: int) -> bytes:
    fonte = TAMANHO_FONTE.get(largura_mm, 8.0)
    entrelinha = fonte * 1.25
    margem = MARGEM_MM * MM_PARA_PONTOS
    largura = largura_mm * MM_PARA_PONTOS
    altura = 2 * margem + entrelinha * max(len(linhas), 1)

    conteudo = [b"BT", f"/F1 {fonte:.1f} Tf".encode(), f"{entrelinha:.2f} TL".encode(),
                f"{margem:.2f} {altura - margem - fonte:.2f} Td".encode()]
    for linha in linhas:
        conteudo.append(b"(" + _escapar(linha) + b") Tj T*")
    conteudo.append(b"ET")
    fluxo = b"\n".join(conteudo)

    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {largura:.2f} {altura:.2f}] "
        f"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>".encode(),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
        f"<< /Length {len(fluxo)} >>\nstream\n".encode() + fluxo + b"\nendstream",
    ]

    saida = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    deslocamentos = []
    for numero, objeto in enumerate(objetos, start=1):
        deslocamentos.append(len(saida))
        saida += f"{numero} 0 obj\n".encode() + objeto + b"\nendobj\n"
    inicio_xref = len(saida)
    saida += f"xref\n0 {len(objetos) + 1}\n0000000000 65535 f \n".encode()
    for desloc in deslocamentos:
        saida += f"{desloc:010d} 00000 n \n".encode()
    saida += f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{inicio_xref}\n%%EOF\n".encode()
    return bytes(saida)
