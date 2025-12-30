"""Health check Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """System health check response."""

    status: str  # healthy, degraded, unhealthy
    database: str  # connected, disconnected
    n8n: str  # reachable, unreachable
    build_logs: str  # accessible, inaccessible
    timestamp: datetime
    version: str
