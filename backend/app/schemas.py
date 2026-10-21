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
    data: dict[str, Any] = {}


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
    target: Literal["ee"] = "ee"


class TranslateResponse(BaseModel):
    translation: str
    target: Literal["ee"] = "ee"


class ArtifactCreate(BaseModel):
    kind: Literal["summary", "quiz"]
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=160)
    mot_de_passe: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=160)
    mot_de_passe: str = Field(min_length=1, max_length=128)


class UserPublic(BaseModel):
    id: str
    email: str
    name: str | None = None


class ArtifactInfo(ArtifactRef):
    created_at: float | None = None
