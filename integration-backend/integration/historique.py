"""Historique des conversations côté serveur (SQLite).

Aujourd'hui la mémoire de l'agent vit en RAM et disparaît au redémarrage.
Cette classe la rend durable : chaque échange est ajouté à la table
`conversation_messages`, et la mémoire est rechargée quand une session
inconnue revient (serveur redémarré, conversation reprise depuis l'historique).

Routes optionnelles (pour un historique partagé entre appareils) :
    GET    /conversations            liste des conversations du compte
    GET    /conversations/{id}       messages d'une conversation
    DELETE /conversations/{id}       oublier une conversation
"""
from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Callable, Optional

from fastapi import APIRouter, HTTPException, Request, Response, status

from .adaptateur import Utilisateur

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversation_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT    NOT NULL,
    user_id     TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT    NOT NULL,
    created_at  REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conv_session ON conversation_messages (session_id, id);
CREATE INDEX IF NOT EXISTS idx_conv_user    ON conversation_messages (user_id, created_at);
"""


class HistoriqueSQLite:
    def __init__(self, chemin_db: str | Path) -> None:
        self._chemin = str(chemin_db)
        self._verrou = threading.Lock()
        with self._connexion() as db:
            db.executescript(SCHEMA)

    def _connexion(self) -> sqlite3.Connection:
        db = sqlite3.connect(self._chemin, check_same_thread=False)
        db.row_factory = sqlite3.Row
        return db

    def ajouter(self, session_id: str, user_id: str, role: str, contenu: str) -> None:
        with self._verrou, self._connexion() as db:
            db.execute(
                "INSERT INTO conversation_messages (session_id, user_id, role, content, created_at) VALUES (?,?,?,?,?)",
                (session_id, user_id, role, contenu, time.time()),
            )

    def charger(self, session_id: str, user_id: str, limite: int = 40) -> list[dict]:
        """Derniers messages, du plus ancien au plus récent (format OpenAI/Groq)."""
        with self._connexion() as db:
            lignes = db.execute(
                "SELECT role, content FROM conversation_messages WHERE session_id=? AND user_id=? "
                "ORDER BY id DESC LIMIT ?",
                (session_id, user_id, limite),
            ).fetchall()
        return [{"role": l["role"], "content": l["content"]} for l in reversed(lignes)]

    def lister(self, user_id: str, limite: int = 50) -> list[dict]:
        with self._connexion() as db:
            lignes = db.execute(
                """
                SELECT session_id,
                       MAX(created_at) AS maj,
                       COUNT(*)        AS nb,
                       (SELECT content FROM conversation_messages c2
                         WHERE c2.session_id = c.session_id AND c2.role = 'user'
                         ORDER BY id LIMIT 1) AS titre
                  FROM conversation_messages c
                 WHERE user_id = ?
              GROUP BY session_id
              ORDER BY maj DESC
                 LIMIT ?
                """,
                (user_id, limite),
            ).fetchall()
        return [
            {"id": l["session_id"], "titre": (l["titre"] or "Conversation")[:80], "maj": l["maj"], "nb": l["nb"]}
            for l in lignes
        ]

    def supprimer(self, session_id: str, user_id: str) -> int:
        with self._verrou, self._connexion() as db:
            return db.execute(
                "DELETE FROM conversation_messages WHERE session_id=? AND user_id=?", (session_id, user_id)
            ).rowcount

    def supprimer_utilisateur(self, user_id: str) -> None:
        """À appeler depuis `DepotComptes.supprimer_utilisateur` (suppression du compte)."""
        with self._verrou, self._connexion() as db:
            db.execute("DELETE FROM conversation_messages WHERE user_id=?", (user_id,))


def creer_routeur_historique(
    historique: HistoriqueSQLite, utilisateur_connecte: Callable[[Request], Optional[Utilisateur]]
) -> APIRouter:
    routeur = APIRouter(tags=["conversations"])

    def exiger(requete: Request) -> Utilisateur:
        utilisateur = utilisateur_connecte(requete)
        if not utilisateur:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Connecte-toi pour continuer.")
        return utilisateur

    @routeur.get("/conversations")
    def lister(requete: Request) -> list[dict]:
        return historique.lister(exiger(requete).id)

    @routeur.get("/conversations/{session_id}")
    def lire(session_id: str, requete: Request) -> list[dict]:
        messages = historique.charger(session_id, exiger(requete).id, limite=500)
        if not messages:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation introuvable.")
        return messages

    @routeur.delete("/conversations/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
    def oublier(session_id: str, requete: Request):
        historique.supprimer(session_id, exiger(requete).id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return routeur
