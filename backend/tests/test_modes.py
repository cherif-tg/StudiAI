"""Modes de réponse : catalogue, validation et effet sur le prompt système."""
import asyncio

from app.agent import orchestrator
from app.agent.modes import MODE_DEFAUT, MODES, consigne
from app.config import Settings
from app.schemas import ChatRequest
from app.services.container import build_services
from app.services.llm import LLMMessage
from app.tools.base import Tool, ToolResult


def test_catalogue_exige_un_compte(client):
    assert client.get("/agent/modes").status_code == 401


def test_catalogue_liste_les_quatre_modes(connecte):
    r = connecte.get("/agent/modes")

    assert r.status_code == 200
    corps = r.json()
    assert corps["defaut"] == MODE_DEFAUT
    assert [m["id"] for m in corps["modes"]] == ["standard", "socratique", "reflexion", "precis"]
    assert all(m["label"] and m["description"] for m in corps["modes"])


def test_mode_inconnu_refuse(connecte):
    r = connecte.post(
        "/chat",
        json={"session_id": "s-mode", "message": "bonjour", "mode": "telepathie"},
    )

    assert r.status_code == 422


def test_chaque_mode_a_une_consigne_distincte():
    consignes = {identifiant: consigne(identifiant) for identifiant in MODES}

    assert "socratique" in consignes["socratique"].lower()
    assert "sous-questions" in consignes["reflexion"].lower()
    assert "droit au but" in consignes["precis"].lower()
    assert len(set(consignes.values())) == len(MODES)
    # Un mode inconnu retombe sur le standard plutôt que de casser la boucle.
    assert consigne("inconnu") == consignes["standard"]


class _LLMBouchon:
    def __init__(self):
        self.calls = []

    async def achat(self, messages, tools=None, temperature=0.3, json_mode=False):
        self.calls.append([dict(m) for m in messages])
        return LLMMessage(content="réponse du bouchon")


class _OutilBouchon(Tool):
    name = "rag_search"
    description = "test"
    parameters = {"type": "object", "properties": {}}

    async def run(self, ctx, **kwargs) -> ToolResult:
        return ToolResult("passage")


class _RegistreBouchon:
    def get(self, nom):
        return _OutilBouchon() if nom == "rag_search" else None

    def schemas(self, services):
        return []


def test_le_mode_modifie_le_prompt_systeme(tmp_path, monkeypatch):
    settings = Settings(data_dir=tmp_path, max_agent_steps=1)
    services = build_services(settings)
    llm = _LLMBouchon()
    services.llm = llm
    monkeypatch.setattr(orchestrator, "get_registry", lambda: _RegistreBouchon())

    asyncio.run(
        orchestrator.run_agent(
            services,
            ChatRequest(session_id="s-prompt", message="explique", mode="socratique"),
        )
    )

    systeme = llm.calls[0][0]
    assert systeme["role"] == "system"
    assert "socratique" in systeme["content"].lower()
    # Les garanties du socle restent présentes quel que soit le mode.
    assert "rag_search" in systeme["content"]
    assert "Carnet" in systeme["content"]
