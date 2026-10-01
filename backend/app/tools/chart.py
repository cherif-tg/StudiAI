import re

from app.services.sandbox import SandboxError, run_chart_code
from app.tools.base import Tool, ToolContext, ToolResult

SYSTEM = (
    "Tu écris des scripts Python pour matplotlib. Règles strictes : imports autorisés uniquement "
    "matplotlib, numpy, pandas, math, statistics, random, itertools, collections, datetime ; "
    "aucune lecture/écriture de fichier, aucun réseau ; les données sont écrites en dur dans le script ; "
    "titres et légendes en français ; termine par plt.savefig('chart.png', dpi=150, bbox_inches='tight'). "
    "Réponds UNIQUEMENT avec le code, sans explication."
)


def strip_fences(code: str) -> str:
    m = re.search(r"```(?:python)?\s*(.*?)```", code, re.S)
    return (m.group(1) if m else code).strip()


class ChartTool(Tool):
    name = "create_chart"
    description = "Crée un graphique (courbe, barres, nuage de points…) ou une figure explicative à partir d'une description."
    parameters = {
        "type": "object",
        "properties": {
            "description": {"type": "string", "description": "Ce que le graphique doit montrer"},
            "data": {"type": "string", "description": "Données à tracer, si fournies (optionnel)"},
        },
        "required": ["description"],
    }

    async def run(self, ctx: ToolContext, description: str, data: str = "") -> ToolResult:
        prompt = f"Graphique demandé : {description}\nDonnées : {data or 'à inventer de façon réaliste et le signaler dans le titre'}"
        code, last_err = "", ""
        for _ in range(2):
            ask = prompt if not last_err else f"{prompt}\n\nTon script précédent a échoué :\n{last_err}\nCorrige-le."
            code = strip_fences(await ctx.services.llm.acomplete(SYSTEM, ask, temperature=0.2))
            try:
                png = await run_chart_code(code)
                art = ctx.save_artifact("chart", description[:80], png, "png", "image/png")
                return ToolResult("Graphique généré.", data={"code": code}, artifacts=[art])
            except SandboxError as e:
                last_err = str(e)
        return ToolResult(f"Impossible de générer le graphique : {last_err}", data={"code": code})
