"""Inscription, connexion, déconnexion et profil."""
from __future__ import annotations

import re
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.api.deps import effacer_cookie, poser_cookie, utilisateur_requis
from app.schemas import LoginRequest, RegisterRequest, UserPublic
from app.services.auth import (
    DUREE_SESSION_S,
    LONGUEUR_MIN_MOT_DE_PASSE,
    hasher_mot_de_passe,
    nouveau_jeton,
    verifier_mot_de_passe,
)
from app.services.container import Services, get_services

router = APIRouter(tags=["comptes"])

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")


def _email_valide(email: str) -> str:
    propre = email.strip().lower()
    if not EMAIL.match(propre):
        raise HTTPException(status_code=422, detail="Adresse e-mail invalide.")
    return propre


def _ouvrir_session(services: Services, request: Request, response: Response, user_id: str) -> None:
    jeton, empreinte = nouveau_jeton()
    services.journal.creer_session(empreinte, user_id, time.time() + DUREE_SESSION_S)
    poser_cookie(request, response, jeton)


@router.post("/auth/register", response_model=UserPublic, status_code=201)
async def inscription(
    demande: RegisterRequest,
    request: Request,
    response: Response,
    services: Services = Depends(get_services),
) -> UserPublic:
    email = _email_valide(demande.email)
    if services.journal.utilisateur_par_email(email):
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec cette adresse.")

    if len(demande.mot_de_passe) < LONGUEUR_MIN_MOT_DE_PASSE:
        raise HTTPException(
            status_code=422,
            detail=f"Le mot de passe doit contenir au moins {LONGUEUR_MIN_MOT_DE_PASSE} caractères.",
        )

    utilisateur = services.journal.ajouter_utilisateur(
        email, demande.name.strip(), hasher_mot_de_passe(demande.mot_de_passe)
    )
    _ouvrir_session(services, request, response, utilisateur["id"])
    return UserPublic(**utilisateur)


@router.post("/auth/login", response_model=UserPublic)
async def connexion(
    demande: LoginRequest,
    request: Request,
    response: Response,
    services: Services = Depends(get_services),
) -> UserPublic:
    email = _email_valide(demande.email)
    utilisateur = services.journal.utilisateur_par_email(email)

    # Même message dans les deux cas : ne pas révéler quelles adresses existent.
    if not utilisateur or not verifier_mot_de_passe(demande.mot_de_passe, utilisateur["password_hash"]):
        raise HTTPException(status_code=401, detail="Adresse ou mot de passe incorrect.")

    _ouvrir_session(services, request, response, utilisateur["id"])
    return UserPublic(id=utilisateur["id"], email=utilisateur["email"], name=utilisateur["name"])


@router.post("/auth/logout", status_code=204)
async def deconnexion(
    request: Request,
    response: Response,
    services: Services = Depends(get_services),
) -> Response:
    from app.services.auth import NOM_COOKIE, empreinte_jeton

    jeton = request.cookies.get(NOM_COOKIE)
    if jeton:
        services.journal.supprimer_session(empreinte_jeton(jeton))
    effacer_cookie(response)
    response.status_code = 204
    return response


@router.get("/auth/me", response_model=UserPublic)
async def profil(user: dict = Depends(utilisateur_requis)) -> UserPublic:
    return UserPublic(id=user["id"], email=user["email"], name=user["name"])
