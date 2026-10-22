"""Routes d'intégration : droits sur les données, mot de passe, contact, avis."""
import io
import re
import time
import uuid
import zipfile

from app.integration import compte as integration_compte

MOT_DE_PASSE = "motdepasse-de-test"
NOUVEAU = "nouveau-mot-de-passe-solide"


def _compte(client, email: str | None = None) -> dict:
    adresse = email or f"test-{uuid.uuid4().hex[:10]}@nunya.test"
    r = client.post(
        "/auth/register",
        json={"name": "Compte de test", "email": adresse, "mot_de_passe": MOT_DE_PASSE},
    )
    assert r.status_code == 201, r.text
    return r.json()


# --- Export des données -----------------------------------------------------


def test_export_exige_un_compte(client):
    assert client.get("/auth/me/export").status_code == 401


def test_export_contient_profil_documents_et_carnet(connecte, monkeypatch):
    from app.services.rag import RagService

    monkeypatch.setattr(RagService, "ingest", lambda self, source_id, path, filename: 3)
    depose = connecte.post(
        "/sources",
        files={"file": ("cours.docx", b"contenu quelconque", "application/octet-stream")},
    )
    assert depose.status_code == 200
    connecte.post("/artifacts", json={"kind": "summary", "title": "Mon résumé", "content": "# test"})

    r = connecte.get("/auth/me/export")

    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(r.content)) as archive:
        noms = archive.namelist()
        assert "profil.json" in noms
        assert "documents.json" in noms
        assert "carnet.json" in noms
        assert any(nom.startswith("carnet/") for nom in noms)


# --- Suppression du compte ---------------------------------------------------


def test_suppression_refuse_un_mauvais_mot_de_passe(connecte):
    r = connecte.request("DELETE", "/auth/me", json={"mot_de_passe": "faux"})

    assert r.status_code == 403
    assert connecte.get("/auth/me").status_code == 200


def test_suppression_efface_le_compte_et_son_contenu(client):
    profil = _compte(client, "asupprimer@nunya.test")
    client.post("/artifacts", json={"kind": "summary", "title": "À jeter", "content": "x"})

    r = client.request("DELETE", "/auth/me", json={"mot_de_passe": MOT_DE_PASSE})

    assert r.status_code == 204
    assert client.get("/auth/me").status_code == 401
    # Le compte ne peut plus se reconnecter.
    assert client.post(
        "/auth/login", json={"email": profil["email"], "mot_de_passe": MOT_DE_PASSE}
    ).status_code == 401


# --- Mot de passe oublié -----------------------------------------------------


def test_oubli_repond_toujours_pareil(client):
    inconnu = client.post("/auth/password/forgot", json={"email": "personne@nunya.test"})
    _compte(client, "connu@nunya.test")
    connu = client.post("/auth/password/forgot", json={"email": "connu@nunya.test"})

    assert inconnu.status_code == 200
    assert connu.status_code == 200
    assert inconnu.json() == connu.json() == {"ok": True}


def test_reinitialisation_change_le_mot_de_passe(client, monkeypatch):
    profil = _compte(client, "oubli@nunya.test")
    envoyes: list[tuple[str, str, str]] = []
    monkeypatch.setattr(
        integration_compte, "envoyer_email", lambda dest, sujet, texte: envoyes.append((dest, sujet, texte))
    )

    client.post("/auth/password/forgot", json={"email": profil["email"]})

    assert len(envoyes) == 1
    jeton = re.search(r"jeton=([A-Za-z0-9_\-]+)", envoyes[0][2]).group(1)

    reset = client.post("/auth/password/reset", json={"jeton": jeton, "mot_de_passe": NOUVEAU})
    assert reset.status_code == 200

    client.post("/auth/logout")
    assert client.post(
        "/auth/login", json={"email": profil["email"], "mot_de_passe": MOT_DE_PASSE}
    ).status_code == 401
    assert client.post(
        "/auth/login", json={"email": profil["email"], "mot_de_passe": NOUVEAU}
    ).status_code == 200


def test_jeton_de_reinitialisation_a_usage_unique(client, monkeypatch):
    profil = _compte(client, "unique@nunya.test")
    envoyes: list[str] = []
    monkeypatch.setattr(
        integration_compte, "envoyer_email", lambda dest, sujet, texte: envoyes.append(texte)
    )
    client.post("/auth/password/forgot", json={"email": profil["email"]})
    jeton = re.search(r"jeton=([A-Za-z0-9_\-]+)", envoyes[0]).group(1)

    premier = client.post("/auth/password/reset", json={"jeton": jeton, "mot_de_passe": NOUVEAU})
    second = client.post("/auth/password/reset", json={"jeton": jeton, "mot_de_passe": NOUVEAU})

    assert premier.status_code == 200
    assert second.status_code == 410


def test_reinitialisation_refuse_un_jeton_invente(client):
    r = client.post(
        "/auth/password/reset", json={"jeton": "x" * 40, "mot_de_passe": NOUVEAU}
    )

    assert r.status_code == 410


# --- Contact et avis ----------------------------------------------------------


def test_contact_valide_puis_limite_le_debit(client):
    invalide = client.post("/contact", json={"email": "pas-un-email", "message": "Bonjour à tous"})
    premier = client.post(
        "/contact", json={"email": "awa@ecole.tg", "message": "Bonjour, une question.", "page": "/"}
    )
    second = client.post(
        "/contact", json={"email": "awa@ecole.tg", "message": "Encore une question.", "page": "/"}
    )

    assert invalide.status_code == 422
    assert premier.status_code == 200
    assert second.status_code == 429


def test_avis_exige_un_compte(client):
    r = client.post(
        "/chat/feedback",
        json={"session_id": "s", "message_id": "m1", "avis": "utile"},
    )

    assert r.status_code == 401


def test_avis_est_enregistre_et_remplacable(connecte):
    corps = {"session_id": "s", "message_id": f"m-{uuid.uuid4().hex[:6]}", "avis": "utile"}

    premier = connecte.post("/chat/feedback", json=corps)
    second = connecte.post("/chat/feedback", json={**corps, "avis": "inutile", "motif": "hors sujet"})

    assert premier.status_code == 200
    assert second.status_code == 200


# --- Passages cités -----------------------------------------------------------


def test_rag_search_expose_les_passages(monkeypatch):
    import asyncio

    from app.services.rag import Hit
    from app.tools.rag_search import RagSearchTool

    class _Rag:
        def search(self, query, k=5, source_ids=None):
            return [Hit("s1", "cours.pdf", "Un passage important.", 0.87)]

    class _Services:
        rag = _Rag()

    class _Ctx:
        services = _Services()
        session_id = "s"
        source_ids = None

    resultat = asyncio.run(RagSearchTool().run(_Ctx(), query="photosynthèse"))

    passages = resultat.data["passages"]
    assert len(passages) == 1
    assert passages[0]["filename"] == "cours.pdf"
    assert passages[0]["text"] == "Un passage important."
    assert passages[0]["score"] == 0.87
