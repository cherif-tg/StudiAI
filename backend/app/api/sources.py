import asyncio
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.api.guards import verifier_taille_annoncee
from app.schemas import SourceInfo
from app.services.container import Services, get_services
from app.services.rag import RagUnavailable

router = APIRouter(tags=["sources"])

MORCEAU = 1024 * 1024  # lecture par blocs de 1 Mo


def _octets_utilises(dossier: Path) -> int:
    return sum(fichier.stat().st_size for fichier in dossier.glob("*") if fichier.is_file())


async def _lire_avec_plafond(fichier: UploadFile, plafond_octets: int, plafond_mo: int) -> bytes:
    """Lit l'upload par blocs et coupe dès le dépassement.

    `UploadFile.read()` sans limite chargerait tout le fichier en mémoire : sur un
    petit serveur, quelques envois suffisent à le faire tomber.
    """
    tampon = bytearray()
    while True:
        bloc = await fichier.read(MORCEAU)
        if not bloc:
            break
        tampon.extend(bloc)
        if len(tampon) > plafond_octets:
            raise HTTPException(
                status_code=413,
                detail=f"Fichier trop volumineux : maximum {plafond_mo} Mo.",
            )
    return bytes(tampon)


@router.post("/sources", response_model=SourceInfo)
async def upload_source(
    request: Request,
    file: UploadFile = File(...),
    services: Services = Depends(get_services),
) -> SourceInfo:
    reglages = services.settings
    verifier_taille_annoncee(request, reglages)

    plafond_stockage = reglages.max_storage_mb * 1024 * 1024
    if _octets_utilises(reglages.uploads_dir) >= plafond_stockage:
        raise HTTPException(
            status_code=507,
            detail=(
                "Espace de stockage plein. Retire un document avant d'en déposer "
                "un nouveau."
            ),
        )

    filename = file.filename or "document"
    source_id = uuid.uuid4().hex[:12]
    dest = reglages.uploads_dir / f"{source_id}{Path(filename).suffix}"
    contenu = await _lire_avec_plafond(file, reglages.max_upload_mb * 1024 * 1024, reglages.max_upload_mb)
    dest.write_bytes(contenu)

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

    # Le fichier déposé n'a plus d'utilité une fois l'index nettoyé.
    for fichier in services.settings.uploads_dir.glob(f"{source_id}.*"):
        fichier.unlink(missing_ok=True)

    services.journal.delete_source(source_id)
    return {"ok": True}
