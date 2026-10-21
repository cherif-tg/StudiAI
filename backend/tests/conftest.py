"""Configuration commune des tests.

`DATA_DIR` est forcé vers un dossier temporaire **avant** tout import de `app` :
les répertoires montés par `StaticFiles` et ceux utilisés par les services
doivent coïncider, et les tests ne doivent jamais écrire dans `data/` du dépôt.

Aucun test ne parle à un vrai LLM : la clé est vidée ici, et les tests qui ont
besoin d'une réponse utilisent un client factice.
"""
import os
import tempfile
from pathlib import Path

TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="nunya-tests-"))
os.environ["DATA_DIR"] = str(TEST_DATA_DIR)
os.environ["GROQ_API_KEY"] = ""
os.environ["TRANSLATION_MODE"] = "disabled"
os.environ["RAG_WARMUP"] = "0"  # ne pas charger torch pendant les tests rapides

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import Settings  # noqa: E402
from app.services.container import build_services, get_services  # noqa: E402


@pytest.fixture()
def settings() -> Settings:
    return Settings(data_dir=TEST_DATA_DIR, groq_api_key="", translation_mode="disabled", rag_warmup=False)


@pytest.fixture()
def client(settings):
    from app.main import app

    app.dependency_overrides[get_services] = lambda: build_services(settings)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
