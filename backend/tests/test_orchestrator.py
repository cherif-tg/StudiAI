"""Tests de la boucle d'agent, sans réseau et sans clé.

C'est le test qui protège le cœur du produit : si la boucle se casse, aucun
autre test ne le verra. Le client LLM est factice, l'outil aussi.
"""
import asyncio

import pytest

from app.agent import orchestrator
from app.config import Settings
from app.schemas import ChatRequest
from app.services.container import build_services
from app.services.llm import LLMMessage, ToolCall
from app.tools.base import Tool, ToolResult


class FakeLLM:
    """Rejoue une liste de réponses préparées et garde la trace des messages."""

    def __init__(self, replies: list[LLMMessage]):
        self.replies = list(replies)
        self.calls: list[list[dict]] = []

    async def achat(self, messages, tools=None, temperature=0.3, json_mode=False):
        self.calls.append([dict(m) for m in messages])
        if not self.replies:
            return LLMMessage(content="(script épuisé)")
        return self.replies.pop(0)


class EchoTool(Tool):
    name = "rag_search"
    description = "outil de test"
    parameters = {"type": "object", "properties": {"query": {"type": "string"}}}

    def __init__(self):
        self.calls = 0

    async def run(self, ctx, query: str = "", **kwargs) -> ToolResult:
        self.calls += 1
        return ToolResult(f"passage pour {query}", data={"query": query})


class BoomTool(EchoTool):
    async def run(self, ctx, **kwargs) -> ToolResult:
        raise RuntimeError("panne simulée du RAG")


class FakeRegistry:
    def __init__(self, tools: list[Tool]):
        self._tools = {t.name: t for t in tools}

    def get(self, name: str):
        return self._tools.get(name)

    def schemas(self, services) -> list[dict]:
        return [t.schema() for t in self._tools.values()]


def _services(tmp_path, llm, max_steps: int = 3):
    settings = Settings(data_dir=tmp_path, groq_api_key="test", max_agent_steps=max_steps)
    services = build_services(settings)
    services.llm = llm  # injection directe : le dataclass est remplaçable
    return services


def _tool_call(name: str = "rag_search", query: str = "photosynthèse") -> LLMMessage:
    return LLMMessage(
        content=None,
        tool_calls=[ToolCall(id="call_1", name=name, arguments={"query": query})],
    )


def test_boucle_execute_l_outil_puis_repond(tmp_path, monkeypatch):
    llm = FakeLLM([_tool_call(), LLMMessage(content="La photosynthèse se déroule dans le chloroplaste.")])
    services = _services(tmp_path, llm)
    outil = EchoTool()
    monkeypatch.setattr(orchestrator, "get_registry", lambda: FakeRegistry([outil]))

    resp = asyncio.run(
        orchestrator.run_agent(
            services, ChatRequest(session_id="s-boucle", message="Parle-moi de la photosynthèse")
        )
    )

    assert resp.answer.startswith("La photosynthèse")
    assert [s.tool for s in resp.steps] == ["rag_search"]
    assert resp.steps[0].data == {"query": "photosynthèse"}
    assert outil.calls == 1
    # Le message de l'outil est bien réinjecté dans la conversation.
    assert any(m.get("role") == "tool" for m in llm.calls[1])
    # Deux appels LLM : décision d'outil, puis réponse finale.
    assert len(llm.calls) == 2


def test_aucun_artefact_n_est_cree_sans_action_explicite(tmp_path, monkeypatch):
    llm = FakeLLM([_tool_call(), LLMMessage(content="Réponse")])
    services = _services(tmp_path, llm)
    monkeypatch.setattr(orchestrator, "get_registry", lambda: FakeRegistry([EchoTool()]))

    resp = asyncio.run(
        orchestrator.run_agent(services, ChatRequest(session_id="s-artefact-boucle", message="résume"))
    )

    assert resp.artifacts == []
    assert services.journal.list_artifacts() == []


def test_outil_en_echec_ne_casse_pas_la_reponse(tmp_path, monkeypatch):
    llm = FakeLLM([_tool_call(), LLMMessage(content="Je n'ai pas pu consulter les sources.")])
    services = _services(tmp_path, llm)
    monkeypatch.setattr(orchestrator, "get_registry", lambda: FakeRegistry([BoomTool()]))

    resp = asyncio.run(
        orchestrator.run_agent(services, ChatRequest(session_id="s-erreur", message="question"))
    )

    assert resp.answer == "Je n'ai pas pu consulter les sources."
    assert len(resp.steps) == 1
    assert "panne simulée" in resp.steps[0].result_preview


def test_outil_inconnu_est_signale_sans_planter(tmp_path, monkeypatch):
    llm = FakeLLM(
        [LLMMessage(content=None, tool_calls=[ToolCall(id="c9", name="outil_fantome", arguments={})]),
         LLMMessage(content="ok")]
    )
    services = _services(tmp_path, llm)
    monkeypatch.setattr(orchestrator, "get_registry", lambda: FakeRegistry([EchoTool()]))

    resp = asyncio.run(
        orchestrator.run_agent(services, ChatRequest(session_id="s-inconnu", message="test"))
    )

    assert "Outil inconnu" in resp.steps[0].result_preview


def test_max_agent_steps_borne_la_boucle(tmp_path, monkeypatch):
    # Le LLM réclame un outil à chaque tour : la boucle doit s'arrêter.
    llm = FakeLLM([_tool_call(), _tool_call(), _tool_call(), _tool_call()])
    services = _services(tmp_path, llm, max_steps=2)
    monkeypatch.setattr(orchestrator, "get_registry", lambda: FakeRegistry([EchoTool()]))

    resp = asyncio.run(
        orchestrator.run_agent(services, ChatRequest(session_id="s-borne", message="boucle"))
    )

    assert len(resp.steps) == 2
    assert resp.answer == "Je n'ai pas pu formuler de réponse."


def test_evenements_journalises_par_appel_d_outil(tmp_path, monkeypatch):
    llm = FakeLLM([_tool_call(), LLMMessage(content="fini")])
    services = _services(tmp_path, llm)
    monkeypatch.setattr(orchestrator, "get_registry", lambda: FakeRegistry([EchoTool()]))

    asyncio.run(
        orchestrator.run_agent(services, ChatRequest(session_id="s-journal", message="trace"))
    )

    events = services.journal.list_events("s-journal")
    assert len(events) == 1
    assert events[0]["tool"] == "rag_search"
