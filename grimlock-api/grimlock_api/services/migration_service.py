"""Service for migrating JSONL data to PostgreSQL."""

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from grimlock_api.config import get_settings
from grimlock_api.models import Build, BuildLog

settings = get_settings()


class MigrationService:
    """Service for migrating existing JSONL logs to PostgreSQL."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.build_logs_dir = Path(settings.build_logs_dir)

    async def migrate_all(self) -> dict:
        """Migrate all existing build logs to PostgreSQL.

        Returns:
            Migration statistics
        """
        stats = {
            "builds_migrated": 0,
            "logs_migrated": 0,
            "errors": [],
        }

        # Read index.json
        index_path = self.build_logs_dir / "index.json"
        if not index_path.exists():
            stats["errors"].append("index.json not found")
            return stats

        with open(index_path) as f:
            index = json.load(f)

        for build_entry in index.get("builds", []):
            try:
                await self._migrate_build(build_entry)
                stats["builds_migrated"] += 1

                # Migrate logs
                logs_migrated = await self._migrate_build_logs(build_entry["id"])
                stats["logs_migrated"] += logs_migrated

            except Exception as e:
                stats["errors"].append(f"Failed to migrate {build_entry['id']}: {str(e)}")

        await self.db.commit()
        return stats

    async def _migrate_build(self, build_entry: dict) -> Build:
        """Migrate a single build entry."""
        # Parse timestamps
        started_at = datetime.fromisoformat(
            build_entry["startedAt"].replace("Z", "+00:00")
        ) if build_entry.get("startedAt") else datetime.utcnow()

        stopped_at = None
        if build_entry.get("stoppedAt"):
            stopped_at = datetime.fromisoformat(
                build_entry["stoppedAt"].replace("Z", "+00:00")
            )

        build = Build(
            id=build_entry["id"],
            name=build_entry.get("name", build_entry["id"]),
            status=build_entry.get("status", "running"),
            phase=build_entry.get("phase", "prd_uploaded"),
            started_at=started_at,
            stopped_at=stopped_at,
            duration=build_entry.get("duration"),
        )
        self.db.add(build)
        return build

    async def _migrate_build_logs(self, build_id: str) -> int:
        """Migrate logs for a specific build.

        Returns:
            Number of logs migrated
        """
        logs_path = self.build_logs_dir / "builds" / f"{build_id}.jsonl"
        if not logs_path.exists():
            return 0

        count = 0
        with open(logs_path) as f:
            for line in f:
                if not line.strip():
                    continue

                try:
                    log_entry = json.loads(line)

                    # Parse timestamp
                    timestamp = datetime.fromisoformat(
                        log_entry["ts"].replace("Z", "+00:00")
                    ) if log_entry.get("ts") else datetime.utcnow()

                    log = BuildLog(
                        build_id=build_id,
                        timestamp=timestamp,
                        event=log_entry.get("event", "unknown"),
                        phase=log_entry.get("phase"),
                        message=log_entry.get("msg", ""),
                        level=log_entry.get("level", "info"),
                    )
                    self.db.add(log)
                    count += 1

                except json.JSONDecodeError:
                    continue

        return count
