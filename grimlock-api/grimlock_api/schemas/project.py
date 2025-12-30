"""Project-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectResponse(BaseModel):
    """Project response schema."""

    id: str
    name: str
    path: str
    sdk: str | None = None
    service_name: str | None = None
    build_count: int = 0
    last_build_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """List of projects response."""

    projects: list[ProjectResponse]
    total: int
