"""Recette de la boucle agent avec le vrai LLM (Groq).

Vérifie sur de vrais documents :
  1. les réponses ancrées dans les sources ;
  2. l'appel effectif des outils (trace `steps`) ;
  3. le refus de répondre hors corpus ;
  4. l'invariant : aucun artefact créé sans action de l'apprenant.

Usage (depuis backend/, avec .env renseigné) :
    ..\\.venv\\Scripts\\python.exe -u tests/recette_agent.py
"""
import sys
import tempfile
import time
import unicodedata
from pathlib import Path

TEMOIN = time.time()
RACINE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RACINE / "backend"))


def log(message: str) -> None:
    print(f"[{time.time() - TEMOIN:6.1f}s] {message}", flush=True)


def normaliser(texte: str) -> str:
    """Compare ce qui est comparable : le modèle écrit « 2 mois » avec une espace
    fine insécable (U+202F) et des majuscules inattendues."""
    return (
        unicodedata.normalize("NFKC", texte)
        .replace("\u202f", " ")
        .replace("\u00a0", " ")
        .lower()
    )


ANCRES = [
    ("Quelle est la durée minimale du programme ?", "2 mois"),
    ("Quelles exigences de sécurité le MVP doit-il respecter ?", "clé API"),
    ("Comment un artefact est-il enregistré dans le Carnet ?", "Carnet"),
]
HORS_CORPUS = "Quelle est la capitale de l'Australie ?"


def main() -> int:
    from app.agent.orchestrator import run_agent
    from app.config import Settings
    from app.schemas import ChatRequest
    from app.services.container import build_services

    settings = Settings(data_dir=Path(tempfile.mkdtemp(prefix="nunya-agent-")))
    if not settings.groq_api_key:
        log("ECHEC : GROQ_API_KEY absente du .env")
        return 2

    services = build_services(settings)
    log(f"LLM : {settings.llm_model}")

    for nom in ("Nunya_Cahier_des_charges_MVP.docx", "Etude_technique_faisabilite.docx"):
        chemin = RACINE / "docs" / nom
        log(f"ingestion {nom} : {services.rag.ingest(nom[:6], chemin, nom)} chunks")

    echecs = 0
    for index, (question, attendu) in enumerate(ANCRES):
        reponse = await_run(
            run_agent, services, ChatRequest(session_id=f"recette-{index}", message=question)
        )
        outils = [etape.tool for etape in reponse.steps]
        ancree = normaliser(attendu) in normaliser(reponse.answer)
        # Une réponse correcte doit s'appuyer sur la recherche documentaire.
        outil_ok = "rag_search" in outils or "summarize" in outils
        echecs += 0 if (ancree and outil_ok) else 1
        log(f"{'OK  ' if ancree and outil_ok else 'ECHEC'} « {question} » "
            f"outils={outils} ancrage={attendu!r}")
        log(f"      reponse : {reponse.answer[:160]!r}")

    refus = await_run(
        run_agent, services, ChatRequest(session_id="recette-hors-corpus", message=HORS_CORPUS)
    )
    texte = normaliser(refus.answer)
    refuse = any(
        mot in texte
        for mot in (
            "pas dans", "aucune source", "ne figure", "ne mentionn", "ne contiennent",
            "aucune information", "pas d'information", "ne traite pas", "rien sur",
        )
    )
    echecs += 0 if refuse else 1
    log(f"{'OK  ' if refuse else 'ECHEC'} hors corpus -> {refus.answer[:160]!r}")

    artefacts = services.journal.list_artifacts()
    echecs += 0 if not artefacts else 1
    log(f"{'OK  ' if not artefacts else 'ECHEC'} artefacts crees sans action : {len(artefacts)}")

    evenements = sum(len(services.journal.list_events(f"recette-{i}")) for i in range(len(ANCRES)))
    log(f"evenements journalises : {evenements}")

    log(f"TERMINE — {echecs} echec(s)")
    return 1 if echecs else 0


def await_run(coro, services, requete):
    """Exécute la coroutine sans dépendre de pytest-asyncio."""
    import asyncio

    return asyncio.run(coro(services, requete))


if __name__ == "__main__":
    sys.exit(main())
