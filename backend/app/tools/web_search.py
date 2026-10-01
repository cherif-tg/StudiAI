import httpx

from app.tools.base import Tool, ToolContext, ToolResult


class WebSearchTool(Tool):
    name = "web_search"
    description = ("Recherche sur le web (Tavily) pour compléter les sources ou vérifier une information récente. "
                   "À utiliser seulement si les documents de l'apprenant ne suffisent pas.")
    parameters = {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}

    def available(self, services) -> bool:
        return bool(services.settings.tavily_api_key)

    async def run(self, ctx: ToolContext, query: str) -> ToolResult:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.tavily.com/search",
                headers={"Authorization": f"Bearer {ctx.services.settings.tavily_api_key}"},
                json={"query": query, "max_results": 5},
            )
            r.raise_for_status()
            results = r.json().get("results", [])
        if not results:
            return ToolResult("Aucun résultat web.")
        text = "\n\n".join(f"[{i}] {x['title']} ({x['url']})\n{x['content']}" for i, x in enumerate(results, 1))
        return ToolResult(text, data={"results": results})
