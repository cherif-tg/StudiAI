from fastapi import APIRouter, Depends

from app.services.container import Services, get_services

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(services: Services = Depends(get_services)) -> dict:
    """État du service, y compris la disponibilité réelle des briques lourdes.

    `rag` reste faux pendant le préchargement du modèle d'embedding : un client
    peut ainsi afficher « initialisation » plutôt que d'échouer sans explication.
    """
    return {
        "status": "ok",
        "rag": services.rag.ready,
        "llm": bool(services.settings.groq_api_key),
    }
