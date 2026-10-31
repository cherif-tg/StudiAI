"""Extraction de texte (PDF, DOCX, TXT/MD) et découpage en passages."""
import re
from pathlib import Path


def _docx_text(path: Path) -> str:
    """Texte du DOCX, paragraphes *et* tableaux, dans l'ordre du document.

    `Document.paragraphs` ignore le contenu des tableaux : un cours mis en
    tableau, ou un cahier des charges dont les exigences sont tabulées, serait
    indexé incomplet et donc introuvable par le RAG.
    """
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    doc = Document(str(path))
    parts: list[str] = []
    for child in doc.element.body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            parts.append(Paragraph(child, doc).text)
        elif tag == "tbl":
            for row in Table(child, doc).rows:
                cells = [cell.text.strip() for cell in row.cells]
                if any(cells):
                    parts.append(" | ".join(cells))
    return "\n\n".join(p for p in parts if p.strip())


def _nettoyer_pdf(texte: str) -> str:
    """Recolle les PDF dont l'extraction met un mot par ligne.

    Certains PDF (exports Google Docs notamment) sortent sous la forme
    « mot\\n \\nmot\\n \\nmot ». Le passage devient du bruit pour le modèle
    d'embedding, qui ne lit que le début de chaque passage. On ne touche qu'aux
    textes qui présentent nettement ce motif.
    """
    if texte.count("\n \n") < 0.3 * max(1, len(texte.split())):
        return texte
    texte = re.sub(r"\n \n(?: \n)+", "\n\n", texte)   # deux séparateurs ou plus : paragraphe
    texte = texte.replace("\n \n", " ")                  # séparateur simple : espace entre mots
    texte = re.sub(r"\n(?=[.,;:!?)])", "", texte)        # ponctuation recollée au mot
    texte = re.sub(r"(?<!\n)\n(?!\n)", " ", texte)        # retour à la ligne isolé
    return re.sub(r"[ \t]{2,}", " ", texte)


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader

        return _nettoyer_pdf("\n\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages))
    if suffix == ".docx":
        return _docx_text(path)
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
