"""Tests d'API : ce qui doit tenir sans clé LLM et sans modèle d'embedding.

Ces tests sont volontairement rapides (pas de réseau, pas de torch) : ils
vérifient les contrats de l'API et les dégradations propres. La chaîne réelle
(RAG + Groq) se prouve dans `test_rag_live.py` et par la recette manuelle.
"""
import time

from docx import Document


def _docx_bytes() -> bytes:
    import io

    doc = Document()
    doc.add_paragraph("La photosynthèse convertit l'énergie lumineuse en énergie chimique.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_health(client):
    r = client.get("/health")

    assert r.status_code == 200
    etat = r.json()
    assert etat["status"] == "ok"
    assert etat["rag"] is False  # aucun modèle chargé dans les tests rapides
    assert etat["llm"] is False  # clé volontairement vide


def test_artefact_cree_liste_et_servi(client):
    body = {
        "session_id": "s-artefact",
        "kind": "summary",
        "title": "Résumé de test",
        "content": "# Titre\n\n- point clé",
    }
    created = client.post("/artifacts", json=body)

    assert created.status_code == 200
    ref = created.json()
    assert ref["kind"] == "summary"
    assert ref["url"].startswith("/artifacts/")

    # Le fichier est réellement écrit et servi (pas seulement une ligne en base).
    served = client.get(ref["url"])
    assert served.status_code == 200
    assert "point clé" in served.text

    listed = client.get("/artifacts", params={"session_id": "s-artefact"}).json()
    assert [a["id"] for a in listed] == [ref["id"]]


def test_artefacts_listes_du_plus_recent_au_plus_ancien(client):
    for titre in ("Premier", "Second"):
        client.post(
            "/artifacts",
            json={"session_id": "s-ordre", "kind": "summary", "title": titre, "content": "contenu"},
        )
        time.sleep(0.01)  # created_at est en secondes flottantes

    titres = [a["title"] for a in client.get("/artifacts", params={"session_id": "s-ordre"}).json()]

    assert titres == ["Second", "Premier"]


def test_artefacts_isoles_par_session(client):
    client.post(
        "/artifacts",
        json={"session_id": "s-a", "kind": "summary", "title": "À moi", "content": "x"},
    )

    assert client.get("/artifacts", params={"session_id": "s-b"}).json() == []


def test_chat_sans_cle_llm_renvoie_503_exploitable(client):
    r = client.post("/chat", json={"session_id": "s-chat", "message": "bonjour"})

    assert r.status_code == 503
    assert "GROQ_API_KEY" in r.json()["detail"]


def test_traduction_desactivee_renvoie_503(client):
    r = client.post("/translate", json={"text": "bonjour", "target": "ee"})

    assert r.status_code == 503


def test_source_format_non_supporte_est_rejete_sans_rien_laisser(client):
    r = client.post("/sources", files={"file": ("notes.odt", b"contenu", "application/octet-stream")})

    assert r.status_code == 400
    assert "Format non supporté" in r.json()["detail"]
    assert all(s["filename"] != "notes.odt" for s in client.get("/sources").json())


def test_source_docx_valide_est_indexe(client, monkeypatch):
    """Contrat de la route d'upload, sans charger le vrai modèle d'embedding.

    L'ingestion réelle (chunks, recherche, suppression) est vérifiée par
    `tests/recette_rag.py` ; ici on vérifie le câblage HTTP et le journal.
    """
    from app.services.rag import RagService

    monkeypatch.setattr(RagService, "ingest", lambda self, source_id, path, filename: 4)

    r = client.post(
        "/sources",
        files={
            "file": (
                "cours.docx",
                _docx_bytes(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert r.status_code == 200
    assert r.json()["chunks"] == 4
    assert any(s["filename"] == "cours.docx" for s in client.get("/sources").json())


def test_source_refuse_et_nettoie_quand_le_rag_est_indisponible(client, monkeypatch):
    from app.services.rag import RagService, RagUnavailable

    def echec(self, source_id, path, filename):
        raise RagUnavailable("Installe requirements-rag.txt pour activer le RAG")

    monkeypatch.setattr(RagService, "ingest", echec)

    r = client.post("/sources", files={"file": ("orphelin.docx", _docx_bytes(), "application/octet-stream")})

    assert r.status_code == 503
    assert all(s["filename"] != "orphelin.docx" for s in client.get("/sources").json())
