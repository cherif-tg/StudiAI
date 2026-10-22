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
