from fastapi import APIRouter, Depends, HTTPException, Request

from app.agent.orchestrator import run_agent
from app.api.deps import utilisateur_requis
from app.api.guards import LimiteurDebit
from app.schemas import ChatRequest, ChatResponse
from app.services.container import Services, get_services
from app.services.llm import LLMUnavailable

router = APIRouter(tags=["chat"])

# Un seul limiteur pour tout le processus : la fenêtre est partagée par les
# requêtes, ce qui est exactement l'effet recherché sur une instance unique.
limiteur = LimiteurDebit()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    request: Request,
    user: dict = Depends(utilisateur_requis),
    services: Services = Depends(get_services),
) -> ChatResponse:
    limiteur.verifier(request, services.settings)

    # Un identifiant de source venu du client ne doit jamais permettre de lire
    # les documents d'un autre compte.
    if req.source_ids is not None:
        autorisees = {row["id"] for row in services.journal.list_sources(user["id"])}
        refusees = [identifiant for identifiant in req.source_ids if identifiant not in autorisees]
        if refusees:
            raise HTTPException(
                status_code=403,
                detail="Une source demandée n'appartient pas à ton compte.",
            )

    # Historique et traces cloisonnés par utilisateur.
    requete = req.model_copy(update={"session_id": f"{user['id']}:{req.session_id}"})

    try:
        return await run_agent(services, requete)
    except LLMUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
