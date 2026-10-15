"""Boucle d'orchestration de l'agent (function calling Groq).

MVP : seuls rag_search, summarize et generate_quiz sont exposés.
La traduction et la persistance d'artefacts sont hors de cette boucle
(POST /translate et POST /artifacts, déclenchés par l'apprenant).
"""
from __future__ import annotations

from app.schemas import ChatRequest, ChatResponse, ToolStep
from app.services.container import Services
from app.tools.base import ToolContext
from app.tools.registry import get_registry

SYSTEM = (
    "Tu es Nunya, tuteur. Tu t'appuies uniquement sur les documents de l'apprenant "
    "via l'outil rag_search. Tu peux produire un résumé (summarize) ou un quiz "
    "(generate_quiz) quand on te le demande. N'invente rien qui n'est pas dans les "
    "sources. Réponds en français, de façon claire et concise. "
    "Ne sauvegarde rien : l'apprenant ajoutera lui-même au Carnet."
)

_history: dict[str, list[dict]] = {}


async def run_agent(services: Services, req: ChatRequest) -> ChatResponse:
    registry = get_registry()
    messages = _history.setdefault(req.session_id, [{"role": "system", "content": SYSTEM}])
    messages.append({"role": "user", "content": req.message})

    steps: list[ToolStep] = []
    tools = registry.schemas(services)
    ctx = ToolContext(services, req.session_id, req.source_ids)

    reply = await services.llm.achat(messages, tools=tools)
    for _ in range(services.settings.max_agent_steps):
        if not reply.tool_calls:
            break
        messages.append(reply.as_history_dict())
        for call in reply.tool_calls:
            tool = registry.get(call.name)
            if tool is None:
                preview = f"Outil inconnu : {call.name}"
                content = preview
                data: dict = {}
            else:
                try:
                    result = await tool.run(ctx, **call.arguments)
                    content = result.text
                    data = result.data
                    preview = result.text[:500]
                except Exception as exc:
                    content = f"Échec de l'outil {call.name} : {exc}"
                    data = {}
                    preview = content[:500]
            services.journal.log_event(req.session_id, call.name, call.arguments, preview)
            steps.append(ToolStep(tool=call.name, args=call.arguments, result_preview=preview, data=data))
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
        reply = await services.llm.achat(messages, tools=tools)

    answer = (reply.content or "").strip() or "Je n'ai pas pu formuler de réponse."
    messages.append({"role": "assistant", "content": answer})
    _history[req.session_id] = [messages[0]] + messages[1:][-39:]
    return ChatResponse(answer=answer, translation=None, steps=steps, artifacts=[])
