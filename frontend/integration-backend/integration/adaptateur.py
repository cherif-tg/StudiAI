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
