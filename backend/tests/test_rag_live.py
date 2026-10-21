"""Validation du RAG sur de vrais documents — test d'intégration, lent.

Lancé uniquement avec `RUN_RAG_LIVE=1` (charge le modèle d'embedding, quelques
secondes à la première exécution). Ne remplace pas la recette manuelle, mais
fige les deux propriétés qui comptent :

1. un PDF et un DOCX réels produisent des chunks et sont retrouvés ;
2. le filtrage par `source_ids` isole bien les documents.
"""
import os
from pathlib import Path

import pytest

from app.config import Settings
from app.services.rag import RagService

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_RAG_LIVE") != "1",
    reason="test d'intégration : RUN_RAG_LIVE=1 pour l'exécuter",
)

RACINE = Path(__file__).resolve().parents[2]
DOCUMENTS_REELS = [
    (RACINE / "docs" / "Nunya_Cahier_des_charges_MVP.docx", "MVP"),
    (RACINE / "docs" / "Etude_technique_faisabilite.docx", "Etude"),
]

COURS = [
    "La photosynthèse — cours de biologie",
    "La photosynthèse est le processus par lequel les végétaux chlorophylliens "
    "convertissent l'énergie lumineuse en énergie chimique stockée dans les "
    "molécules organiques.",
    "Elle se déroule dans le chloroplaste et comporte deux phases distinctes.",
    "La phase claire se déroule dans les thylakoïdes : elle produit de l'ATP et du "
    "NADPH, et libère du dioxygène par photolyse de l'eau.",
    "Le cycle de Calvin se déroule dans le stroma : il fixe le dioxyde de carbone "
    "atmosphérique et produit du glucose.",
    "La chlorophylle est le pigment qui capte la lumière, principalement dans les "
    "longueurs d'onde bleues et rouges.",
]


def _ecrire_pdf(path: Path) -> Path:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(str(path), pagesize=A4)
    y = 800
    c.setFont("Helvetica", 11)
    for paragraphe in COURS:
        for ligne in paragraphe.split(". "):
            c.drawString(50, y, ligne.strip()[:110])
            y -= 16
        y -= 10
        if y < 60:
            c.showPage()
            c.setFont("Helvetica", 11)
            y = 800
    c.save()
    return path


@pytest.fixture(scope="module")
def rag(tmp_path_factory):
    settings = Settings(data_dir=tmp_path_factory.mktemp("rag-live"))
    return RagService(settings)


@pytest.fixture(scope="module")
def corpus(rag, tmp_path_factory):
    dossier = tmp_path_factory.mktemp("corpus")
    pdf = _ecrire_pdf(dossier / "cours-photosynthese.pdf")
    sources = {}

    for index, (chemin, nom) in enumerate(DOCUMENTS_REELS):
        assert chemin.exists(), f"document de test manquant : {chemin}"
        source_id = f"doc{index}"
        chunks = rag.ingest(source_id, chemin, chemin.name)
        assert chunks > 0, f"aucun chunk extrait de {chemin.name}"
        sources[nom] = {"id": source_id, "chunks": chunks, "fichier": chemin}

    sources["Cours"] = {"id": "doc-cours", "chunks": rag.ingest("doc-cours", pdf, pdf.name), "fichier": pdf}
    return sources


@pytest.mark.parametrize(
    "question, attendu",
    [
        ("Quelle est la durée minimale du programme ?", "2 mois"),
        ("Quelles exigences de sécurité le MVP doit-il respecter ?", "clé API"),
        ("Les documents déposés sont-ils propres à la session ?", "session"),
        ("Où se déroule le cycle de Calvin ?", "stroma"),
        ("Quel pigment capte la lumière ?", "chlorophylle"),
    ],
)
def test_les_reponses_sont_retrouvees_dans_les_sources(rag, corpus, question, attendu):
    hits = rag.search(question, k=5)

    assert hits, f"aucun passage trouvé pour « {question} »"
    texte = " ".join(h.text for h in hits).lower()
    assert attendu.lower() in texte, f"« {attendu} » absent des 5 meilleurs passages"


def test_filtrage_par_source(rag, corpus):
    cours = corpus["Cours"]["id"]

    hits = rag.search("Quelle est la durée minimale du programme ?", k=5, source_ids=[cours])

    assert all(h.source_id == cours for h in hits)
    assert all("2 mois" not in h.text for h in hits)


def test_suppression_retire_les_chunks(rag, corpus, tmp_path):
    settings = Settings(data_dir=tmp_path)
    service = RagService(settings)
    doc = tmp_path / "a-supprimer.md"
    doc.write_text("Le théorème de Pythagore relie les côtés du triangle rectangle.", encoding="utf-8")

    service.ingest("tmp-src", doc, doc.name)
    assert service.search("Pythagore", k=3, source_ids=["tmp-src"])

    service.delete("tmp-src")

    assert service.search("Pythagore", k=3, source_ids=["tmp-src"]) == []
