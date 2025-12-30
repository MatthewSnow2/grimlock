"""Build and BuildLog SQLAlchemy models."""

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from grimlock_api.database import Base


class BuildStatus(str, Enum):
    """Build status enum."""

    running = "running"
    success = "success"
    error = "error"
    paused = "paused"
    aborted = "aborted"


class BuildPhase(str, Enum):
    """Build phase enum."""

    prd_uploaded = "prd_uploaded"
    analysis = "analysis"
    spec_gen = "specGen"
    code_gen = "codeGen"
    validation = "validation"
    complete = "complete"


class LogLevel(str, Enum):
    """Log level enum."""

    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"
    success = "success"


class Build(Base):
    """Build model representing a GRIMLOCK MCP build."""

    __tablename__ = "builds"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=BuildStatus.running.value)
    phase: Mapped[str] = mapped_column(String(32), nullable=False, default=BuildPhase.prd_uploaded.value)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prd_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("prds.id"), nullable=True)
    project_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("projects.id"), nullable=True)

    # Relationships
    logs: Mapped[list["BuildLog"]] = relationship(
        "BuildLog",
        back_populates="build",
        order_by="BuildLog.timestamp",
        cascade="all, delete-orphan",
    )
    prd: Mapped["PRD | None"] = relationship("PRD", back_populates="builds")
    project: Mapped["Project | None"] = relationship("Project", back_populates="builds")

    __table_args__ = (
        Index("ix_builds_status_started", "status", "started_at"),
        Index("ix_builds_name_started", "name", "started_at"),
    )


class BuildLog(Base):
    """BuildLog model representing a single log entry for a build."""

    __tablename__ = "build_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    build_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("builds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    event: Mapped[str] = mapped_column(String(64), nullable=False)
    phase: Mapped[str | None] = mapped_column(String(32), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(String(16), nullable=False, default=LogLevel.info.value)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    build: Mapped["Build"] = relationship("Build", back_populates="logs")

    __table_args__ = (Index("ix_build_logs_build_ts", "build_id", "timestamp"),)


# Import for type hints
from grimlock_api.models.prd import PRD  # noqa: E402
from grimlock_api.models.project import Project  # noqa: E402
