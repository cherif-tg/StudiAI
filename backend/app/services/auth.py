"""Mots de passe et jetons de session, sans dépendance externe.

- Mots de passe : `scrypt` (bibliothèque standard), paramètres explicites, sel
  aléatoire par utilisateur. Le format stocké contient les paramètres, ce qui
  permettra de les durcir plus tard sans invalider les comptes existants.
- Sessions : jeton opaque aléatoire remis dans un cookie `httpOnly`. Seul le
  SHA-256 du jeton est stocké : une fuite de la base ne permet pas de rejouer
  une session.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

NOM_COOKIE = "nunya_session"
DUREE_SESSION_S = 30 * 24 * 3600  # 30 jours

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_LONGUEUR_CLE = 32
LONGUEUR_MIN_MOT_DE_PASSE = 8


def _b64(octets: bytes) -> str:
    return base64.b64encode(octets).decode("ascii")


def hasher_mot_de_passe(mot_de_passe: str) -> str:
    sel = secrets.token_bytes(16)
    derive = hashlib.scrypt(
        mot_de_passe.encode("utf-8"),
        salt=sel,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_LONGUEUR_CLE,
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64(sel)}${_b64(derive)}"


def verifier_mot_de_passe(mot_de_passe: str, stocke: str) -> bool:
    try:
        algorithme, n, r, p, sel_b64, hash_b64 = stocke.split("$")
        if algorithme != "scrypt":
            return False
        sel = base64.b64decode(sel_b64)
        attendu = base64.b64decode(hash_b64)
        derive = hashlib.scrypt(
            mot_de_passe.encode("utf-8"),
            salt=sel,
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(attendu),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(derive, attendu)


def nouveau_jeton() -> tuple[str, str]:
    """Renvoie (jeton clair à mettre dans le cookie, empreinte à stocker)."""
    jeton = secrets.token_urlsafe(32)
    return jeton, empreinte_jeton(jeton)


def empreinte_jeton(jeton: str) -> str:
    return hashlib.sha256(jeton.encode("utf-8")).hexdigest()
