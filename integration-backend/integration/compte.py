"""Droits sur les données et mot de passe oublié.

    DELETE /auth/me               supprime le compte (mot de passe requis)
    GET    /auth/me/export        archive ZIP : profil, documents d'origine, carnet
    POST   /auth/password/forgot  envoie un lien de réinitialisation (réponse neutre)
    POST   /auth/password/reset   change le mot de passe avec un jeton valide

Branchement (main.py) :
    from app.integration.compte import creer_routeur_compte
    app.include_router(creer_routeur_compte(MonDepot()))
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import secrets
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .adaptateur import DepotComptes, Utilisateur
from .email_envoi import envoyer_email

COOKIE_SESSION = "nunya_session"
DUREE_JETON_S = 30 * 60
MIN_MOT_DE_PASSE = 8


class CorpsSuppression(BaseModel):
    mot_de_passe: str


class CorpsOubli(BaseModel):
    email: str = Field(max_length=320)


class CorpsReinitialisation(BaseModel):
    jeton: str = Field(min_length=20, max_length=200)
    mot_de_passe: str = Field(min_length=MIN_MOT_DE_PASSE, max_length=256)


def _empreinte(jeton: str) -> str:
    return hashlib.sha256(jeton.encode()).hexdigest()


class _Limiteur:
    """Limite simple en mémoire : une demande par clé et par fenêtre."""

    def __init__(self, fenetre_s: float) -> None:
        self.fenetre = fenetre_s
        self.derniers: dict[str, float] = {}

    def autoriser(self, cle: str) -> bool:
        maintenant = time.monotonic()
        if maintenant - self.derniers.get(cle, 0.0) < self.fenetre:
            return False
        self.derniers[cle] = maintenant
        return True


def creer_routeur_compte(depot: DepotComptes, url_publique: Optional[str] = None) -> APIRouter:
    routeur = APIRouter(tags=["compte"])
    limiteur_oubli = _Limiteur(fenetre_s=60)
    base_url = (url_publique or os.getenv("APP_PUBLIC_URL", "http://127.0.0.1:8000")).rstrip("/")

    def utilisateur_connecte(requete: Request) -> Utilisateur:
        jeton = requete.cookies.get(COOKIE_SESSION)
        utilisateur = depot.utilisateur_depuis_jeton(jeton) if jeton else None
        if not utilisateur:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Connecte-toi pour continuer.")
        return utilisateur

    # --- Suppression du compte ---------------------------------------------
    @routeur.delete("/auth/me", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
    def supprimer_compte(corps: CorpsSuppression, requete: Request):
        utilisateur = utilisateur_connecte(requete)
        if not depot.verifier_mot_de_passe(utilisateur.id, corps.mot_de_passe):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Mot de passe incorrect.")

        # Ordre : contenu d'abord (fichiers + index), compte ensuite.
        for source in depot.lister_sources(utilisateur.id):
            depot.supprimer_source(utilisateur.id, source.id)
        for artefact in depot.lister_artefacts(utilisateur.id):
            depot.supprimer_artefact(utilisateur.id, artefact.id)
        depot.fermer_sessions(utilisateur.id)
        depot.supprimer_utilisateur(utilisateur.id)

        sortie = Response(status_code=status.HTTP_204_NO_CONTENT)
        sortie.delete_cookie(COOKIE_SESSION, path="/")
        return sortie

    # --- Export des données -------------------------------------------------
    @routeur.get("/auth/me/export")
    def exporter(requete: Request) -> StreamingResponse:
        utilisateur = utilisateur_connecte(requete)
        sources = depot.lister_sources(utilisateur.id)
        artefacts = depot.lister_artefacts(utilisateur.id)
        maintenant = datetime.now(timezone.utc)

        tampon = io.BytesIO()
        with zipfile.ZipFile(tampon, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(
                "LISEZMOI.txt",
                "Export Nunya\n"
                f"Généré le {maintenant:%d/%m/%Y à %H:%M} (UTC) pour {utilisateur.email}.\n\n"
                "profil.json       ton compte (sans mot de passe)\n"
                "documents.json    la liste de tes documents\n"
                "documents/        les fichiers que tu as déposés\n"
                "carnet.json       la liste de tes résumés et quiz\n"
                "carnet/           leur contenu\n",
            )
            archive.writestr(
                "profil.json",
                json.dumps({"id": utilisateur.id, "email": utilisateur.email, "name": utilisateur.name},
                           ensure_ascii=False, indent=2),
            )
            archive.writestr(
                "documents.json",
                json.dumps([{"id": s.id, "filename": s.filename, "chunks": s.chunks} for s in sources],
                           ensure_ascii=False, indent=2),
            )
            for source in sources:
                if source.chemin and Path(source.chemin).is_file():
                    archive.write(source.chemin, f"documents/{source.id}-{Path(source.filename).name}")
            archive.writestr(
                "carnet.json",
                json.dumps([{"id": a.id, "kind": a.kind, "title": a.title, "created_at": a.created_at}
                            for a in artefacts], ensure_ascii=False, indent=2),
            )
            for artefact in artefacts:
                if Path(artefact.chemin).is_file():
                    archive.write(artefact.chemin, f"carnet/{Path(artefact.chemin).name}")

        tampon.seek(0)
        nom = f"nunya-export-{maintenant:%Y-%m-%d}.zip"
        return StreamingResponse(
            tampon,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{nom}"', "Cache-Control": "no-store"},
        )

    # --- Mot de passe oublié -------------------------------------------------
    @routeur.post("/auth/password/forgot")
    def mot_de_passe_oublie(corps: CorpsOubli, requete: Request) -> dict:
        email = corps.email.strip().lower()
        ip = requete.client.host if requete.client else "?"
        # Réponse toujours identique : on ne révèle pas si un compte existe.
        if not (limiteur_oubli.autoriser(f"email:{email}") and limiteur_oubli.autoriser(f"ip:{ip}:{email}")):
            return {"ok": True}

        utilisateur = depot.utilisateur_par_email(email)
        if utilisateur:
            jeton = secrets.token_urlsafe(32)
            depot.enregistrer_jeton_reinitialisation(utilisateur.id, _empreinte(jeton), time.time() + DUREE_JETON_S)
            lien = f"{base_url}/reinitialiser?jeton={jeton}"
            envoyer_email(
                utilisateur.email,
                "Nunya : choisir un nouveau mot de passe",
                "Bonjour,\n\n"
                "Tu as demandé à changer le mot de passe de ton compte Nunya.\n"
                f"Ouvre ce lien dans les 30 minutes :\n\n{lien}\n\n"
                "Si tu n'es pas à l'origine de cette demande, ignore ce message : "
                "ton mot de passe reste inchangé.\n",
            )
        return {"ok": True}

    @routeur.post("/auth/password/reset")
    def reinitialiser(corps: CorpsReinitialisation) -> dict:
        utilisateur_id = depot.consommer_jeton_reinitialisation(_empreinte(corps.jeton), time.time())
        if not utilisateur_id:
            raise HTTPException(status.HTTP_410_GONE, "Ce lien n'est plus valable.")
        depot.changer_mot_de_passe(utilisateur_id, corps.mot_de_passe)
        depot.fermer_sessions(utilisateur_id)  # déconnecte partout, par sécurité
        return {"ok": True}

    return routeur
