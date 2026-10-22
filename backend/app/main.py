"""Point d'entrée FastAPI — MVP Nunya."""
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.api import agent, artifacts, auth, chat, health, sources, translate
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
    # Indispensable dès que l'interface est servie par un autre domaine : sans
    # ce drapeau, le navigateur refuse d'envoyer le cookie de session.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(agent.router)
app.include_router(chat.router)
app.include_router(sources.router)
app.include_router(artifacts.router)
app.include_router(translate.router)

# Les artefacts ne sont plus montés en statique : ils sont servis par une route
# qui vérifie le propriétaire (api/artifacts.py).

# Interface React (frontend/dist). En développement, Vite sert l'app et relaie
# ces mêmes routes vers ce serveur : les chemins sont identiques dans les deux cas.
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")


@app.get("/", include_in_schema=False)
async def ui():
    if INDEX.exists():
        return FileResponse(INDEX)
    # Repli : maquette HTML historique, pour ne jamais servir une page blanche.
    if MAQUETTE.exists():
        return FileResponse(MAQUETTE)
    # Déploiement API seule (interface hébergée ailleurs) : on répond quelque
    # chose d'utile plutôt qu'une erreur, parce que cette URL sera visitée.
    return HTMLResponse(
        "<!doctype html><html lang='fr'><meta charset='utf-8'>"
        "<title>Nunya — API</title>"
        "<body style='font-family:system-ui;padding:48px;line-height:1.6;max-width:60ch'>"
        "<h1>Nunya — API</h1>"
        "<p>Ce serveur expose l'API. L'interface est hébergée séparément.</p>"
        "<p><a href='/health'>État du service</a> · <a href='/docs'>Documentation de l'API</a></p>"
        "</body></html>",
        status_code=200,
    )


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
