"""Point d'entrée FastAPI. Encore minimal : seules les briques de base (RAG, outils,
traduction, services) sont écrites.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import health
from app.config import get_settings

settings = get_settings()
settings.ensure_dirs()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/artifacts", StaticFiles(directory=str(settings.artifacts_dir)), name="artifacts")
app.include_router(health.router)

# app.include_router(chat.router)      # TODO : POST /chat -> boucle de l'agent
# app.include_router(sources.router)   # TODO : POST/GET/DELETE /sources
# app.include_router(tools.router)     # TODO : POST /tools/{name} (appel direct, hors chat)
