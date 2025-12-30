"""Health check API router."""

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from grimlock_api import __version__
from grimlock_api.config import get_settings
from grimlock_api.database import get_db
from grimlock_api.schemas.health import HealthResponse
from grimlock_api.services.n8n_client import N8NClient

router = APIRouter(prefix="/health", tags=["health"])

settings = get_settings()
n8n_client = N8NClient()


@router.get("", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """Check system health status."""
    status = "healthy"

    # Check database
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
        status = "degraded"

    # Check n8n
    n8n_status = "reachable"
    try:
        is_healthy = await n8n_client.health_check()
        if not is_healthy:
            n8n_status = "unreachable"
            status = "degraded"
    except Exception:
        n8n_status = "unreachable"
        status = "degraded"

    # Check build logs directory
    build_logs_status = "accessible"
    build_logs_path = Path(settings.build_logs_dir)
    if not build_logs_path.exists() or not build_logs_path.is_dir():
        build_logs_status = "inaccessible"
        status = "degraded"

    return HealthResponse(
        status=status,
        database=db_status,
        n8n=n8n_status,
        build_logs=build_logs_status,
        timestamp=datetime.utcnow(),
        version=__version__,
    )
