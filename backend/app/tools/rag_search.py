import asyncio
from dataclasses import asdict

from app.integration.passages import passages_pour_interface
from app.tools.base import Tool, ToolContext, ToolResult


class RagSearchTool(Tool):
    name = "rag_search"
    description = ("Recherche des passages pertinents dans les documents (sources) de l'apprenant. "
                   "À utiliser pour toute question portant sur ses cours ou ses documents.")
    parameters = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Requête de recherche, reformulée si besoin"},
            "k": {"type": "integer", "description": "Nombre de passages (défaut 5)"},
        },
        "required": ["query"],
    }

    async def run(self, ctx: ToolContext, query: str, k: int = 5) -> ToolResult:
        # Le modèle choisit k lui-même : on le borne pour garder des requêtes légères.
        k = max(1, min(int(k or 5), 5))
        hits = await asyncio.to_thread(ctx.services.rag.search, query, k, ctx.source_ids)
        if not hits:
            return ToolResult("Aucun passage pertinent trouvé dans les sources.")
        text = "\n\n".join(f"[{i}] ({h.filename}) {h.text}" for i, h in enumerate(hits, 1))
        return ToolResult(
            text,
            data={
                "hits": [asdict(h) for h in hits],
                # Format attendu par l'interface pour afficher les extraits cités.
                "passages": passages_pour_interface(hits),
            },
        )
