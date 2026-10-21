"""Script d'acceptation RAG : journalise chaque étape, sans pytest.

Usage (depuis backend/) :
    ..\\.venv\\Scripts\\python.exe -u tests/recette_rag.py
"""
import sys
import tempfile
import time
from pathlib import Path

TEMOIN = time.time()


def log(message: str) -> None:
    print(f"[{time.time() - TEMOIN:6.1f}s] {message}", flush=True)


RACINE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RACINE / "backend"))  # permet de lancer le script directement
DOCS = [
    (RACINE / "docs" / "Nunya_Cahier_des_charges_MVP.docx", "MVP"),
    (RACINE / "docs" / "Etude_technique_faisabilite.docx", "Etude"),
]
QUESTIONS = [
    ("Quelle est la durée minimale du programme ?", "2 mois"),
    ("Quelles exigences de sécurité le MVP doit-il respecter ?", "clé API"),
    ("Les documents déposés sont-ils propres à la session ?", "session"),
    ("Combien de jours de travail effectif prévoit l'étude ?", "46"),
    ("Que doit faire l'apprenant pour enregistrer un artefact ?", "Ajouter au Carnet"),
]


def ecrire_pdf(path: Path) -> Path:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    paragraphes = [
        "La photosynthèse est le processus par lequel les végétaux chlorophylliens "
        "convertissent l'énergie lumineuse en énergie chimique.",
        "Elle se déroule dans le chloroplaste et comporte deux phases distinctes.",
        "La phase claire se déroule dans les thylakoïdes : elle produit de l'ATP et du "
        "NADPH, et libère du dioxygène par photolyse de l'eau.",
        "Le cycle de Calvin se déroule dans le stroma : il fixe le dioxyde de carbone "
        "et produit du glucose.",
        "La chlorophylle est le pigment qui capte la lumière.",
    ]
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setFont("Helvetica", 11)
    y = 800
    for paragraphe in paragraphes:
        for ligne in paragraphe.split(". "):
            c.drawString(45, y, ligne.strip()[:105])
            y -= 18
        y -= 8
    c.save()
    return path


def main() -> int:
    log("import des services")
    from app.config import Settings
    from app.services.rag import RagService

    log("imports OK")

    dossier = Path(tempfile.mkdtemp(prefix="nunya-recette-"))
    settings = Settings(data_dir=dossier)
    service = RagService(settings)
    log("service RAG pret (modele pas encore charge)")

    ids = {}
    for chemin, nom in DOCS:
        debut = time.time()
        nb = service.ingest(nom, chemin, chemin.name)
        ids[nom] = nb
        log(f"ingestion {chemin.name} : {nb} chunks en {time.time() - debut:.1f}s")

    pdf = ecrire_pdf(dossier / "cours-photosynthese.pdf")
    nb = service.ingest("Cours", pdf, pdf.name)
    ids["Cours"] = nb
    log(f"ingestion {pdf.name} : {nb} chunks")

    echecs = 0
    for question, attendu in QUESTIONS:
        debut = time.time()
        hits = service.search(question, k=5)
        texte = " ".join(h.text for h in hits).lower()
        ok = attendu.lower() in texte
        echecs += 0 if ok else 1
        log(f"{'OK  ' if ok else 'ECHEC'} « {question} » -> attendu {attendu!r} "
            f"({len(hits)} hits, {time.time() - debut:.1f}s)")

    debut = time.time()
    filtres = service.search("Quelle est la durée minimale du programme ?", k=5, source_ids=["Cours"])
    ok_filtre = all(h.source_id == "Cours" for h in filtres) and filtres
    log(f"{'OK  ' if ok_filtre else 'ECHEC'} filtrage par source ({len(filtres)} hits, "
        f"{time.time() - debut:.1f}s)")

    service.delete("Cours")
    apres = service.search("Quel pigment capte la lumière ?", k=5, source_ids=["Cours"])
    log(f"{'OK  ' if not apres else 'ECHEC'} suppression : {len(apres)} chunks restants")

    log(f"TERMINE — {echecs} échec(s) de pertinence")
    return 1 if echecs else 0


if __name__ == "__main__":
    sys.exit(main())
