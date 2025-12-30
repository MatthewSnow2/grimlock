"""Project SQLAlchemy model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from grimlock_api.database import Base

if TYPE_CHECKING:
    from grimlock_api.models.build import Build
    from grimlock_api.models.prd import PRD


class Project(Base):
    """Project model representing an MCP server project."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(256), nullable=False)
    sdk: Mapped[str | None] = mapped_column(String(16), nullable=True)
    service_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    last_build_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    build_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    builds: Mapped[list["Build"]] = relationship("Build", back_populates="project")
    prds: Mapped[list["PRD"]] = relationship("PRD", back_populates="project")
