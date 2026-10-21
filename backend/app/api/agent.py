"""Catalogue des modes de réponse de l'agent."""
from fastapi import APIRouter, Depends

from app.agent.modes import MODE_DEFAUT, catalogue
from app.api.deps import utilisateur_requis

router = APIRouter(tags=["agent"])


@router.get("/agent/modes")
async def modes(_user: dict = Depends(utilisateur_requis)) -> dict:
    return {"defaut": MODE_DEFAUT, "modes": catalogue()}
