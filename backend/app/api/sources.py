import asyncio
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.schemas import SourceInfo
from app.services.container import Services, get_services
from app.services.rag import RagUnavailable

router = APIRouter(tags=["sources"])


@router.post("/sources", response_model=SourceInfo)
async def upload_source(
    file: UploadFile = File(...),
    services: Services = Depends(get_services),
) -> SourceInfo:
    filename = file.filename or "document"
    source_id = uuid.uuid4().hex[:12]
    dest = services.settings.uploads_dir / f"{source_id}{Path(filename).suffix}"
    dest.write_bytes(await file.read())
    try:
        chunks = await asyncio.to_thread(services.rag.ingest, source_id, dest, filename)
    except RagUnavailable as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    services.journal.add_source(source_id, filename, chunks)
    return SourceInfo(id=source_id, filename=filename, chunks=chunks)


@router.get("/sources", response_model=list[SourceInfo])
async def list_sources(services: Services = Depends(get_services)) -> list[SourceInfo]:
    return [
        SourceInfo(id=row["id"], filename=row["filename"], chunks=row["chunks"])
        for row in services.journal.list_sources()
    ]


@router.delete("/sources/{source_id}")
async def delete_source(source_id: str, services: Services = Depends(get_services)) -> dict:
    try:
        await asyncio.to_thread(services.rag.delete, source_id)
    except RagUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    services.journal.delete_source(source_id)
    return {"ok": True}
