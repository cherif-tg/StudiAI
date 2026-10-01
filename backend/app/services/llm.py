"""Client LLM principal de l'agent (Groq, API compatible OpenAI, function calling fiable).

Pourquoi pas Ollama ici : le support du function calling varie fortement selon les
modèles locaux (qualité et formats différents d'un modèle à l'autre), ce qui casse la
boucle agent de façon imprévisible. Voir ollama_client.py pour un usage local ponctuel
(tâches simples, sans appel d'outils) et le README pour la discussion complète.
"""
import asyncio
import json
from dataclasses import dataclass, field

from app.config import Settings


class LLMUnavailable(RuntimeError):
    pass


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class LLMMessage:
    content: str | None
    tool_calls: list[ToolCall] = field(default_factory=list)

    def as_history_dict(self) -> dict:
        msg: dict = {"role": "assistant", "content": self.content or ""}
        if self.tool_calls:
            msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.name, "arguments": json.dumps(tc.arguments, ensure_ascii=False)},
                }
                for tc in self.tool_calls
            ]
        return msg


class LLMClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None

    def _get(self):
        if self._client is None:
            if not self.settings.groq_api_key:
                raise LLMUnavailable("GROQ_API_KEY manquant : renseigne-le dans .env")
            from groq import Groq

            self._client = Groq(api_key=self.settings.groq_api_key)
        return self._client

    def _chat_sync(self, messages, tools, temperature, json_mode) -> LLMMessage:
        kwargs: dict = dict(model=self.settings.llm_model, messages=messages, temperature=temperature)
        if tools:
            kwargs.update(tools=tools, tool_choice="auto")
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        msg = self._get().chat.completions.create(**kwargs).choices[0].message
        calls = []
        for tc in msg.tool_calls or []:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            calls.append(ToolCall(id=tc.id, name=tc.function.name, arguments=args))
        return LLMMessage(content=msg.content, tool_calls=calls)

    async def achat(self, messages: list[dict], tools: list[dict] | None = None,
                    temperature: float = 0.3, json_mode: bool = False) -> LLMMessage:
        return await asyncio.to_thread(self._chat_sync, messages, tools, temperature, json_mode)

    async def ajson(self, messages: list[dict], temperature: float = 0.2) -> dict:
        msg = await self.achat(messages, temperature=temperature, json_mode=True)
        return json.loads(msg.content or "{}")

    async def acomplete(self, system: str, user: str, temperature: float = 0.3) -> str:
        msg = await self.achat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=temperature,
        )
        return (msg.content or "").strip()
