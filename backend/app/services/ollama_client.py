"""Client optionnel pour un modèle Ollama local — usage ponctuel uniquement.

À réserver aux tâches simples sans appel d'outils : tester un prompt hors-ligne,
pré-valider un résumé avant de consommer le quota Groq, expérimenter en coupure
réseau. N'est PAS branché sur la boucle de l'agent (voir llm.py pour pourquoi).

Suppose un conteneur/service Ollama joignable à `settings.ollama_base_url`
(voir docker-compose.yml, service "ollama").
"""
import httpx

from app.config import Settings


class OllamaUnavailable(RuntimeError):
    pass


class OllamaClient:
    def __init__(self, settings: Settings):
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    async def complete(self, system: str, user: str, temperature: float = 0.3) -> str:
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "stream": False,
            "options": {"temperature": temperature},
        }
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.post(f"{self.base_url}/api/chat", json=payload)
                r.raise_for_status()
                return r.json()["message"]["content"].strip()
        except httpx.HTTPError as e:
            raise OllamaUnavailable(f"Ollama injoignable sur {self.base_url} : {e}") from e
