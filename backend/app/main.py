"""Point d'entrée FastAPI — MVP Nunya."""
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import artifacts, chat, health, sources, translate
from app.config import get_settings
from app.services.container import get_services

settings = get_settings()
settings.ensure_dirs()

ROOT = Path(__file__).resolve().parents[2]
MAQUETTE = ROOT / "Charte_visuel" / "nunya-maquette.html"
DIST = ROOT / "frontend" / "dist"
INDEX = DIST / "index.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Préchauffe le RAG en tâche de fond.

    Le premier chargement de torch + du modèle d'embedding prend de 50 s à
    plusieurs minutes selon la machine. Le faire ici évite que le premier
document déposé (ou la première question) paie ce coût.
    """
    tache = None
    if settings.rag_warmup:
        services = get_services()
        tache = asyncio.create_task(asyncio.to_thread(services.rag.warmup))
    yield
    if tache is not None and not tache.done():
        tache.cancel()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

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

# Interface React (frontend/dist). En développement, Vite sert l'app et relaie
# ces mêmes routes vers ce serveur : les chemins sont identiques dans les deux cas.
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")


@app.get("/", include_in_schema=False)
async def ui() -> FileResponse:
    if INDEX.exists():
        return FileResponse(INDEX)
    # Repli : maquette HTML historique, pour ne jamais servir une page blanche.
    return FileResponse(MAQUETTE)


@app.get("/{chemin:path}", include_in_schema=False)
async def interface(chemin: str):
    """Sert l'application monopage : tout chemin inconnu renvoie index.html.

    Les préfixes de l'API et de la documentation sont explicitement exclus pour
    qu'une faute de frappe sur une route d'API reste un 404 JSON, pas une page.
    """
    reserves = ("chat", "sources", "translate", "health", "docs", "redoc", "openapi.json")
    if chemin.startswith(reserves) or chemin.startswith("artifacts/"):
        raise HTTPException(status_code=404, detail="Route inconnue")

    candidat = DIST / chemin
    if candidat.is_file():
        return FileResponse(candidat)
    if INDEX.exists():
        return FileResponse(INDEX)
    raise HTTPException(
        status_code=404,
        detail="Interface non construite : lance `npm run build` dans frontend/",
    )
