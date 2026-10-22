"""Avis sur les réponses de l'agent : POST /chat/feedback.

L'interface envoie un avis (utile / inutile, motif facultatif) à chaque clic sur
les pouces sous une réponse. Tant que cette route n'existe pas, elle garde l'avis
localement et cesse d'appeler le serveur pour la session (aucune erreur visible).

Les avis permettent de repérer les réponses jugées inexactes ou hors sujet et
d'améliorer les consignes de l'agent. La question et la réponse sont tronquées.
"""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Callable, Literal, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from .adaptateur import Utilisateur

SCHEMA = """
CREATE TABLE IF NOT EXISTS message_feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    message_id  TEXT NOT NULL,
    avis        TEXT NOT NULL CHECK (avis IN ('utile', 'inutile')),
    motif       TEXT,
    question    TEXT,
    reponse     TEXT,
    created_at  REAL NOT NULL,
    UNIQUE (user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_feedback_avis ON message_feedback (avis, created_at);
"""


class CorpsAvis(BaseModel):
    session_id: str = Field(max_length=100)
    message_id: str = Field(max_length=100)
    avis: Literal["utile", "inutile"]
    motif: Optional[str] = Field(default=None, max_length=60)
    question: Optional[str] = Field(default=None, max_length=2000)
    reponse: Optional[str] = Field(default=None, max_length=4000)


def creer_routeur_avis(
    chemin_db: str | Path, utilisateur_connecte: Callable[[Request], Optional[Utilisateur]]
) -> APIRouter:
    routeur = APIRouter(tags=["avis"])
    chemin = str(chemin_db)
    with sqlite3.connect(chemin) as db:
        db.executescript(SCHEMA)

    @routeur.post("/chat/feedback")
    def donner_avis(corps: CorpsAvis, requete: Request) -> dict:
        utilisateur = utilisateur_connecte(requete)
        if not utilisateur:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Connecte-toi pour continuer.")
        with sqlite3.connect(chemin) as db:
            # Un avis par message et par personne : le dernier clic l'emporte.
            db.execute(
                """
                INSERT INTO message_feedback
                    (user_id, session_id, message_id, avis, motif, question, reponse, created_at)
                VALUES (?,?,?,?,?,?,?,?)
                ON CONFLICT (user_id, message_id) DO UPDATE SET
                    avis = excluded.avis, motif = excluded.motif, created_at = excluded.created_at
                """,
                (utilisateur.id, corps.session_id, corps.message_id, corps.avis, corps.motif,
                 corps.question, corps.reponse, time.time()),
            )
        return {"ok": True}

    return routeur
