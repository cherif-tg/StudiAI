import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from app.api.deps import proprietaire
from app.schemas import ArtifactCreate, ArtifactInfo
from app.services.container import Services, get_services

router = APIRouter(tags=["artefacts"])

_MIME = {"summary": "text/markdown", "quiz": "application/json"}
_EXT = {"summary": "md", "quiz": "json"}


def _ref(row: dict) -> ArtifactInfo:
    path = Path(row["path"])
    return ArtifactInfo(
        id=row["id"],
        kind=row["kind"],
        title=row["title"],
        mime=row["mime"],
        url=f"/artifacts/{path.name}",
        created_at=row.get("created_at"),
    )


@router.post("/artifacts", response_model=ArtifactInfo)
async def create_artifact(
    body: ArtifactCreate,
    owner: str = Depends(proprietaire),
    services: Services = Depends(get_services),
) -> ArtifactInfo:
    ext = _EXT[body.kind]
    mime = _MIME[body.kind]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    path = services.settings.artifacts_dir / f"{owner[:8]}_{stamp}_{body.kind}.{ext}"

    if body.kind == "quiz":
        try:
            payload = json.loads(body.content)
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except json.JSONDecodeError:
            path.write_text(body.content, encoding="utf-8")
    else:
        path.write_text(body.content, encoding="utf-8")

    artifact_id = services.journal.add_artifact(owner, body.kind, body.title, path, mime)
    row = services.journal.get_artifact(owner, artifact_id) or {
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
    owner: str = Depends(proprietaire), services: Services = Depends(get_services)
) -> list[ArtifactInfo]:
    return [_ref(row) for row in services.journal.list_artifacts(owner)]


@router.get("/artifacts/{filename}")
async def telecharger_artifact(
    filename: str,
    owner: str = Depends(proprietaire),
    services: Services = Depends(get_services),
) -> FileResponse:
    """Sert un artefact après vérification du propriétaire.

    Le dossier des artefacts n'est pas monté en statique : un nom de fichier ne
    doit pas suffire à lire le carnet de quelqu'un d'autre.
    """
    for row in services.journal.list_artifacts(owner):
        chemin = Path(row["path"])
        if chemin.name == filename and chemin.is_file():
            return FileResponse(chemin, media_type=row["mime"], filename=chemin.name)

    raise HTTPException(status_code=404, detail="Artefact introuvable.")


@router.delete("/artifacts/{artifact_id}")
async def supprimer_artifact(
    artifact_id: str,
    owner: str = Depends(proprietaire),
    services: Services = Depends(get_services),
) -> dict:
    """Retire un artefact du carnet : la ligne et son fichier, après contrôle du propriétaire."""
    ligne = services.journal.supprimer_artefact(owner, artifact_id)
    if ligne is None:
        raise HTTPException(status_code=404, detail="Artefact introuvable.")
    Path(ligne["path"]).unlink(missing_ok=True)
    return {"ok": True}
