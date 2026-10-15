from fastapi import APIRouter, Depends, HTTPException

from app.agent.orchestrator import run_agent
from app.schemas import ChatRequest, ChatResponse
from app.services.container import Services, get_services
from app.services.llm import LLMUnavailable

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, services: Services = Depends(get_services)) -> ChatResponse:
    try:
        return await run_agent(services, req)
    except LLMUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
