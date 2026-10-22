"""Adaptateur entre les routes d'intégration et le backend réel.

Le paquet `app/integration/` (fourni par la refonte de l'interface) ne touche
jamais directement à la base : il passe par le protocole `DepotComptes`. Cette
classe l'implémente avec nos services — journal SQLite, index vectoriel, hachage
scrypt — sans dupliquer leur logique.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from app.integration.adaptateur import FichierArtefact, FichierSource, Utilisateur
from app.services.auth import empreinte_jeton, hasher_mot_de_passe, verifier_mot_de_passe
from app.services.container import Services

journal = logging.getLogger("nunya.integration")


class DepotNunya:
    """Implémentation du protocole attendu par `app/integration/`."""

    def __init__(self, services: Services) -> None:
        self.services = services

    # --- Session et identité ---------------------------------------------

    def utilisateur_depuis_jeton(self, jeton_session: Optional[str]) -> Optional[Utilisateur]:
        if not jeton_session:
            return None
        session = self.services.journal.session_valide(empreinte_jeton(jeton_session))
        if not session:
            return None
        profil = self.services.journal.utilisateur(session["user_id"])
        if not profil:
            return None
        return Utilisateur(profil["id"], profil["email"], profil["name"])

    def utilisateur_par_email(self, email: str) -> Optional[Utilisateur]:
        profil = self.services.journal.utilisateur_par_email(email.strip().lower())
        if not profil:
            return None
        return Utilisateur(profil["id"], profil["email"], profil["name"])

    def verifier_mot_de_passe(self, utilisateur_id: str, mot_de_passe: str) -> bool:
        profil = self.services.journal.utilisateur(utilisateur_id)
        if not profil:
            return False
        return verifier_mot_de_passe(mot_de_passe, profil["password_hash"])

    def changer_mot_de_passe(self, utilisateur_id: str, mot_de_passe: str) -> None:
        self.services.journal.definir_mot_de_passe(
            utilisateur_id, hasher_mot_de_passe(mot_de_passe)
        )

    def fermer_sessions(self, utilisateur_id: str) -> None:
        self.services.journal.supprimer_sessions_utilisateur(utilisateur_id)

    # --- Contenu du compte -----------------------------------------------

    def _fichier_depose(self, source_id: str) -> Optional[str]:
        """Le fichier d'origine n'est pas en base : on le retrouve par son id."""
        for candidat in self.services.settings.uploads_dir.glob(f"{source_id}.*"):
            if candidat.is_file():
                return str(candidat)
        return None

    def lister_sources(self, utilisateur_id: str) -> list[FichierSource]:
        return [
            FichierSource(
                id=ligne["id"],
                filename=ligne["filename"],
                chemin=self._fichier_depose(ligne["id"]),
                chunks=ligne["chunks"] or 0,
            )
            for ligne in self.services.journal.list_sources(utilisateur_id)
        ]

    def supprimer_source(self, utilisateur_id: str, source_id: str) -> None:
        try:
            self.services.rag.delete(source_id)
        except Exception as exc:  # noqa: BLE001 - l'index ne doit pas bloquer l'effacement
            journal.warning("Suppression dans l'index impossible pour %s : %s", source_id, exc)

        for fichier in self.services.settings.uploads_dir.glob(f"{source_id}.*"):
            fichier.unlink(missing_ok=True)
        self.services.journal.supprimer_source(utilisateur_id, source_id)

    def lister_artefacts(self, utilisateur_id: str) -> list[FichierArtefact]:
        return [
            FichierArtefact(
                id=ligne["id"],
                kind=ligne["kind"],
                title=ligne["title"],
                chemin=ligne["path"],
                created_at=ligne.get("created_at"),
            )
            for ligne in self.services.journal.list_artifacts(utilisateur_id)
        ]

    def supprimer_artefact(self, utilisateur_id: str, artefact_id: str) -> None:
        ligne = self.services.journal.supprimer_artefact(utilisateur_id, artefact_id)
        if ligne:
            Path(ligne["path"]).unlink(missing_ok=True)

    def supprimer_utilisateur(self, utilisateur_id: str) -> None:
        self.services.journal.supprimer_utilisateur(utilisateur_id)

    # --- Réinitialisation du mot de passe --------------------------------

    def enregistrer_jeton_reinitialisation(
        self, utilisateur_id: str, empreinte: str, expire_le: float
    ) -> None:
        self.services.journal.enregistrer_jeton_reinitialisation(
            utilisateur_id, empreinte, expire_le
        )

    def consommer_jeton_reinitialisation(self, empreinte: str, maintenant: float) -> Optional[str]:
        return self.services.journal.consommer_jeton_reinitialisation(empreinte, maintenant)
