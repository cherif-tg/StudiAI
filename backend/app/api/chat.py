from fastapi import APIRouter, Depends, HTTPException, Request

from app.agent.orchestrator import run_agent
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
    services: Services = Depends(get_services),
) -> ChatResponse:
    limiteur.verifier(request, services.settings)
    try:
        return await run_agent(services, req)
    except LLMUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
