"""Conteneur de services (injection de dépendances FastAPI, surchargeable dans les tests)."""
from dataclasses import dataclass
from functools import lru_cache

from app.config import Settings, get_settings
from app.services.journal import Journal
from app.services.llm import LLMClient
from app.services.ollama_client import OllamaClient
from app.services.rag import RagService
from app.services.translation import TranslationService


@dataclass
class Services: #Class de definitions des services exposé en API
    settings: Settings #Paramettre des sevices
    journal: Journal
    llm: LLMClient
    rag: RagService
    translator: TranslationService
    ollama: OllamaClient


def build_services(settings: Settings) -> Services:
    """Fonction d'implementation d'un service retourne un élément de la classe service."""
    settings.ensure_dirs()
    return Services(
        settings=settings,
        journal=Journal(settings.db_path),
        llm=LLMClient(settings),
        rag=RagService(settings),
        translator=TranslationService(settings),
        ollama=OllamaClient(settings),
    )

# Le squelette des services est défini ici pour garder le code propre et structuré
@lru_cache # Fonction de récuperation des services
def get_services() -> Services:
    return build_services(get_settings())
