"""Analytics-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel


class MCPStats(BaseModel):
    """Statistics for a single MCP project."""

    name: str
    builds: int
    success_rate: float
    avg_time: float


class AnalyticsResponse(BaseModel):
    """Analytics response with build statistics."""

    total_builds: int
    success_rate: float
    avg_duration: float
    weekly_builds: list[int]  # 7 days, oldest to newest
    mcps: list[MCPStats]
    period_start: datetime
    period_end: datetime
