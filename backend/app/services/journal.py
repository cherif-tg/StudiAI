"""Journal SQLite : sources, artefacts (Carnet) et traces des appels d'outils."""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources(
    id TEXT PRIMARY KEY, filename TEXT, chunks INTEGER, created_at REAL);
CREATE TABLE IF NOT EXISTS artifacts(
    id TEXT PRIMARY KEY, session_id TEXT, kind TEXT, title TEXT,
    path TEXT, mime TEXT, created_at REAL);
CREATE TABLE IF NOT EXISTS events(
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, tool TEXT,
    args TEXT, result_preview TEXT, created_at REAL);
"""


class Journal:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as c:
            c.executescript(SCHEMA)

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def add_source(self, source_id: str, filename: str, chunks: int) -> None:
        with self._conn() as c:
            c.execute("INSERT INTO sources VALUES (?,?,?,?)", (source_id, filename, chunks, time.time()))

    def list_sources(self) -> list[dict]:
        with self._conn() as c:
            return [dict(r) for r in c.execute("SELECT * FROM sources ORDER BY created_at DESC")]

    def delete_source(self, source_id: str) -> None:
        with self._conn() as c:
            c.execute("DELETE FROM sources WHERE id=?", (source_id,))

    def add_artifact(self, session_id: str, kind: str, title: str, path: Path, mime: str) -> str:
        artifact_id = uuid.uuid4().hex[:12]
        with self._conn() as c:
            c.execute(
                "INSERT INTO artifacts VALUES (?,?,?,?,?,?,?)",
                (artifact_id, session_id, kind, title, str(path), mime, time.time()),
            )
        return artifact_id

    def get_artifact(self, artifact_id: str) -> dict | None:
        with self._conn() as c:
            row = c.execute("SELECT * FROM artifacts WHERE id=?", (artifact_id,)).fetchone()
            return dict(row) if row else None

    def list_artifacts(self, session_id: str | None = None) -> list[dict]:
        with self._conn() as c:
            if session_id:
                rows = c.execute(
                    "SELECT * FROM artifacts WHERE session_id=? ORDER BY created_at DESC", (session_id,))
            else:
                rows = c.execute("SELECT * FROM artifacts ORDER BY created_at DESC")
            return [dict(r) for r in rows]

    def log_event(self, session_id: str, tool: str, args: dict, result_preview: str) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO events(session_id, tool, args, result_preview, created_at) VALUES (?,?,?,?,?)",
                (session_id, tool, json.dumps(args, ensure_ascii=False, default=str), result_preview[:500], time.time()),
            )

    def list_events(self, session_id: str) -> list[dict]:
        with self._conn() as c:
            rows = c.execute("SELECT * FROM events WHERE session_id=? ORDER BY id DESC LIMIT 200", (session_id,))
            return [dict(r) for r in rows]
