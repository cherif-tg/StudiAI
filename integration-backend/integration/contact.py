"""Formulaire de contact du footer : POST /contact.

Côté interface, renseigner `VITE_CONTACT_ENDPOINT=/contact` (même origine)
ou l'URL complète de l'API. Les messages sont gardés dans la table
`contact_messages` et, si SMTP est configuré, transmis à CONTACT_DESTINATAIRE.
"""
from __future__ import annotations

import os
import re
import sqlite3
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from .email_envoi import email_configure, envoyer_email

SCHEMA = """
CREATE TABLE IF NOT EXISTS contact_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL,
    page        TEXT,
    created_at  REAL NOT NULL
);
"""

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


class CorpsContact(BaseModel):
    email: str = Field(max_length=320)
    message: str = Field(min_length=10, max_length=2000)
    page: str | None = Field(default=None, max_length=200)


def creer_routeur_contact(chemin_db: str | Path) -> APIRouter:
    routeur = APIRouter(tags=["contact"])
    chemin = str(chemin_db)
    with sqlite3.connect(chemin) as db:
        db.executescript(SCHEMA)
    derniers: dict[str, float] = {}

    @routeur.post("/contact")
    def contacter(corps: CorpsContact, requete: Request) -> dict:
        if not EMAIL.match(corps.email.strip()):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Adresse e-mail invalide.")
        ip = requete.client.host if requete.client else "?"
        maintenant = time.time()
        if maintenant - derniers.get(ip, 0) < 30:  # un message toutes les 30 s par adresse IP
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Patiente quelques secondes avant de réécrire.")
        derniers[ip] = maintenant

        with sqlite3.connect(chemin) as db:
            db.execute(
                "INSERT INTO contact_messages (email, message, page, created_at) VALUES (?,?,?,?)",
                (corps.email.strip(), corps.message.strip(), corps.page, maintenant),
            )

        destinataire = os.getenv("CONTACT_DESTINATAIRE")
        if destinataire and email_configure():
            envoyer_email(
                destinataire,
                "Nunya : nouveau message de contact",
                f"De : {corps.email}\nPage : {corps.page or '?'}\n\n{corps.message}\n",
            )
        return {"ok": True}

    return routeur
