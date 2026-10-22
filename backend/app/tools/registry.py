from functools import lru_cache

from app.services.container import Services
from app.tools.base import Tool
from app.tools.quiz import QuizTool
from app.tools.rag_search import RagSearchTool
from app.tools.summarize import SummarizeTool
# MVP : ChartTool, TranslateTool, ExportDocTool, WebSearchTool restent dans
# le dépôt mais ne sont pas exposés à l'agent (PLAN_REALISATION_MVP §2.2).


class ToolRegistry:
    def __init__(self, tools: list[Tool]):
        self._tools = {t.name: t for t in tools}

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def available(self, services: Services) -> list[Tool]:
        return [t for t in self._tools.values() if t.available(services)]

    def schemas(self, services: Services) -> list[dict]:
        return [t.schema() for t in self.available(services)]


def build_registry() -> ToolRegistry:
    return ToolRegistry([
        RagSearchTool(),
        SummarizeTool(),
        QuizTool(),
    ])


@lru_cache
def get_registry() -> ToolRegistry:
    return build_registry()
