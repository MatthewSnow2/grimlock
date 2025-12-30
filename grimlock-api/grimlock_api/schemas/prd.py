"""PRD-related Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PRDUploadRequest(BaseModel):
    """Request schema for PRD upload."""

    filename: str
    content: str
    project_name: str | None = None


class PRDUploadResponse(BaseModel):
    """Response after PRD upload."""

    id: str
    filename: str
    uploaded_at: datetime
    build_triggered: bool = False
    build_id: str | None = None


class PRDResponse(BaseModel):
    """PRD response schema."""

    id: str
    filename: str
    project_id: str | None = None
    content: str
    uploaded_at: datetime
    uploaded_by: str | None = None

    model_config = ConfigDict(from_attributes=True)
