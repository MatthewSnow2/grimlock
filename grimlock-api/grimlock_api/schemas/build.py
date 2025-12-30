"""Build-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BuildBase(BaseModel):
    """Base build schema."""

    id: str
    name: str
    status: str
    phase: str
    started_at: datetime
    stopped_at: datetime | None = None
    duration: int | None = None


class BuildResponse(BuildBase):
    """Build response with log count."""

    log_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class BuildCreate(BaseModel):
    """Schema for creating a new build."""

    id: str
    name: str
    status: str = "running"
    phase: str = "prd_uploaded"
    prd_id: str | None = None
    project_id: str | None = None


class BuildListResponse(BaseModel):
    """Paginated list of builds."""

    builds: list[BuildResponse]
    total: int
    page: int = 1
    page_size: int = 20


class BuildCurrentResponse(BaseModel):
    """Response for current running builds."""

    running: list[BuildResponse]
    count: int


class LogEntry(BaseModel):
    """Single log entry."""

    timestamp: datetime = Field(alias="ts")
    event: str
    phase: str | None = None
    message: str = Field(alias="msg")
    level: str = "info"
    metadata: dict | None = None

    model_config = ConfigDict(populate_by_name=True)


class LogCreate(BaseModel):
    """Schema for creating a log entry."""

    event: str
    phase: str | None = None
    message: str
    level: str = "info"
    metadata: dict | None = None
    timestamp: datetime | None = None


class BuildLogsResponse(BaseModel):
    """Response with build logs."""

    build_id: str
    name: str
    status: str
    started_at: datetime
    stopped_at: datetime | None = None
    duration: int | None = None
    logs: list[LogEntry]
    total: int
