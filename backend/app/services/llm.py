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


MAX_TOKENS_SORTIE = 2048


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

            # Pas de nouvelle tentative automatique : sur une limite de débit, le client
            # Groq attendait jusqu'à 60 s, deux fois, avant d'échouer. On préfère un
            # message clair tout de suite (voir _chat_sync).
            self._client = Groq(api_key=self.settings.groq_api_key, max_retries=0, timeout=45)
        return self._client

    def _chat_sync(self, messages, tools, temperature, json_mode) -> LLMMessage:
        kwargs: dict = dict(model=self.settings.llm_model, messages=messages, temperature=temperature)
        if tools:
            kwargs.update(tools=tools, tool_choice="auto")
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        # Plafond de sortie : Groq compte ce plafond dans la limite de tokens par minute.
        kwargs["max_tokens"] = MAX_TOKENS_SORTIE
        # Les modèles gpt-oss « réfléchissent » avant de répondre : en effort faible,
        # la réponse arrive plus vite et consomme moins de tokens.
        if str(self.settings.llm_model).startswith("openai/gpt-oss"):
            kwargs["reasoning_effort"] = "low"
        try:
            try:
                msg = self._get().chat.completions.create(**kwargs).choices[0].message
            except TypeError:
                # Ancienne version de la bibliothèque groq sans reasoning_effort.
                kwargs.pop("reasoning_effort", None)
                msg = self._get().chat.completions.create(**kwargs).choices[0].message
        except Exception as exc:
            # Limite de débit ou requête trop grosse (413, 429) : message clair (503)
            # au lieu d'une erreur 500 opaque.
            if getattr(exc, "status_code", None) in (413, 429):
                raise LLMUnavailable(
                    "Le modèle est momentanément saturé (limite de tokens par minute). "
                    "Réessaie dans une minute."
                ) from exc
            raise
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
