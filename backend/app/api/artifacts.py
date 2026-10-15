import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, Query

from app.schemas import ArtifactCreate, ArtifactInfo
from app.services.container import Services, get_services

router = APIRouter(tags=["artifacts"])

_MIME = {"summary": "text/markdown", "quiz": "application/json"}
_EXT = {"summary": "md", "quiz": "json"}


def _ref(row: dict) -> ArtifactInfo:
    path = Path(row["path"])
    created = row.get("created_at")
    return ArtifactInfo(
        id=row["id"],
        kind=row["kind"],
        title=row["title"],
        mime=row["mime"],
        url=f"/artifacts/{path.name}",
        created_at=created,
    )


@router.post("/artifacts", response_model=ArtifactInfo)
async def create_artifact(
    body: ArtifactCreate,
    services: Services = Depends(get_services),
) -> ArtifactInfo:
    ext = _EXT[body.kind]
    mime = _MIME[body.kind]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    path = services.settings.artifacts_dir / f"{stamp}_{body.kind}.{ext}"
    if body.kind == "quiz":
        try:
            payload = json.loads(body.content)
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except json.JSONDecodeError:
            path.write_text(body.content, encoding="utf-8")
    else:
        path.write_text(body.content, encoding="utf-8")
    artifact_id = services.journal.add_artifact(body.session_id, body.kind, body.title, path, mime)
    row = services.journal.get_artifact(artifact_id) or {
        "id": artifact_id,
        "kind": body.kind,
        "title": body.title,
        "mime": mime,
        "path": str(path),
        "created_at": None,
    }
    return _ref(row)


@router.get("/artifacts", response_model=list[ArtifactInfo])
async def list_artifacts(
    session_id: str | None = Query(default=None),
    services: Services = Depends(get_services),
) -> list[ArtifactInfo]:
    return [_ref(row) for row in services.journal.list_artifacts(session_id)]
