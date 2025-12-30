"""Builds API router."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from grimlock_api.database import get_db
from grimlock_api.models import Build, BuildLog
from grimlock_api.schemas.build import (
    BuildCreate,
    BuildCurrentResponse,
    BuildListResponse,
    BuildLogsResponse,
    BuildResponse,
    LogCreate,
    LogEntry,
)

router = APIRouter(prefix="/builds", tags=["builds"])


@router.get("/current", response_model=BuildCurrentResponse)
async def get_current_builds(db: AsyncSession = Depends(get_db)):
    """Get currently running builds."""
    result = await db.execute(
        select(Build)
        .where(Build.status == "running")
        .order_by(Build.started_at.desc())
    )
    builds = result.scalars().all()

    # Get log counts
    responses = []
    for build in builds:
        log_count_result = await db.execute(
            select(func.count()).where(BuildLog.build_id == build.id)
        )
        log_count = log_count_result.scalar() or 0
        responses.append(
            BuildResponse(
                id=build.id,
                name=build.name,
                status=build.status,
                phase=build.phase,
                started_at=build.started_at,
                stopped_at=build.stopped_at,
                duration=build.duration,
                log_count=log_count,
            )
        )

    return BuildCurrentResponse(running=responses, count=len(responses))


@router.get("/history", response_model=BuildListResponse)
async def get_build_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get build history with pagination."""
    query = select(Build).order_by(Build.started_at.desc())

    if status:
        query = query.where(Build.status == status)

    # Get total count
    count_query = select(func.count()).select_from(Build)
    if status:
        count_query = count_query.where(Build.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    builds = result.scalars().all()

    # Get log counts
    responses = []
    for build in builds:
        log_count_result = await db.execute(
            select(func.count()).where(BuildLog.build_id == build.id)
        )
        log_count = log_count_result.scalar() or 0
        responses.append(
            BuildResponse(
                id=build.id,
                name=build.name,
                status=build.status,
                phase=build.phase,
                started_at=build.started_at,
                stopped_at=build.stopped_at,
                duration=build.duration,
                log_count=log_count,
            )
        )

    return BuildListResponse(
        builds=responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{build_id}", response_model=BuildResponse)
async def get_build(build_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single build by ID."""
    result = await db.execute(select(Build).where(Build.id == build_id))
    build = result.scalar_one_or_none()

    if not build:
        raise HTTPException(status_code=404, detail=f"Build {build_id} not found")

    log_count_result = await db.execute(
        select(func.count()).where(BuildLog.build_id == build.id)
    )
    log_count = log_count_result.scalar() or 0

    return BuildResponse(
        id=build.id,
        name=build.name,
        status=build.status,
        phase=build.phase,
        started_at=build.started_at,
        stopped_at=build.stopped_at,
        duration=build.duration,
        log_count=log_count,
    )


@router.get("/{build_id}/logs", response_model=BuildLogsResponse)
async def get_build_logs(
    build_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get logs for a specific build."""
    result = await db.execute(select(Build).where(Build.id == build_id))
    build = result.scalar_one_or_none()

    if not build:
        raise HTTPException(status_code=404, detail=f"Build {build_id} not found")

    # Get logs
    logs_result = await db.execute(
        select(BuildLog)
        .where(BuildLog.build_id == build_id)
        .order_by(BuildLog.timestamp)
        .offset(offset)
        .limit(limit)
    )
    logs = logs_result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count()).where(BuildLog.build_id == build_id)
    )
    total = count_result.scalar() or 0

    log_entries = [
        LogEntry(
            ts=log.timestamp,
            event=log.event,
            phase=log.phase,
            msg=log.message,
            level=log.level,
            metadata=log.extra_data,
        )
        for log in logs
    ]

    return BuildLogsResponse(
        build_id=build.id,
        name=build.name,
        status=build.status,
        started_at=build.started_at,
        stopped_at=build.stopped_at,
        duration=build.duration,
        logs=log_entries,
        total=total,
    )


@router.post("/{build_id}/logs", status_code=201)
async def add_build_log(
    build_id: str,
    log_entry: LogCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a log entry to a build (called by n8n)."""
    # Check if build exists
    result = await db.execute(select(Build).where(Build.id == build_id))
    build = result.scalar_one_or_none()

    if not build:
        # Auto-create build if it doesn't exist (for flexibility)
        build = Build(
            id=build_id,
            name=build_id.rsplit("-", 1)[0] if "-" in build_id else build_id,
            status="running",
            phase=log_entry.phase or "prd_uploaded",
        )
        db.add(build)

    # Update build phase if provided
    if log_entry.phase:
        build.phase = log_entry.phase

    # Check for terminal events
    if log_entry.event in ("build_complete", "build_success"):
        build.status = "success"
        build.phase = "complete"
        build.stopped_at = datetime.utcnow()
        if build.started_at:
            build.duration = int((build.stopped_at - build.started_at).total_seconds())
    elif log_entry.event in ("build_error", "build_failed"):
        build.status = "error"
        build.stopped_at = datetime.utcnow()
        if build.started_at:
            build.duration = int((build.stopped_at - build.started_at).total_seconds())

    # Create log entry
    log = BuildLog(
        build_id=build_id,
        timestamp=log_entry.timestamp or datetime.utcnow(),
        event=log_entry.event,
        phase=log_entry.phase,
        message=log_entry.message,
        level=log_entry.level,
        extra_data=log_entry.metadata,
    )
    db.add(log)

    return {"status": "logged", "build_id": build_id}


@router.post("", status_code=201)
async def create_build(
    build_data: BuildCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new build."""
    # Check if build already exists
    result = await db.execute(select(Build).where(Build.id == build_data.id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=f"Build {build_data.id} already exists")

    build = Build(
        id=build_data.id,
        name=build_data.name,
        status=build_data.status,
        phase=build_data.phase,
        prd_id=build_data.prd_id,
        project_id=build_data.project_id,
    )
    db.add(build)

    return {"status": "created", "build_id": build.id}
