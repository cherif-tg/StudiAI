"""Dépendances d'authentification et de propriété des données."""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, Response

from app.config import Settings
from app.services.auth import DUREE_SESSION_S, NOM_COOKIE, empreinte_jeton
from app.services.container import Services, get_services


def _connexion_https(request: Request) -> bool:
    if request.url.scheme == "https":
        return True
    transmis = request.headers.get("x-forwarded-proto", "")
    return transmis.split(",")[0].strip() == "https"


def poser_cookie(request: Request, response: Response, jeton: str, settings: Settings) -> None:
    """Pose le cookie de session, avec les bons attributs selon le déploiement.

    - interface et API sur le même domaine : `SameSite=Lax` suffit ;
    - domaines différents (Vercel + API ailleurs) : il faut `SameSite=None`,
      que les navigateurs n'acceptent qu'en HTTPS — d'où le `Secure` forcé.
    """
    samesite = (settings.cookie_samesite or "lax").strip().lower()
    if samesite not in {"lax", "strict", "none"}:
        samesite = "lax"
    secure = samesite == "none" or _connexion_https(request)

    response.set_cookie(
        key=NOM_COOKIE,
        value=jeton,
        max_age=DUREE_SESSION_S,
        httponly=True,
        samesite=samesite,
        secure=secure,
        path="/",
    )


def effacer_cookie(response: Response) -> None:
    response.delete_cookie(NOM_COOKIE, path="/")


def utilisateur_optionnel(
    request: Request, services: Services = Depends(get_services)
) -> dict | None:
    jeton = request.cookies.get(NOM_COOKIE)
    if not jeton:
        return None
    session = services.journal.session_valide(empreinte_jeton(jeton))
    if not session:
        return None
    return services.journal.utilisateur(session["user_id"])


def utilisateur_requis(user: dict | None = Depends(utilisateur_optionnel)) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Connecte-toi pour accéder à l'atelier.")
    return user


def proprietaire(user: dict = Depends(utilisateur_requis)) -> str:
    """Identifiant de propriété utilisé par le journal et la base vectorielle."""
    return user["id"]
