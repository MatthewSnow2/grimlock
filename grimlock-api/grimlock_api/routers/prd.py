"""PRD API router."""

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from grimlock_api.config import get_settings
from grimlock_api.database import get_db
from grimlock_api.models import PRD
from grimlock_api.schemas.prd import PRDResponse, PRDUploadRequest, PRDUploadResponse
from grimlock_api.services.n8n_client import N8NClient

router = APIRouter(prefix="/prd", tags=["prd"])

settings = get_settings()
n8n_client = N8NClient()


@router.get("/latest", response_model=PRDResponse)
async def get_latest_prd(db: AsyncSession = Depends(get_db)):
    """Get the most recently uploaded PRD."""
    # Try database first
    result = await db.execute(
        select(PRD).order_by(PRD.uploaded_at.desc()).limit(1)
    )
    prd = result.scalar_one_or_none()

    if prd:
        return PRDResponse.model_validate(prd)

    # Fallback: scan filesystem
    prds_dir = Path("/home/ubuntu/projects/grimlock/prds")
    if prds_dir.exists():
        prd_files = sorted(prds_dir.glob("*.yaml"), key=lambda p: p.stat().st_mtime, reverse=True)
        if prd_files:
            latest = prd_files[0]
            content = latest.read_text()
            stat = latest.stat()

            return PRDResponse(
                id=latest.stem,
                filename=latest.name,
                project_id=None,
                content=content,
                uploaded_at=datetime.fromtimestamp(stat.st_mtime),
                uploaded_by=None,
            )

    raise HTTPException(status_code=404, detail="No PRDs found")


@router.get("/{prd_id}", response_model=PRDResponse)
async def get_prd(prd_id: str, db: AsyncSession = Depends(get_db)):
    """Get a PRD by ID."""
    result = await db.execute(select(PRD).where(PRD.id == prd_id))
    prd = result.scalar_one_or_none()

    if prd:
        return PRDResponse.model_validate(prd)

    # Fallback: check filesystem
    prd_path = Path(f"/home/ubuntu/projects/grimlock/prds/{prd_id}.yaml")
    if prd_path.exists():
        content = prd_path.read_text()
        stat = prd_path.stat()

        return PRDResponse(
            id=prd_id,
            filename=prd_path.name,
            project_id=None,
            content=content,
            uploaded_at=datetime.fromtimestamp(stat.st_mtime),
            uploaded_by=None,
        )

    raise HTTPException(status_code=404, detail=f"PRD {prd_id} not found")


@router.post("/upload", response_model=PRDUploadResponse)
async def upload_prd(
    request: PRDUploadRequest,
    db: AsyncSession = Depends(get_db),
):
    """Upload a PRD and optionally trigger a build.

    This endpoint is protected (requires authentication in production).
    """
    # Generate ID
    prd_id = f"{request.filename.replace('.yaml', '')}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # Save to database
    prd = PRD(
        id=prd_id,
        filename=request.filename,
        content=request.content,
        uploaded_at=datetime.utcnow(),
    )
    db.add(prd)

    # Also save to filesystem for compatibility
    prds_dir = Path("/home/ubuntu/projects/grimlock/prds")
    prds_dir.mkdir(parents=True, exist_ok=True)
    prd_path = prds_dir / request.filename
    prd_path.write_text(request.content)

    # Trigger n8n build workflow
    build_triggered = False
    build_id = None

    try:
        result = await n8n_client.trigger_build(request.filename)
        build_triggered = True
        build_id = result.get("buildId")
    except Exception as e:
        # Log but don't fail - PRD is saved even if n8n fails
        print(f"Failed to trigger n8n build: {e}")

    return PRDUploadResponse(
        id=prd_id,
        filename=request.filename,
        uploaded_at=prd.uploaded_at,
        build_triggered=build_triggered,
        build_id=build_id,
    )
