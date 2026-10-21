"""Garde-fous d'exposition publique.

Trois protections, volontairement simples et sans dépendance :

- **taille** : refus d'un dépôt dépassant `max_upload_mb`, avant même de lire le
  corps de la requête quand le navigateur annonce sa taille ;
- **stockage** : refus des dépôts quand `data/uploads` dépasse `max_storage_mb`,
  pour qu'un disque de VPS ne se remplisse pas en quelques requêtes ;
- **débit** : fenêtre glissante en mémoire sur `/chat`, par client, pour protéger
  le quota du fournisseur de modèle.

La fenêtre est locale au processus : suffisante pour un déploiement mono-instance
(celui du MVP). Derrière un répartiteur, il faudrait un stockage partagé.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.config import Settings


def _adresse_client(request: Request, settings: Settings) -> str:
    """Adresse réelle du client, y compris derrière un tunnel ou un proxy.

    `cloudflared` et Caddy transmettent tous deux l'adresse d'origine. On ne fait
    confiance à ces en-têtes que si le déploiement est explicitement derrière un
    proxy (`trust_proxy_headers`), sinon n'importe qui pourrait les falsifier.
    """
    if settings.trust_proxy_headers:
        for entete in ("cf-connecting-ip", "x-real-ip", "x-forwarded-for"):
            valeur = request.headers.get(entete)
            if valeur:
                return valeur.split(",")[0].strip()
    return request.client.host if request.client else "inconnu"


class LimiteurDebit:
    """Fenêtre glissante en mémoire, une file d'horodatages par client.

    Les limites sont lues à chaque appel dans les réglages du service : les
    tests peuvent donc les réduire sans toucher à un état global.
    """

    def __init__(self) -> None:
        self._evenements: dict[str, deque[float]] = defaultdict(deque)
        self._verrou = threading.Lock()

    def verifier(self, request: Request, settings: Settings) -> None:
        limite = settings.chat_rate_limit
        fenetre = settings.chat_rate_window_s
        if limite <= 0 or fenetre <= 0:
            return

        client = _adresse_client(request, settings)
        maintenant = time.monotonic()
        with self._verrou:
            file = self._evenements[client]
            while file and maintenant - file[0] > fenetre:
                file.popleft()
            if len(file) >= limite:
                reste = max(1, int(fenetre - (maintenant - file[0])))
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Trop de questions en peu de temps. "
                        f"Réessaie dans {reste} secondes."
                    ),
                    headers={"Retry-After": str(reste)},
                )
            file.append(maintenant)


def verifier_taille_annoncee(request: Request, settings: Settings) -> None:
    """Refuse tôt un dépôt trop volumineux, sans lire le corps."""
    longueur = request.headers.get("content-length")
    if not longueur:
        return
    try:
        taille = int(longueur)
    except ValueError:
        return
    plafond = settings.max_upload_mb * 1024 * 1024
    if taille > plafond:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Fichier trop volumineux : {taille / 1024 / 1024:.1f} Mo, "
                f"maximum {settings.max_upload_mb} Mo."
            ),
        )
