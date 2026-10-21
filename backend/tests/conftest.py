"""Configuration commune des tests.

`DATA_DIR` est forcé vers un dossier temporaire **avant** tout import de `app` :
les répertoires montés par `StaticFiles` et ceux utilisés par les services
doivent coïncider, et les tests ne doivent jamais écrire dans `data/` du dépôt.

Aucun test ne parle à un vrai LLM : la clé est vidée ici, et les tests qui ont
besoin d'une réponse utilisent un client factice.
"""
import os
import tempfile
import uuid
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

MOT_DE_PASSE_TEST = "motdepasse-de-test"


@pytest.fixture()
def settings() -> Settings:
    return Settings(
        data_dir=TEST_DATA_DIR,
        groq_api_key="",
        translation_mode="disabled",
        rag_warmup=False,
    )


@pytest.fixture()
def client(settings):
    from app.main import app

    app.dependency_overrides[get_services] = lambda: build_services(settings)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def creer_compte(client: TestClient, email: str | None = None) -> dict:
    """Inscrit un compte et laisse le cookie de session dans le client."""
    adresse = email or f"test-{uuid.uuid4().hex[:10]}@nunya.test"
    reponse = client.post(
        "/auth/register",
        json={"name": "Compte de test", "email": adresse, "mot_de_passe": MOT_DE_PASSE_TEST},
    )
    assert reponse.status_code == 201, reponse.text
    return reponse.json()


@pytest.fixture()
def connecte(client):
    """Client authentifié : les routes de l'atelier exigent un compte."""
    creer_compte(client)
    return client