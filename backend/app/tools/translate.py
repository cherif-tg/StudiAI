from app.services.translation import TranslationUnavailable
from app.tools.base import Tool, ToolContext, ToolResult

NOTE = ("Traduction automatique : à relire par un locuteur natif. Le modèle actuel peut produire "
        "une langue de registre ancien (corpus d'entraînement en grande partie biblique).")


class TranslateTool(Tool):
    name = "translate"
    description = "Traduit un texte français vers une langue locale togolaise (éwé 'ee' ou kabiyè 'kbp')."
    parameters = {
        "type": "object",
        "properties": {
            "text": {"type": "string"},
            "target_language": {"type": "string", "enum": ["ee", "kbp"]},
        },
        "required": ["text", "target_language"],
    }

    def available(self, services) -> bool:
        return services.translator.enabled

    async def run(self, ctx: ToolContext, text: str, target_language: str) -> ToolResult:
        try:
            out = await ctx.services.translator.translate(text, target_language)
        except TranslationUnavailable as e:
            return ToolResult(f"Traduction indisponible : {e}")
        return ToolResult(out, data={"language": target_language, "quality_note": NOTE})
