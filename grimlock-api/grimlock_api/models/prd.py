"""PRD (Product Requirements Document) SQLAlchemy model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from grimlock_api.database import Base

if TYPE_CHECKING:
    from grimlock_api.models.build import Build
    from grimlock_api.models.project import Project


class PRD(Base):
    """PRD model representing a Product Requirements Document."""

    __tablename__ = "prds"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    filename: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    project_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("projects.id"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    uploaded_by: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Relationships
    builds: Mapped[list["Build"]] = relationship("Build", back_populates="prd")
    project: Mapped["Project | None"] = relationship("Project", back_populates="prds")
