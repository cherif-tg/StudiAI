# Intégration backend : ce qu'il faut ajouter

> Ce document complète le [README](../README.md). Il décrit les routes à ajouter au
> backend FastAPI pour les fonctions récentes de l'interface, avec le code (dossier
> [`integration-backend/`](../integration-backend)) et ses tests.


Le dossier `integration-backend/` contient le code Python à intégrer, **testé**
(`10 passed`) avec FastAPI 0.115 :

```bash
cd frontend/integration-backend
pip install fastapi httpx pytest
python -m pytest -q
```

## 1. Vue d'ensemble

| Route | Rôle | Priorité | Interface prête |
|---|---|---|---|
| `DELETE /auth/me` | Supprimer son compte (mot de passe requis) | Haute (droit à l'effacement) | Oui |
| `GET /auth/me/export` | Archive ZIP : profil, fichiers d'origine, carnet | Haute (droit d'accès) | Oui |
| `POST /auth/password/forgot` | Envoyer un lien de réinitialisation | Haute | Oui |
| `POST /auth/password/reset` | Changer le mot de passe avec le jeton | Haute | Oui |
| Mémoire de l'agent en SQLite | L'agent se souvient après un redémarrage | Moyenne | Oui |
| `GET/DELETE /conversations…` | Historique partagé entre appareils | Basse (option) | Non : l'interface utilise l'historique local |
| `POST /contact` | Recevoir le formulaire du footer | Moyenne | Oui (`VITE_CONTACT_ENDPOINT=/contact`) |
| Passages dans `rag_search` | Afficher les extraits cités | Moyenne | Oui |
| `POST /chat/feedback` | Recevoir les avis (pouces) sous les réponses | Moyenne | Oui (avis gardés localement en attendant) |
| Étapes en continu (option) | Afficher les étapes réelles pendant la réponse | Basse | Prévu (`etapeReelle`) |
| Fichiers `/sw.js`, manifeste, icônes à la racine | Application installable, hors ligne | Moyenne | Oui |

**Comment brancher.** Les routes ne touchent jamais directement à ta base : elles
passent par un **adaptateur** (`integration/adaptateur.py`) dont chaque méthode
correspond à une fonction que le backend possède déjà (vérification scrypt de
`/auth/login`, suppression d'un document de `DELETE /sources/{id}`, etc.).

1. Copier `integration-backend/integration/` dans `backend/app/integration/`.
2. Ajouter les tables de `integration-backend/schema.sql` au journal SQLite.
3. Écrire une classe `DepotNunya` qui implémente l'adaptateur avec tes fonctions.
4. Inclure les routeurs dans `main.py` **avant** le montage des fichiers statiques
   (sinon le repli de l'application monopage intercepte `GET /auth/me/export`).

```python
# backend/app/main.py (extrait)
from app.integration.compte import creer_routeur_compte
from app.integration.avis import creer_routeur_avis
from app.integration.contact import creer_routeur_contact
from app.integration.historique import HistoriqueSQLite, creer_routeur_historique
from app.integration_depot import DepotNunya          # ton adaptateur

depot = DepotNunya()
historique = HistoriqueSQLite(DATA_DIR / "journal.db")

app.include_router(creer_routeur_compte(depot))
app.include_router(creer_routeur_contact(DATA_DIR / "journal.db"))
app.include_router(creer_routeur_avis(
    DATA_DIR / "journal.db", lambda requete: depot.utilisateur_depuis_jeton(requete.cookies.get("nunya_session", ""))
))
app.include_router(creer_routeur_historique(
    historique, lambda requete: depot.utilisateur_depuis_jeton(requete.cookies.get("nunya_session", ""))
))
# … puis seulement le montage de frontend/dist
```

Variables d'environnement côté serveur :

| Variable | Rôle |
|---|---|
| `APP_PUBLIC_URL` | Adresse publique, pour le lien de réinitialisation (ex. `https://nunya.exemple.tg`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS` | Envoi des e-mails. Sans `SMTP_HOST`, le lien est écrit dans le journal (développement uniquement) |
| `CONTACT_DESTINATAIRE` | Adresse qui reçoit les messages du formulaire de contact |

#### L'adaptateur

```python
"""Contrat entre les nouvelles routes et le code existant du backend Nunya.

Les routes de `compte.py`, `historique.py` et `contact.py` ne touchent jamais
directement à la base : elles passent par cet adaptateur. Pour les brancher,
écris une classe qui implémente `DepotComptes` en appelant tes fonctions
existantes (celles déjà utilisées par /auth/login, DELETE /sources/{id}, etc.),
puis passe-la aux fabriques de routeurs (voir README, « Intégration backend »).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass
class Utilisateur:
    id: str
    email: str
    name: Optional[str] = None


@dataclass
class FichierSource:
    id: str
    filename: str
    chemin: Optional[str]  # chemin du fichier déposé sur le disque, s'il existe encore
    chunks: int = 0


@dataclass
class FichierArtefact:
    id: str
    kind: str
    title: str
    chemin: str  # fichier de l'artefact (Markdown, JSON…)
    created_at: Optional[float] = None


class DepotComptes(Protocol):
    # --- Session et identité (déjà présents dans le backend) ---------------
    def utilisateur_depuis_jeton(self, jeton_session: str) -> Optional[Utilisateur]:
        """Utilisateur correspondant au cookie `nunya_session` (comme GET /auth/me)."""

    def utilisateur_par_email(self, email: str) -> Optional[Utilisateur]: ...

    def verifier_mot_de_passe(self, utilisateur_id: str, mot_de_passe: str) -> bool:
        """Réutilise la vérification scrypt existante de /auth/login."""

    def changer_mot_de_passe(self, utilisateur_id: str, mot_de_passe: str) -> None:
        """Hache (scrypt + sel) et enregistre, comme à l'inscription."""

    def fermer_sessions(self, utilisateur_id: str) -> None:
        """Supprime toutes les sessions (empreintes de jetons) de l'utilisateur."""

    # --- Contenu du compte -------------------------------------------------
    def lister_sources(self, utilisateur_id: str) -> list[FichierSource]: ...

    def supprimer_source(self, utilisateur_id: str, source_id: str) -> None:
        """Même logique que DELETE /sources/{id} : fichier + passages de l'index."""

    def lister_artefacts(self, utilisateur_id: str) -> list[FichierArtefact]: ...

    def supprimer_artefact(self, utilisateur_id: str, artefact_id: str) -> None: ...

    def supprimer_utilisateur(self, utilisateur_id: str) -> None:
        """Ligne du compte (et tout ce qui y est rattaché par clé étrangère)."""

    # --- Jetons de réinitialisation (table `password_resets`, voir schema.sql)
    def enregistrer_jeton_reinitialisation(self, utilisateur_id: str, empreinte: str, expire_le: float) -> None: ...

    def consommer_jeton_reinitialisation(self, empreinte: str, maintenant: float) -> Optional[str]:
        """Renvoie l'id utilisateur si le jeton existe, n'a pas expiré et n'a pas servi ;
        le marque alors comme utilisé (usage unique)."""
```

Exemple de correspondance avec un backend SQLite (à adapter aux noms réels) :

```python
# backend/app/integration_depot.py
import hashlib
import sqlite3
from app import auth, sources, artifacts           # modules existants (noms indicatifs)
from app.integration.adaptateur import FichierArtefact, FichierSource, Utilisateur


class DepotNunya:
    def __init__(self, chemin_db="data/journal.db"):
        self.chemin_db = chemin_db

    def _db(self):
        db = sqlite3.connect(self.chemin_db)
        db.row_factory = sqlite3.Row
        return db

    def utilisateur_depuis_jeton(self, jeton):
        profil = auth.utilisateur_depuis_cookie(jeton)    # même code que GET /auth/me
        return Utilisateur(profil.id, profil.email, profil.name) if profil else None

    def utilisateur_par_email(self, email):
        with self._db() as db:
            ligne = db.execute("SELECT id, email, name FROM users WHERE lower(email)=?", (email,)).fetchone()
        return Utilisateur(ligne["id"], ligne["email"], ligne["name"]) if ligne else None

    def verifier_mot_de_passe(self, utilisateur_id, mot_de_passe):
        return auth.verifier_mot_de_passe(utilisateur_id, mot_de_passe)   # scrypt existant

    def changer_mot_de_passe(self, utilisateur_id, mot_de_passe):
        auth.definir_mot_de_passe(utilisateur_id, mot_de_passe)           # scrypt + sel existant

    def fermer_sessions(self, utilisateur_id):
        with self._db() as db:
            db.execute("DELETE FROM sessions WHERE user_id=?", (utilisateur_id,))

    def lister_sources(self, utilisateur_id):
        return [FichierSource(s.id, s.filename, s.path, s.chunks) for s in sources.lister(utilisateur_id)]

    def supprimer_source(self, utilisateur_id, source_id):
        sources.supprimer(utilisateur_id, source_id)       # fichier + passages de l'index

    def lister_artefacts(self, utilisateur_id):
        return [FichierArtefact(a.id, a.kind, a.title, a.path, a.created_at)
                for a in artifacts.lister(utilisateur_id)]

    def supprimer_artefact(self, utilisateur_id, artefact_id):
        artifacts.supprimer(utilisateur_id, artefact_id)

    def supprimer_utilisateur(self, utilisateur_id):
        with self._db() as db:
            db.execute("DELETE FROM password_resets WHERE user_id=?", (utilisateur_id,))
            db.execute("DELETE FROM conversation_messages WHERE user_id=?", (utilisateur_id,))
            db.execute("DELETE FROM message_feedback WHERE user_id=?", (utilisateur_id,))
            db.execute("DELETE FROM users WHERE id=?", (utilisateur_id,))

    def enregistrer_jeton_reinitialisation(self, utilisateur_id, empreinte, expire_le):
        with self._db() as db:
            db.execute("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)",
                       (empreinte, utilisateur_id, expire_le))

    def consommer_jeton_reinitialisation(self, empreinte, maintenant):
        with self._db() as db:
            ligne = db.execute(
                "SELECT user_id FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?",
                (empreinte, maintenant)).fetchone()
            if not ligne:
                return None
            db.execute("UPDATE password_resets SET used_at=? WHERE token_hash=?", (maintenant, empreinte))
            return ligne["user_id"]
```

## 2. Suppression du compte et export des données

Contrat attendu par l'interface :

- `DELETE /auth/me` avec le corps JSON `{"mot_de_passe": "…"}` : `204` en cas de
  succès (cookie effacé), `403` si le mot de passe est faux, `401` sans session.
- `GET /auth/me/export` : fichier téléchargeable avec un en-tête
  `Content-Disposition: attachment; filename="…"`. Si la route n'existe pas
  (`404`/`405`, ou page HTML renvoyée), l'interface assemble elle-même un export JSON.

## 3. Mot de passe oublié

- `POST /auth/password/forgot` `{"email"}` → toujours `{"ok": true}`, qu'un compte
  existe ou non (on ne révèle pas les adresses inscrites) ; une demande par minute.
- Le lien envoyé pointe vers `APP_PUBLIC_URL/reinitialiser?jeton=…`, valable
  30 minutes, à usage unique ; seule l'empreinte SHA-256 du jeton est stockée.
- `POST /auth/password/reset` `{"jeton", "mot_de_passe"}` → `200`, ou `410` si le
  lien a expiré ou a déjà servi. Toutes les sessions sont fermées par sécurité.

```python
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
```

```python
"""Envoi d'e-mails transactionnels (lien de réinitialisation, contact).

Configuration par variables d'environnement :
    SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_STARTTLS (true)
Sans SMTP_HOST, le message est écrit dans le journal : pratique en développement,
jamais en production (le lien de réinitialisation y serait lisible).
"""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

journal = logging.getLogger("nunya.email")


def email_configure() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def envoyer_email(destinataire: str, sujet: str, texte: str) -> None:
    hote = os.getenv("SMTP_HOST")
    if not hote:
        journal.warning("SMTP non configuré : e-mail non envoyé à %s\n%s\n%s", destinataire, sujet, texte)
        return

    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "nunya@localhost"))
    message["To"] = destinataire
    message["Subject"] = sujet
    message.set_content(texte)

    port = int(os.getenv("SMTP_PORT", "587"))
    with smtplib.SMTP(hote, port, timeout=15) as serveur:
        if os.getenv("SMTP_STARTTLS", "true").lower() == "true":
            serveur.starttls()
        utilisateur = os.getenv("SMTP_USER")
        if utilisateur:
            serveur.login(utilisateur, os.getenv("SMTP_PASSWORD", ""))
        serveur.send_message(message)
```

## 4. Mémoire de l'agent après un redémarrage

Aujourd'hui l'historique côté serveur vit en mémoire et se perd au redémarrage.
L'interface garde déjà les conversations localement et permet de les reprendre, mais
l'agent repart alors sans contexte. Pour corriger cela dans le gestionnaire de
`POST /chat` existant :

```python
# Dans le gestionnaire existant de POST /chat (noms indicatifs)
historique = HistoriqueSQLite(DATA_DIR / "journal.db")

def chat(corps, utilisateur):
    memoire = MEMOIRES.get(corps.session_id)
    if memoire is None:                                   # serveur redémarré ou conversation reprise
        memoire = historique.charger(corps.session_id, utilisateur.id)
        MEMOIRES[corps.session_id] = memoire

    reponse = agent.repondre(corps.message, memoire, corps.source_ids, corps.mode)   # inchangé

    historique.ajouter(corps.session_id, utilisateur.id, "user", corps.message)
    historique.ajouter(corps.session_id, utilisateur.id, "assistant", reponse.answer)
    return reponse
```

```python
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
```

## 5. Formulaire de contact

Une fois la route branchée, mettre `VITE_CONTACT_ENDPOINT=/contact` dans le `.env`
de l'interface (ou l'URL complète si l'API est sur un autre domaine).

```python
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
```

## 6. Passages cités dans la réponse

L'interface lit l'étape `rag_search` renvoyée par `/chat`. Elle reconnaît plusieurs
formats (`passages`, `results`, `chunks`, `hits`… avec `text`/`page_content`,
`filename`/`source`, `page`, `score`), mais le format recommandé est :

```json
{
  "tool": "rag_search",
  "result_preview": "3 passages",
  "data": {
    "passages": [
      { "source_id": "s1", "filename": "SVT chapitre 3.pdf", "page": 13, "score": 0.86,
        "text": "La phase claire se déroule dans la membrane des thylakoïdes…" }
    ]
  }
}
```

```python
"""Format recommandé pour l'étape `rag_search` renvoyée par POST /chat.

L'interface affiche sous chaque réponse les documents cités ; un clic montre les
extraits exacts. Elle reconnaît plusieurs formats, mais celui-ci est le plus
simple et le plus complet :

    step = {
        "tool": "rag_search",
        "args": {"query": "..."},
        "result_preview": "3 passages",
        "data": {"passages": passages_pour_interface(resultats)},
    }
"""
from __future__ import annotations

from typing import Any, Iterable


def passages_pour_interface(resultats: Iterable[Any], longueur_max: int = 1200) -> list[dict]:
    """Convertit les résultats de la base vectorielle en passages pour l'interface.

    Accepte des objets ou des dictionnaires exposant `text`/`page_content`,
    `metadata` (filename, source_id, page) et un score de similarité.
    """
    passages = []
    for r in resultats:
        get = (lambda k, d=None: r.get(k, d)) if isinstance(r, dict) else (lambda k, d=None: getattr(r, k, d))
        meta = get("metadata", {}) or {}
        texte = get("text") or get("page_content") or get("document") or ""
        passages.append(
            {
                "source_id": meta.get("source_id") or get("source_id"),
                "filename": meta.get("filename") or meta.get("source") or get("filename") or "Document",
                "page": meta.get("page") if meta.get("page") is not None else get("page"),
                "score": round(float(get("score") or 0), 3) if get("score") is not None else None,
                "text": str(texte)[:longueur_max],
            }
        )
    return passages
```

## 7. Avis sur les réponses et régénération

Sous chaque réponse, l'interface propose **Copier**, **utile / inutile** (avec un motif
facultatif : Inexact, Hors sujet, Incomplet, Peu clair) et **Régénérer**.

- **Copier** et **Régénérer** n'ont besoin d'aucune route nouvelle : la régénération
  repose la même question sur `POST /chat` (même `session_id`, mêmes sources, mode
  courant). Chaque réponse obtenue est gardée comme une version (flèches « 1/2 »).
- **Les avis** sont envoyés sur `POST /chat/feedback`. Tant que la route n'existe pas,
  l'interface les garde dans le navigateur et n'insiste pas après un premier `404`.

Corps envoyé par l'interface :

```json
{ "session_id": "…", "message_id": "…", "avis": "inutile", "motif": "Incomplet",
  "question": "…", "reponse": "…" }
```

```python
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
```

### Modifier une question déjà envoyée

Le crayon sous une question permet de la réécrire et de la relancer. Aucune route
nouvelle n'est nécessaire : l'interface coupe la discussion affichée juste avant
l'ancienne question, puis envoie la nouvelle sur `POST /chat`, exactement comme une
question normale (même `session_id`).

À savoir : la **mémoire de l'agent côté serveur** contient encore l'échange
remplacé. C'est sans conséquence sur l'exactitude (la réponse s'appuie toujours sur
les passages des documents), mais l'agent peut y faire allusion. Pour l'éviter, on
peut accepter un champ facultatif dans le corps de `POST /chat`, ignoré par les
anciennes versions :

```python
class CorpsChat(BaseModel):          # modèle existant, un champ ajouté
    ...
    garder_echanges: Optional[int] = None   # nombre d'échanges à conserver avant cette question

# dans le gestionnaire, avant d'appeler l'agent :
if corps.garder_echanges is not None:
    memoire.tronquer(corps.garder_echanges)  # ne garder que les N premiers échanges
```

Côté interface, il suffira alors de transmettre ce nombre (les questions qui
précèdent celle qu'on modifie) de `modifierQuestion` jusqu'à l'appel `api.chat`,
dans `src/pages/Workspace.tsx`.

### Option : étapes réelles pendant la réponse

Pendant l'attente, l'interface affiche des étapes (réflexion, recherche, exécution des
outils, génération). Comme `POST /chat` répond en une seule fois, ces étapes sont
**estimées** d'après la durée écoulée et la nature de la demande. Pour afficher les
étapes réelles, le backend peut diffuser des événements (Server-Sent Events) sur une
route `POST /chat/stream`, par exemple :

```
event: etape    data: {"cle": "recherche"}
event: etape    data: {"cle": "outils", "outil": "summarize"}
event: etape    data: {"cle": "generation"}
event: reponse  data: { …même objet que la réponse de POST /chat… }
```

Côté interface, le composant `IndicateurReflexion` accepte déjà une prop
`etapeReelle` (`reflexion`, `recherche`, `outils`, `generation`) : il suffira de lire
ce flux dans `Workspace.tsx` et de la lui transmettre.

## 8. Application installable : fichiers à servir

Si FastAPI sert `frontend/dist`, ces fichiers doivent être accessibles **à la racine** :
`/sw.js`, `/manifest.json`, `/icons/*`, `/favicon.svg`. `sw.js` ne doit pas
être mis en cache par le navigateur, sinon les mises à jour tardent :

```python
from fastapi.responses import FileResponse

@app.get("/sw.js", include_in_schema=False)
def service_worker():
    return FileResponse(DIST / "sw.js", media_type="text/javascript",
                        headers={"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"})

@app.get("/manifest.json", include_in_schema=False)
def manifeste():
    return FileResponse(DIST / "manifest.json", media_type="application/manifest+json")
```

Sur Vercel, ces en-têtes sont déjà déclarés dans `vercel.json`. L'installation
exige HTTPS (sauf sur `localhost`).

## 9. Option : révisions synchronisées entre appareils

Les révisions sont aujourd'hui gardées dans le navigateur. Pour les retrouver sur
tous les appareils, deux routes suffisent ; l'état a déjà la forme JSON suivante
(voir `src/lib/revision.ts`) :

```
GET /revisions   → {"cartes": {...}, "notions": {...}}        (vide si rien)
PUT /revisions   ← même objet, stocké tel quel par compte (une ligne JSON par utilisateur)
```

Côté interface, il suffira de lire au chargement et d'écrire après chaque réponse.

## 10. Tables SQL

```sql
-- Tables à ajouter au journal SQLite de Nunya (idempotent).

-- Jetons de réinitialisation du mot de passe : seule l'empreinte SHA-256 est gardée.
CREATE TABLE IF NOT EXISTS password_resets (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    expires_at  REAL NOT NULL,
    used_at     REAL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);

-- Historique des conversations (voir historique.py).
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

-- Messages du formulaire de contact (voir contact.py).
CREATE TABLE IF NOT EXISTS contact_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL,
    page        TEXT,
    created_at  REAL NOT NULL
);

-- Avis sur les réponses de l'agent (voir avis.py).
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
```

## 11. Tests

```python
"""Tests des routes d'intégration avec un dépôt en mémoire.

    cd frontend/integration-backend && python -m pytest -q
Dans le backend, remplace `DepotMemoire` par ton adaptateur réel.
"""
from __future__ import annotations

import io
import time
import zipfile
from pathlib import Path
from typing import Optional

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from integration import compte
from integration.adaptateur import FichierArtefact, FichierSource, Utilisateur
from integration.avis import creer_routeur_avis
from integration.contact import creer_routeur_contact
from integration.historique import HistoriqueSQLite, creer_routeur_historique
from integration.passages import passages_pour_interface


class DepotMemoire:
    def __init__(self, dossier: Path) -> None:
        self.utilisateurs = {"u1": {"email": "awa@ecole.tg", "name": "Awa", "mdp": "motdepasse"}}
        self.sessions = {"jeton-awa": "u1"}
        fichier = dossier / "cours.pdf"
        fichier.write_bytes(b"%PDF-1.4 exemple")
        resume = dossier / "a1.md"
        resume.write_text("# Résumé\n- point", encoding="utf-8")
        self.sources = {"u1": [FichierSource("s1", "cours.pdf", str(fichier), 12)]}
        self.artefacts = {"u1": [FichierArtefact("a1", "summary", "Résumé", str(resume), 1.0)]}
        self.jetons: dict[str, dict] = {}
        self.index_supprime: list[str] = []

    def utilisateur_depuis_jeton(self, jeton: str) -> Optional[Utilisateur]:
        uid = self.sessions.get(jeton)
        return self._u(uid) if uid else None

    def _u(self, uid: str) -> Optional[Utilisateur]:
        d = self.utilisateurs.get(uid)
        return Utilisateur(uid, d["email"], d["name"]) if d else None

    def utilisateur_par_email(self, email: str) -> Optional[Utilisateur]:
        for uid, d in self.utilisateurs.items():
            if d["email"] == email:
                return self._u(uid)
        return None

    def verifier_mot_de_passe(self, uid: str, mdp: str) -> bool:
        return self.utilisateurs.get(uid, {}).get("mdp") == mdp

    def changer_mot_de_passe(self, uid: str, mdp: str) -> None:
        self.utilisateurs[uid]["mdp"] = mdp

    def fermer_sessions(self, uid: str) -> None:
        self.sessions = {j: u for j, u in self.sessions.items() if u != uid}

    def lister_sources(self, uid):
        return list(self.sources.get(uid, []))

    def supprimer_source(self, uid, sid):
        self.index_supprime.append(sid)
        self.sources[uid] = [s for s in self.sources.get(uid, []) if s.id != sid]

    def lister_artefacts(self, uid):
        return list(self.artefacts.get(uid, []))

    def supprimer_artefact(self, uid, aid):
        self.artefacts[uid] = [a for a in self.artefacts.get(uid, []) if a.id != aid]

    def supprimer_utilisateur(self, uid):
        self.utilisateurs.pop(uid, None)

    def enregistrer_jeton_reinitialisation(self, uid, empreinte, expire_le):
        self.jetons[empreinte] = {"uid": uid, "expire": expire_le, "utilise": False}

    def consommer_jeton_reinitialisation(self, empreinte, maintenant):
        j = self.jetons.get(empreinte)
        if not j or j["utilise"] or j["expire"] < maintenant:
            return None
        j["utilise"] = True
        return j["uid"]


@pytest.fixture
def env(tmp_path, monkeypatch):
    envoyes = []
    monkeypatch.setattr(compte, "envoyer_email", lambda dest, sujet, texte: envoyes.append((dest, texte)))
    depot = DepotMemoire(tmp_path)
    historique = HistoriqueSQLite(tmp_path / "journal.db")
    app = FastAPI()
    app.include_router(compte.creer_routeur_compte(depot, url_publique="https://nunya.exemple"))
    app.include_router(creer_routeur_historique(
        historique, lambda r: depot.utilisateur_depuis_jeton(r.cookies.get("nunya_session", ""))))
    app.include_router(creer_routeur_contact(tmp_path / "journal.db"))
    app.include_router(creer_routeur_avis(
        tmp_path / "journal.db", lambda r: depot.utilisateur_depuis_jeton(r.cookies.get("nunya_session", ""))))
    client = TestClient(app)
    return client, depot, historique, envoyes


def connecte(client):
    client.cookies.set("nunya_session", "jeton-awa")
    return client


def test_export_contient_documents_et_carnet(env):
    client, *_ = env
    r = connecte(client).get("/auth/me/export")
    assert r.status_code == 200 and r.headers["content-type"] == "application/zip"
    noms = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert {"profil.json", "documents.json", "carnet.json", "documents/s1-cours.pdf", "carnet/a1.md"} <= set(noms)


def test_export_exige_une_session(env):
    client, *_ = env
    assert client.get("/auth/me/export").status_code == 401


def test_suppression_refuse_mauvais_mot_de_passe(env):
    client, depot, *_ = env
    r = connecte(client).request("DELETE", "/auth/me", json={"mot_de_passe": "faux-mot"})
    assert r.status_code == 403 and "u1" in depot.utilisateurs


def test_suppression_efface_tout(env):
    client, depot, *_ = env
    r = connecte(client).request("DELETE", "/auth/me", json={"mot_de_passe": "motdepasse"})
    assert r.status_code == 204
    assert "u1" not in depot.utilisateurs and depot.sessions == {}
    assert depot.index_supprime == ["s1"] and depot.artefacts["u1"] == []


def test_mot_de_passe_oublie_puis_reinitialisation(env):
    client, depot, _, envoyes = env
    r = client.post("/auth/password/forgot", json={"email": "awa@ecole.tg"})
    assert r.json() == {"ok": True} and len(envoyes) == 1
    jeton = envoyes[0][1].split("jeton=")[1].split()[0]
    assert client.post("/auth/password/reset", json={"jeton": jeton, "mot_de_passe": "nouveau-mdp"}).status_code == 200
    assert depot.utilisateurs["u1"]["mdp"] == "nouveau-mdp" and depot.sessions == {}
    # Usage unique
    assert client.post("/auth/password/reset", json={"jeton": jeton, "mot_de_passe": "encore-un"}).status_code == 410


def test_oubli_ne_revele_pas_les_comptes(env):
    client, _, _, envoyes = env
    r = client.post("/auth/password/forgot", json={"email": "inconnu@exemple.tg"})
    assert r.json() == {"ok": True} and envoyes == []


def test_historique_persiste_et_se_liste(env):
    client, _, historique, _ = env
    historique.ajouter("sess1", "u1", "user", "Explique la photosynthèse")
    historique.ajouter("sess1", "u1", "assistant", "Deux phases…")
    assert historique.charger("sess1", "u1") == [
        {"role": "user", "content": "Explique la photosynthèse"},
        {"role": "assistant", "content": "Deux phases…"},
    ]
    liste = connecte(client).get("/conversations").json()
    assert liste[0]["id"] == "sess1" and liste[0]["nb"] == 2 and liste[0]["titre"].startswith("Explique")
    assert client.delete("/conversations/sess1").status_code == 204
    assert historique.charger("sess1", "u1") == []


def test_contact_enregistre_et_limite(env):
    client, *_ = env
    corps = {"email": "awa@ecole.tg", "message": "Bonjour, une question sur l'éwé.", "page": "/"}
    assert client.post("/contact", json=corps).status_code == 200
    assert client.post("/contact", json=corps).status_code == 429
    assert client.post("/contact", json={**corps, "email": "pas-un-email"}).status_code in (422, 429)


def test_format_des_passages():
    passages = passages_pour_interface([
        {"text": "La phase claire…", "metadata": {"filename": "cours.pdf", "page": 13}, "score": 0.861},
    ])
    assert passages == [{"source_id": None, "filename": "cours.pdf", "page": 13, "score": 0.861,
                         "text": "La phase claire…"}]


def test_avis_enregistre_et_remplace(env, tmp_path):
    import sqlite3
    client, *_ = env
    corps = {"session_id": "sess1", "message_id": "m1", "avis": "inutile", "motif": "Incomplet",
             "question": "Explique", "reponse": "Deux phases"}
    assert client.post("/chat/feedback", json=corps).status_code == 401
    connecte(client)
    assert client.post("/chat/feedback", json=corps).json() == {"ok": True}
    assert client.post("/chat/feedback", json={**corps, "avis": "utile", "motif": None}).status_code == 200
    with sqlite3.connect(tmp_path / "journal.db") as db:
        lignes = db.execute("SELECT avis, motif FROM message_feedback").fetchall()
    assert lignes == [("utile", None)]
    assert client.post("/chat/feedback", json={**corps, "avis": "bof"}).status_code == 422
```

## 12. Avant la mise en production

- [ ] Brancher l'adaptateur et lancer `pytest` sur le backend réel.
- [ ] Configurer SMTP et `APP_PUBLIC_URL`, tester un vrai lien de réinitialisation.
- [ ] Vérifier que `/sw.js` et `/manifest.json` sont servis à la racine.
- [ ] Renseigner `VITE_CONTACT_ENDPOINT` (ou `VITE_CONTACT_EMAIL`), `VITE_EDITEUR_NOM`
      et `VITE_HEBERGEUR_NOM`, puis reconstruire l'interface.
- [ ] Brancher `POST /chat/feedback` (avis sous les réponses).
- [ ] Faire relire la politique de confidentialité et les conditions d'utilisation.
- [ ] Servir l'instance en HTTPS.
