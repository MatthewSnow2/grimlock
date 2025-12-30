"""Projects API router."""

import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from grimlock_api.config import get_settings
from grimlock_api.database import get_db
from grimlock_api.models import Project
from grimlock_api.schemas.project import ProjectListResponse, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])

settings = get_settings()


@router.get("", response_model=ProjectListResponse)
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all MCP projects."""
    # First, try to get from database
    result = await db.execute(
        select(Project).order_by(Project.last_build_at.desc().nullslast())
    )
    db_projects = result.scalars().all()

    if db_projects:
        return ProjectListResponse(
            projects=[ProjectResponse.model_validate(p) for p in db_projects],
            total=len(db_projects),
        )

    # Fallback: scan filesystem for MCP projects
    mcp_dir = Path("/home/ubuntu/projects/mcp")
    projects = []

    if mcp_dir.exists():
        for item in mcp_dir.iterdir():
            if item.is_dir() and not item.name.startswith("."):
                stat = item.stat()
                created_at = datetime.fromtimestamp(stat.st_ctime)

                # Try to detect SDK
                sdk = None
                if (item / "package.json").exists():
                    sdk = "typescript"
                elif (item / "pyproject.toml").exists() or (item / "setup.py").exists():
                    sdk = "python"

                projects.append(
                    ProjectResponse(
                        id=item.name,
                        name=item.name,
                        path=str(item),
                        sdk=sdk,
                        service_name=None,
                        build_count=0,
                        last_build_at=None,
                        created_at=created_at,
                    )
                )

    # Sort by name
    projects.sort(key=lambda p: p.name)

    return ProjectListResponse(projects=projects, total=len(projects))


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single project by ID."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if project:
        return ProjectResponse.model_validate(project)

    # Fallback: check filesystem
    mcp_path = Path(f"/home/ubuntu/projects/mcp/{project_id}")
    if mcp_path.exists() and mcp_path.is_dir():
        stat = mcp_path.stat()
        sdk = None
        if (mcp_path / "package.json").exists():
            sdk = "typescript"
        elif (mcp_path / "pyproject.toml").exists():
            sdk = "python"

        return ProjectResponse(
            id=project_id,
            name=project_id,
            path=str(mcp_path),
            sdk=sdk,
            service_name=None,
            build_count=0,
            last_build_at=None,
            created_at=datetime.fromtimestamp(stat.st_ctime),
        )

    raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
