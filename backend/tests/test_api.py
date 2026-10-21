"""Tests d'API : contrats publics, comptes, isolation entre utilisateurs."""
import io
import time
import uuid

from docx import Document

MOT_DE_PASSE = "motdepasse-de-test"


def _compte(client, email: str | None = None) -> dict:
    adresse = email or f"test-{uuid.uuid4().hex[:10]}@nunya.test"
    r = client.post(
        "/auth/register",
        json={"name": "Compte de test", "email": adresse, "mot_de_passe": MOT_DE_PASSE},
    )
    assert r.status_code == 201, r.text
    return r.json()


def _docx_bytes() -> bytes:
    document = Document()
    document.add_paragraph("La photosynthèse convertit l'énergie lumineuse en énergie chimique.")
    tampon = io.BytesIO()
    document.save(tampon)
    return tampon.getvalue()


# --- Contrats publics ------------------------------------------------------


def test_health_est_public(client):
    r = client.get("/health")

    assert r.status_code == 200
    etat = r.json()
    assert etat["status"] == "ok"
    assert etat["rag"] is False
    assert etat["llm"] is False


def test_atelier_exige_un_compte(client):
    assert client.get("/sources").status_code == 401
    assert client.get("/artifacts").status_code == 401
    reponse = client.post("/chat", json={"session_id": "s", "message": "bonjour"})
    assert reponse.status_code == 401
    assert "Connecte-toi" in reponse.json()["detail"]


# --- Comptes ---------------------------------------------------------------


def test_inscription_ouvre_une_session(client):
    profil = _compte(client, "alice@nunya.test")

    assert profil["email"] == "alice@nunya.test"
    assert profil["name"] == "Compte de test"
    assert "mot_de_passe" not in profil
    assert "password_hash" not in profil

    moi = client.get("/auth/me")
    assert moi.status_code == 200
    assert moi.json()["id"] == profil["id"]


def test_inscription_refuse_un_email_deja_pris(client):
    _compte(client, "doublon@nunya.test")

    r = client.post(
        "/auth/register",
        json={"name": "Autre", "email": "DOUBLON@nunya.test", "mot_de_passe": MOT_DE_PASSE},
    )

    assert r.status_code == 409


def test_inscription_valide_l_email_et_le_mot_de_passe(client):
    mauvais_email = client.post(
        "/auth/register",
        json={"name": "Test", "email": "pas-un-email", "mot_de_passe": MOT_DE_PASSE},
    )
    court = client.post(
        "/auth/register",
        json={"name": "Test", "email": "court@nunya.test", "mot_de_passe": "court"},
    )

    assert mauvais_email.status_code == 422
    assert court.status_code == 422


def test_connexion_verifie_le_mot_de_passe(client):
    _compte(client, "bob@nunya.test")
    client.post("/auth/logout")

    faux = client.post(
        "/auth/login", json={"email": "bob@nunya.test", "mot_de_passe": "mauvais-mot-de-passe"}
    )
    juste = client.post("/auth/login", json={"email": "BOB@nunya.test", "mot_de_passe": MOT_DE_PASSE})

    assert faux.status_code == 401
    assert juste.status_code == 200
    assert juste.json()["email"] == "bob@nunya.test"


def test_deconnexion_ferme_la_session(client):
    _compte(client, "carol@nunya.test")
    assert client.get("/auth/me").status_code == 200

    client.post("/auth/logout")

    assert client.get("/auth/me").status_code == 401
    assert client.get("/sources").status_code == 401


# --- Artefacts -------------------------------------------------------------


def test_artefact_cree_liste_et_servi(connecte):
    body = {"kind": "summary", "title": "Résumé de test", "content": "# Titre\n\n- point clé"}
    created = connecte.post("/artifacts", json=body)

    assert created.status_code == 200
    ref = created.json()
    assert ref["url"].startswith("/artifacts/")

    servi = connecte.get(ref["url"])
    assert servi.status_code == 200
    assert "point clé" in servi.text

    liste = connecte.get("/artifacts").json()
    assert [a["id"] for a in liste] == [ref["id"]]


def test_artefacts_du_plus_recent_au_plus_ancien(connecte):
    for titre in ("Premier", "Second"):
        connecte.post("/artifacts", json={"kind": "summary", "title": titre, "content": "contenu"})
        time.sleep(0.01)

    titres = [a["title"] for a in connecte.get("/artifacts").json()]

    assert titres == ["Second", "Premier"]


def test_artefacts_isoles_par_compte(client):
    _compte(client, "proprietaire@nunya.test")
    cree = client.post(
        "/artifacts", json={"kind": "summary", "title": "Privé", "content": "secret"}
    ).json()

    _compte(client, "intrus@nunya.test")

    assert client.get("/artifacts").json() == []
    assert client.get(cree["url"]).status_code == 404


# --- Dégradations propres ---------------------------------------------------


def test_chat_authentifie_sans_cle_llm_renvoie_503(connecte):
    r = connecte.post("/chat", json={"session_id": "s-chat", "message": "bonjour"})

    assert r.status_code == 503
    assert "GROQ_API_KEY" in r.json()["detail"]


def test_chat_refuse_une_source_d_un_autre_compte(client, monkeypatch):
    from app.services.rag import RagService

    monkeypatch.setattr(RagService, "ingest", lambda self, source_id, path, filename: 3)

    _compte(client, "proprietaire2@nunya.test")
    depose = client.post(
        "/sources", files={"file": ("cours.docx", _docx_bytes(), "application/octet-stream")}
    )
    assert depose.status_code == 200

    _compte(client, "autre@nunya.test")
    r = client.post(
        "/chat",
        json={"session_id": "s", "message": "lis ça", "source_ids": [depose.json()["id"]]},
    )

    assert r.status_code == 403


def test_traduction_desactivee_renvoie_503(connecte):
    r = connecte.post("/translate", json={"text": "bonjour", "target": "ee"})

    assert r.status_code == 503


def test_source_format_non_supporte_est_rejete_sans_rien_laisser(connecte):
    r = connecte.post("/sources", files={"file": ("notes.odt", b"contenu", "application/octet-stream")})

    assert r.status_code == 400
    assert "Format non supporté" in r.json()["detail"]
    assert all(s["filename"] != "notes.odt" for s in connecte.get("/sources").json())


def test_source_docx_valide_est_indexe(connecte, monkeypatch):
    from app.services.rag import RagService

    monkeypatch.setattr(RagService, "ingest", lambda self, source_id, path, filename: 4)

    r = connecte.post(
        "/sources",
        files={"file": ("cours.docx", _docx_bytes(), "application/octet-stream")},
    )

    assert r.status_code == 200
    assert r.json()["chunks"] == 4
    assert any(s["filename"] == "cours.docx" for s in connecte.get("/sources").json())
