"""Point d'entrée FastAPI — MVP Nunya."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import artifacts, chat, health, sources, translate
from app.config import get_settings

settings = get_settings()
settings.ensure_dirs()

ROOT = Path(__file__).resolve().parents[2]
MAQUETTE = ROOT / "Charte_visuel" / "nunya-maquette.html"

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(sources.router)
app.include_router(artifacts.router)
app.include_router(translate.router)

app.mount("/artifacts", StaticFiles(directory=str(settings.artifacts_dir)), name="artifacts")


@app.get("/")
async def ui() -> FileResponse:
    return FileResponse(MAQUETTE)
