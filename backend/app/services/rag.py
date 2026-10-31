"""Service RAG (ChromaDB + sentence-transformers).

Interface stable : ingest / search / context_for / delete.

`warmup()` existe parce que le premier chargement (import de torch + modèle
d'embedding) coûte de 50 s à plusieurs minutes selon la machine : on le fait au
démarrage du serveur, en tâche de fond, plutôt qu'au premier document déposé.
"""
import re
import threading
from dataclasses import dataclass
from pathlib import Path

from app.config import Settings
from app.services.documents import chunk_text, extract_text


class RagUnavailable(RuntimeError):
    pass


# Mots trop courants pour servir de mot-clé dans la recherche exacte.
_MOTS_VIDES = {
    "quelle", "quelles", "quel", "quels", "entre", "comment", "pourquoi", "est-ce", "dans",
    "pour", "avec", "sans", "sont", "cette", "votre", "notre", "leur", "leurs", "faire",
    "explique", "expliquer", "moi", "différence", "difference", "définition", "cours",
    "document", "documents", "selon", "d'après", "après", "avant", "quoi", "plus", "moins",
    "comprends", "comprendre", "compris", "donne", "donner", "aide", "aider", "veux", "peux",
    "savoir", "montre", "montrer", "parle", "parler", "c'est", "qu'est-ce", "elle", "elles",
}


def _mots_cles(question: str) -> list[str]:
    """Mots distinctifs de la question (termes techniques, sigles, noms propres)."""
    mots = re.findall(r"[\w’'\-]{4,}", question)
    vus, garde = set(), []
    for mot in mots:
        cle = mot.lower()
        if cle in _MOTS_VIDES or cle in vus:
            continue
        vus.add(cle)
        garde.append(mot)
    return garde[:6]


@dataclass
class Hit:
    source_id: str
    filename: str
    text: str
    score: float


class RagService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._collection = None
        self._embedder = None
        self._lock = threading.Lock()
        self.ready = False

    def _ensure(self):
        if self._collection is not None:
            return
        with self._lock:
            if self._collection is not None:  # un autre thread a chargé entre-temps
                return
            try:
                import chromadb
                from sentence_transformers import SentenceTransformer
            except ImportError as e:
                raise RagUnavailable("Installe requirements-rag.txt pour activer le RAG") from e
            client = chromadb.PersistentClient(path=str(self.settings.chroma_dir))
            self._collection = client.get_or_create_collection("sources", metadata={"hnsw:space": "cosine"})
            self._embedder = SentenceTransformer(self.settings.embedding_model)
            self.ready = True

    def warmup(self) -> bool:
        """Charge Chroma + le modèle d'embedding. Ne lève jamais : le serveur doit
        démarrer même si le RAG est indisponible (mode dégradé explicite)."""
        try:
            self._ensure()
            return True
        except Exception:  # noqa: BLE001 - le démarrage ne doit pas échouer
            self.ready = False
            return False

    def _embed(self, texts: list[str]) -> list[list[float]]:
        return self._embedder.encode(texts, normalize_embeddings=True).tolist()

    @staticmethod
    def _where(source_ids: list[str] | None):
        if not source_ids:
            return None
        return {"source_id": source_ids[0]} if len(source_ids) == 1 else {"source_id": {"$in": source_ids}}

    def ingest(self, source_id: str, path: Path, filename: str) -> int:
        # Extraction d'abord : un fichier illisible ou d'un format non supporté
        # doit échouer vite, sans charger le modèle d'embedding (plusieurs
        # secondes) pour rien.
        chunks = chunk_text(extract_text(path))
        if not chunks:
            raise ValueError("Aucun texte exploitable dans ce document (PDF scanné ?)")
        self._ensure()
        self._collection.add(
            ids=[f"{source_id}:{i}" for i in range(len(chunks))],
            documents=chunks,
            embeddings=self._embed(chunks),
            metadatas=[{"source_id": source_id, "filename": filename, "chunk": i} for i in range(len(chunks))],
        )
        return len(chunks)

    def search(self, query: str, k: int = 5, source_ids: list[str] | None = None) -> list[Hit]:
        self._ensure()
        res = self._collection.query(
            query_embeddings=self._embed([query]), n_results=k, where=self._where(source_ids))
        hits = []
        for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
            hits.append(Hit(meta["source_id"], meta["filename"], doc, round(1 - dist, 4)))
        try:
            exacts = self._recherche_exacte(query, source_ids, limite=max(1, k // 2))
        except Exception:  # noqa: BLE001 - la recherche exacte n'est qu'un complément
            exacts = []
        if not exacts:
            return hits
        # Les passages qui contiennent les mots exacts de la question passent en tête,
        # puis la recherche par le sens complète jusqu'à k passages.
        textes = {h.text for h in exacts}
        return (exacts + [h for h in hits if h.text not in textes])[:k]

    def _recherche_exacte(self, query: str, source_ids: list[str] | None, limite: int) -> list[Hit]:
        """Passages contenant le plus de mots-clés de la question (recherche lexicale).

        Complète la recherche vectorielle : un modèle d'embedding léger rate souvent
        un passage technique (WHERE, HAVING, PK…) qu'une simple recherche de mots trouve.
        """
        mots = _mots_cles(query)
        if not mots:
            return []
        compte: dict[str, int] = {}
        documents: dict[str, tuple[str, dict]] = {}
        for mot in mots:
            ids_mot: set[str] = set()
            for variante in {mot, mot.lower(), mot.upper(), mot.capitalize()}:
                got = self._collection.get(
                    where=self._where(source_ids),
                    where_document={"$contains": variante},
                    include=["documents", "metadatas"],
                )
                for ident, doc, meta in zip(got["ids"], got["documents"], got["metadatas"]):
                    ids_mot.add(ident)
                    documents[ident] = (doc, meta)
            for ident in ids_mot:
                compte[ident] = compte.get(ident, 0) + 1
        if not compte:
            return []
        # Il faut au moins deux mots-clés en commun (ou le seul mot-clé s'il n'y en a qu'un).
        seuil = min(2, len(mots))

        def occurrences(ident: str) -> int:
            texte = documents[ident][0].lower()
            return sum(texte.count(m.lower()) for m in mots)

        # D'abord le nombre de mots-clés différents, puis leur nombre d'apparitions.
        retenus = sorted(
            (i for i, n in compte.items() if n >= seuil),
            key=lambda i: (-compte[i], -occurrences(i)),
        )[:limite]
        return [
            Hit(documents[i][1]["source_id"], documents[i][1]["filename"], documents[i][0],
                round(compte[i] / len(mots), 4))
            for i in retenus
        ]

    def context_for(self, query: str, source_ids: list[str] | None, max_chars: int = 12000) -> str:
        self._ensure()
        if query:
            texts = [h.text for h in self.search(query, k=15, source_ids=source_ids)]
        else:
            got = self._collection.get(where=self._where(source_ids), limit=40)
            texts = got["documents"]
        out, total = [], 0
        for t in texts:
            if total + len(t) > max_chars:
                break
            out.append(t)
            total += len(t)
        return "\n\n".join(out)

    def delete(self, source_id: str) -> None:
        self._ensure()
        self._collection.delete(where={"source_id": source_id})
