import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.schemas import ArtifactRef
from app.services.container import Services


@dataclass
class ToolResult:
    text: str
    data: dict = field(default_factory=dict)
    artifacts: list[ArtifactRef] = field(default_factory=list)


@dataclass
class ToolContext:
    services: Services
    session_id: str
    source_ids: list[str] | None = None

    def save_artifact(self, kind: str, title: str, content: bytes, ext: str, mime: str) -> ArtifactRef:
        path = self.services.settings.artifacts_dir / f"{uuid.uuid4().hex}.{ext}"
        path.write_bytes(content)
        artifact_id = self.services.journal.add_artifact(self.session_id, kind, title, path, mime)
        return ArtifactRef(id=artifact_id, kind=kind, title=title, mime=mime, url=f"/artifacts/{artifact_id}")


class Tool(ABC):
    name: str
    description: str
    parameters: dict

    def available(self, services: Services) -> bool:
        return True

    @abstractmethod
    async def run(self, ctx: ToolContext, **kwargs) -> ToolResult: ...

    def schema(self) -> dict:
        return {"type": "function",
                "function": {"name": self.name, "description": self.description, "parameters": self.parameters}}
