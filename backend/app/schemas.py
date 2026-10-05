"""Schema des utilitaires du systemes prédefini et applicable dans tout le projet."""
from typing import Any, Literal

from pydantic import BaseModel, Field

OutputLanguage = Literal["fr", "ee"]  # français, éwé


class ArtifactRef(BaseModel):
    id: str
    kind: str  # summary | quiz | chart | pdf | docx
    title: str
    mime: str
    url: str


class SourceInfo(BaseModel):
    id: str
    filename: str
    chunks: int


class ToolStep(BaseModel):
    tool: str
    args: dict[str, Any]
    result_preview: str


class Translation(BaseModel):
    language: OutputLanguage
    text: str = ""
    error: str | None = None


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1)
    source_ids: list[str] | None = None  # None = toutes les sources
    output_language: OutputLanguage = "fr"


class ChatResponse(BaseModel):
    answer: str
    translation: Translation | None = None
    steps: list[ToolStep] = []
    artifacts: list[ArtifactRef] = []


class ToolRunRequest(BaseModel):
    session_id: str
    args: dict[str, Any] = {}
    source_ids: list[str] | None = None


class ToolRunResponse(BaseModel):
    text: str
    data: dict[str, Any] = {}
    artifacts: list[ArtifactRef] = []


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    target: Literal["ee", "kbp"]
