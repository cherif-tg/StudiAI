"""Journal SQLite : utilisateurs, sessions, sources, artefacts et traces.

Tout ce qui appartient à quelqu'un porte un `owner_id` (identifiant
d'utilisateur). Les listes sont toujours filtrées par propriétaire : c'est la
seule barrière qui empêche un compte de lire les documents d'un autre.
"""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    created_at REAL);

CREATE TABLE IF NOT EXISTS sessions(
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at REAL,
    expires_at REAL);

CREATE TABLE IF NOT EXISTS sources(
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    filename TEXT,
    chunks INTEGER,
    created_at REAL);

CREATE TABLE IF NOT EXISTS artifacts(
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    session_id TEXT,
    kind TEXT,
    title TEXT,
    path TEXT,
    mime TEXT,
    created_at REAL);

CREATE TABLE IF NOT EXISTS events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    tool TEXT,
    args TEXT,
    result_preview TEXT,
    created_at REAL);
"""

# Créés après la migration : un index sur une colonne absente ferait échouer
# l'ouverture d'une base antérieure aux comptes.
INDEX = """
CREATE INDEX IF NOT EXISTS idx_sources_owner ON sources(owner_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_owner ON artifacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
"""


class Journal:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as c:
            c.executescript(SCHEMA)
            self._migrer(c)
            c.executescript(INDEX)

    @staticmethod
    def _colonnes(conn: sqlite3.Connection, table: str) -> set[str]:
        return {ligne["name"] for ligne in conn.execute(f"PRAGMA table_info({table})")}

    def _migrer(self, conn: sqlite3.Connection) -> None:
        """Ajoute les colonnes manquantes sur une base créée avant les comptes."""
        if "owner_id" not in self._colonnes(conn, "sources"):
            conn.execute("ALTER TABLE sources ADD COLUMN owner_id TEXT")
        if "owner_id" not in self._colonnes(conn, "artifacts"):
            conn.execute("ALTER TABLE artifacts ADD COLUMN owner_id TEXT")
        if "session_id" not in self._colonnes(conn, "artifacts"):
            conn.execute("ALTER TABLE artifacts ADD COLUMN session_id TEXT")

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    # --- Utilisateurs ----------------------------------------------------

    def ajouter_utilisateur(self, email: str, nom: str, password_hash: str) -> dict:
        identifiant = uuid.uuid4().hex
        with self._conn() as c:
            c.execute(
                "INSERT INTO users(id, email, name, password_hash, created_at) VALUES (?,?,?,?,?)",
                (identifiant, email, nom, password_hash, time.time()),
            )
        return {"id": identifiant, "email": email, "name": nom}

    def utilisateur_par_email(self, email: str) -> dict | None:
        with self._conn() as c:
            ligne = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
            return dict(ligne) if ligne else None

    def utilisateur(self, identifiant: str) -> dict | None:
        with self._conn() as c:
            ligne = c.execute("SELECT * FROM users WHERE id=?", (identifiant,)).fetchone()
            return dict(ligne) if ligne else None

    # --- Sessions --------------------------------------------------------

    def creer_session(self, token_hash: str, user_id: str, expires_at: float) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO sessions(token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)",
                (token_hash, user_id, time.time(), expires_at),
            )

    def session_valide(self, token_hash: str) -> dict | None:
        with self._conn() as c:
            ligne = c.execute(
                "SELECT * FROM sessions WHERE token_hash=? AND expires_at > ?",
                (token_hash, time.time()),
            ).fetchone()
            return dict(ligne) if ligne else None

    def supprimer_session(self, token_hash: str) -> None:
        with self._conn() as c:
            c.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash,))

    def purger_sessions(self) -> None:
        with self._conn() as c:
            c.execute("DELETE FROM sessions WHERE expires_at <= ?", (time.time(),))

    def supprimer_sessions_utilisateur(self, user_id: str) -> None:
        with self._conn() as c:
            c.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))

    # --- Sources ---------------------------------------------------------

    def add_source(self, owner_id: str, source_id: str, filename: str, chunks: int) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO sources(id, owner_id, filename, chunks, created_at) VALUES (?,?,?,?,?)",
                (source_id, owner_id, filename, chunks, time.time()),
            )

    def list_sources(self, owner_id: str) -> list[dict]:
        with self._conn() as c:
            return [
                dict(r)
                for r in c.execute(
                    "SELECT * FROM sources WHERE owner_id=? ORDER BY created_at DESC", (owner_id,)
                )
            ]

    def source(self, owner_id: str, source_id: str) -> dict | None:
        with self._conn() as c:
            ligne = c.execute(
                "SELECT * FROM sources WHERE id=? AND owner_id=?", (source_id, owner_id)
            ).fetchone()
            return dict(ligne) if ligne else None

    def supprimer_source(self, owner_id: str, source_id: str) -> None:
        with self._conn() as c:
            c.execute("DELETE FROM sources WHERE id=? AND owner_id=?", (source_id, owner_id))

    # --- Artefacts -------------------------------------------------------

    def add_artifact(
        self, owner_id: str, kind: str, title: str, path: Path, mime: str, session_id: str = ""
    ) -> str:
        artifact_id = uuid.uuid4().hex[:12]
        with self._conn() as c:
            c.execute(
                "INSERT INTO artifacts(id, owner_id, session_id, kind, title, path, mime, created_at)"
                " VALUES (?,?,?,?,?,?,?,?)",
                (artifact_id, owner_id, session_id, kind, title, str(path), mime, time.time()),
            )
        return artifact_id

    def get_artifact(self, owner_id: str, artifact_id: str) -> dict | None:
        with self._conn() as c:
            ligne = c.execute(
                "SELECT * FROM artifacts WHERE id=? AND owner_id=?", (artifact_id, owner_id)
            ).fetchone()
            return dict(ligne) if ligne else None

    def list_artifacts(self, owner_id: str) -> list[dict]:
        with self._conn() as c:
            return [
                dict(r)
                for r in c.execute(
                    "SELECT * FROM artifacts WHERE owner_id=? ORDER BY created_at DESC", (owner_id,)
                )
            ]

    # --- Traces ----------------------------------------------------------

    def log_event(self, session_id: str, tool: str, args: dict, result_preview: str) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO events(session_id, tool, args, result_preview, created_at) VALUES (?,?,?,?,?)",
                (
                    session_id,
                    tool,
                    json.dumps(args, ensure_ascii=False, default=str),
                    result_preview[:500],
                    time.time(),
                ),
            )

    def list_events(self, session_id: str) -> list[dict]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM events WHERE session_id=? ORDER BY id DESC LIMIT 200", (session_id,)
            )
            return [dict(r) for r in rows]
