"""Analytics API router."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from grimlock_api.database import get_db
from grimlock_api.models import Build
from grimlock_api.schemas.analytics import AnalyticsResponse, MCPStats

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Get build analytics for the last 7 days."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Total builds
    total_result = await db.execute(select(func.count()).select_from(Build))
    total_builds = total_result.scalar() or 0

    # Success count
    success_result = await db.execute(
        select(func.count()).where(Build.status == "success")
    )
    success_count = success_result.scalar() or 0

    # Success rate
    success_rate = (success_count / total_builds * 100) if total_builds > 0 else 0.0

    # Average duration (only completed builds)
    avg_result = await db.execute(
        select(func.avg(Build.duration)).where(
            Build.duration.isnot(None),
            Build.status.in_(["success", "error"]),
        )
    )
    avg_duration = avg_result.scalar() or 0.0

    # Weekly builds (last 7 days, day by day)
    weekly_builds = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_count_result = await db.execute(
            select(func.count()).where(
                Build.started_at >= day_start,
                Build.started_at < day_end,
            )
        )
        weekly_builds.append(day_count_result.scalar() or 0)

    # MCP stats (top projects by build count)
    mcp_stats = []
    project_stats = await db.execute(
        select(
            Build.name,
            func.count(Build.id).label("build_count"),
            func.avg(Build.duration).label("avg_duration"),
        )
        .group_by(Build.name)
        .order_by(func.count(Build.id).desc())
        .limit(10)
    )

    for row in project_stats:
        name, build_count, avg_dur = row

        # Calculate success rate for this project
        success_for_project = await db.execute(
            select(func.count()).where(
                Build.name == name,
                Build.status == "success",
            )
        )
        project_success = success_for_project.scalar() or 0
        project_success_rate = (project_success / build_count * 100) if build_count > 0 else 0.0

        mcp_stats.append(
            MCPStats(
                name=name,
                builds=build_count,
                success_rate=round(project_success_rate, 1),
                avg_time=round(avg_dur or 0, 1),
            )
        )

    return AnalyticsResponse(
        total_builds=total_builds,
        success_rate=round(success_rate, 1),
        avg_duration=round(avg_duration, 1),
        weekly_builds=weekly_builds,
        mcps=mcp_stats,
        period_start=week_ago,
        period_end=now,
    )
