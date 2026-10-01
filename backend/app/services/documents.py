"""Extraction de texte (PDF, DOCX, TXT/MD) et découpage en passages."""
import re
from pathlib import Path


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader

        return "\n\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)
    if suffix == ".docx":
        from docx import Document

        return "\n\n".join(p.text for p in Document(str(path)).paragraphs)
    if suffix in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    raise ValueError(f"Format non supporté : {suffix} (PDF, DOCX, TXT, MD)")


def chunk_text(text: str, size: int = 1000, overlap: int = 150) -> list[str]:
    """Découpage par paragraphes avec recouvrement entre passages consécutifs."""
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        return []
    pieces: list[str] = []
    for para in (p.strip() for p in text.split("\n\n")):
        while len(para) > size:
            cut = para.rfind(" ", 0, size)
            if cut <= 0:
                cut = size
            pieces.append(para[:cut])
            para = para[cut:].strip()
        if para:
            pieces.append(para)
    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + len(piece) + 1 > size:
            chunks.append(current)
            current = f"{current[-overlap:]}\n{piece}".strip()
        else:
            current = f"{current}\n{piece}".strip()
    if current:
        chunks.append(current)
    return chunks
