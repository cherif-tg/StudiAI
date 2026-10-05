"""Service RAG (ChromaDB + sentence-transformers).

Interface stable : ingest / search / context_for / delete.
"""
from dataclasses import dataclass
from pathlib import Path

from app.config import Settings
from app.services.documents import chunk_text, extract_text


class RagUnavailable(RuntimeError):
    pass


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

    def _ensure(self):
        if self._collection is not None:
            return
        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
        except ImportError as e:
            raise RagUnavailable("Installe requirements-rag.txt pour activer le RAG") from e
        client = chromadb.PersistentClient(path=str(self.settings.chroma_dir))
        self._collection = client.get_or_create_collection("sources", metadata={"hnsw:space": "cosine"})
        self._embedder = SentenceTransformer(self.settings.embedding_model)

    def _embed(self, texts: list[str]) -> list[list[float]]:
        return self._embedder.encode(texts, normalize_embeddings=True).tolist()

    @staticmethod
    def _where(source_ids: list[str] | None):
        if not source_ids:
            return None
        return {"source_id": source_ids[0]} if len(source_ids) == 1 else {"source_id": {"$in": source_ids}}

    def ingest(self, source_id: str, path: Path, filename: str) -> int:
        self._ensure()
        chunks = chunk_text(extract_text(path))
        if not chunks:
            raise ValueError("Aucun texte exploitable dans ce document (PDF scanné ?)")
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
        return hits

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
