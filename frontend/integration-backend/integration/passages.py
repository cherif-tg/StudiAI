"""Format recommandé pour l'étape `rag_search` renvoyée par POST /chat.

L'interface affiche sous chaque réponse les documents cités ; un clic montre les
extraits exacts. Elle reconnaît plusieurs formats, mais celui-ci est le plus
simple et le plus complet :

    step = {
        "tool": "rag_search",
        "args": {"query": "..."},
        "result_preview": "3 passages",
        "data": {"passages": passages_pour_interface(resultats)},
    }
"""
from __future__ import annotations

from typing import Any, Iterable


def passages_pour_interface(resultats: Iterable[Any], longueur_max: int = 1200) -> list[dict]:
    """Convertit les résultats de la base vectorielle en passages pour l'interface.

    Accepte des objets ou des dictionnaires exposant `text`/`page_content`,
    `metadata` (filename, source_id, page) et un score de similarité.
    """
    passages = []
    for r in resultats:
        get = (lambda k, d=None: r.get(k, d)) if isinstance(r, dict) else (lambda k, d=None: getattr(r, k, d))
        meta = get("metadata", {}) or {}
        texte = get("text") or get("page_content") or get("document") or ""
        passages.append(
            {
                "source_id": meta.get("source_id") or get("source_id"),
                "filename": meta.get("filename") or meta.get("source") or get("filename") or "Document",
                "page": meta.get("page") if meta.get("page") is not None else get("page"),
                "score": round(float(get("score") or 0), 3) if get("score") is not None else None,
                "text": str(texte)[:longueur_max],
            }
        )
    return passages
