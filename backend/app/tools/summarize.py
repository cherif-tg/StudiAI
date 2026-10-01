import asyncio

from app.tools.base import Tool, ToolContext, ToolResult

SYSTEM = ("Tu es un tuteur. Résume fidèlement le contenu fourni, en français, en Markdown structuré "
          "(titres courts, points clés). N'invente rien qui ne soit pas dans le texte.")
LENGTHS = {"short": "5 à 8 lignes", "medium": "une page environ", "long": "un résumé détaillé par section"}


class SummarizeTool(Tool):
    name = "summarize"
    description = "Génère un résumé structuré des sources sélectionnées (ou d'un sujet précis dans ces sources)."
    parameters = {
        "type": "object",
        "properties": {
            "focus": {"type": "string", "description": "Sujet précis à résumer (optionnel)"},
            "length": {"type": "string", "enum": list(LENGTHS), "description": "Longueur du résumé"},
        },
    }

    async def run(self, ctx: ToolContext, focus: str = "", length: str = "medium") -> ToolResult:
        context = await asyncio.to_thread(ctx.services.rag.context_for, focus, ctx.source_ids)
        if not context:
            return ToolResult("Aucune source disponible : ajoute d'abord un document.")
        user = f"Longueur souhaitée : {LENGTHS.get(length, LENGTHS['medium'])}.\n\nTEXTE :\n{context}"
        summary = await ctx.services.llm.acomplete(SYSTEM, user)
        title = f"Résumé — {focus}" if focus else "Résumé des sources"
        art = ctx.save_artifact("summary", title, summary.encode("utf-8"), "md", "text/markdown")
        return ToolResult(summary, data={"markdown": summary}, artifacts=[art])
