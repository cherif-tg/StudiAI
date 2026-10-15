from fastapi import APIRouter, Depends, HTTPException

from app.schemas import TranslateRequest, TranslateResponse
from app.services.container import Services, get_services
from app.services.translation import TranslationUnavailable

router = APIRouter(tags=["translate"])


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    req: TranslateRequest,
    services: Services = Depends(get_services),
) -> TranslateResponse:
    try:
        text = await services.translator.translate(req.text, req.target)
    except TranslationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return TranslateResponse(translation=text, target=req.target)
